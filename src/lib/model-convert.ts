// ==========================================
// Model format conversion + Draco compression
// ==========================================
// Entry point: convertModel(buffer, format) → { glb, size }
//
// Pipeline per input format:
//   glb / gltf  → Draco-optimize (often halves size)
//   obj         → obj2gltf → glb → Draco
//   ifc         → web-ifc StreamAllMeshes → @gltf-transform Document → Draco
//   fbx/dae     → throws UnsupportedFormatError (roadmap)
//
// All conversions output binary GLB (self-contained, best for CDN
// delivery). Draco compression is applied at the default quality
// settings — tuned for interior-design geometry (most wins come from
// de-duplicated vertices, not aggressive quantization).

import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export class UnsupportedFormatError extends Error {
  constructor(format: string) {
    super(`הפורמט ${format.toUpperCase()} עדיין לא נתמך להמרה אוטומטית. המירי ל-glTF או GLB ונסי שוב.`);
    this.name = "UnsupportedFormatError";
  }
}

// NodeIO must register the Draco encoder+decoder up front — otherwise
// transform(draco()) silently leaves geometry unpacked. We create the
// IO once and memoize, since module loading the WASM is expensive.
let ioPromise: Promise<NodeIO> | null = null;
async function getIO(): Promise<NodeIO> {
  if (!ioPromise) {
    ioPromise = (async () => {
      const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
      io.registerDependencies({
        "draco3d.decoder": await draco3d.createDecoderModule(),
        "draco3d.encoder": await draco3d.createEncoderModule(),
      });
      return io;
    })();
  }
  return ioPromise;
}

async function compressWithDraco(doc: Document): Promise<Document> {
  await doc.transform(
    dedup(),  // merge identical vertices across primitives
    weld(),   // merge nearby vertices (default tolerance)
    draco()   // Draco-compress all mesh primitives
  );
  return doc;
}

async function writeTempFile(buffer: Buffer, ext: string): Promise<string> {
  const tmpPath = path.join(
    os.tmpdir(),
    `zirat-3d-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`
  );
  await fs.writeFile(tmpPath, buffer);
  return tmpPath;
}

async function safeUnlink(p: string) {
  try {
    await fs.unlink(p);
  } catch {
    /* noop — Vercel /tmp cleans up on its own */
  }
}

async function convertGlb(buffer: Buffer): Promise<Buffer> {
  const io = await getIO();
  const doc = await io.readBinary(new Uint8Array(buffer));
  await compressWithDraco(doc);
  const out = await io.writeBinary(doc);
  return Buffer.from(out);
}

async function convertGltf(buffer: Buffer): Promise<Buffer> {
  // readJSON expects a parsed .gltf + its resources; we only have the
  // main JSON file in memory. If the .gltf has external .bin/.texture
  // references, this path will fail — in practice most designers upload
  // GLB (self-contained) or GLTF already-inlined (data URIs).
  const io = await getIO();
  const json = JSON.parse(new TextDecoder().decode(buffer));
  const doc = await io.readJSON({ json, resources: {} });
  await compressWithDraco(doc);
  const out = await io.writeBinary(doc);
  return Buffer.from(out);
}

async function convertObj(buffer: Buffer): Promise<Buffer> {
  // obj2gltf reads from disk, so we stage the upload in /tmp first. We
  // skip materials embedding that require external .mtl files — if the
  // user uploaded an OBJ with a sibling MTL they'll need to glTF it
  // client-side (SketchUp etc. export directly anyway).
  const { default: obj2gltf } = await import("obj2gltf");
  const objPath = await writeTempFile(buffer, ".obj");
  try {
    const glb: Buffer = await obj2gltf(objPath, { binary: true });
    // Then Draco-compress the glb
    return await convertGlb(glb);
  } finally {
    await safeUnlink(objPath);
  }
}

// ─── IFC ────────────────────────────────────────────────────────────
// web-ifc parses the IFC text/step format in WASM, then exposes each
// placed geometry as a Float32Array of interleaved pos+normal (6 floats
// per vertex) plus a Uint32Array of triangle indices, along with a 4x4
// placement matrix (column-major) and an RGBA color.
//
// We bucket primitives by color so the final GLB has one draw call per
// distinct material — dramatically fewer nodes than one-per-placement,
// which keeps the three.js viewer snappy even for large buildings.
// Vertices are transformed CPU-side (the transform is unique per
// placement, so baking it into the vertex stream is necessary before
// merging).

type ColorBucket = {
  color: [number, number, number, number];
  positions: number[];
  normals: number[];
  indices: number[];
};

function colorKey(c: { x: number; y: number; z: number; w: number }): string {
  // Quantize to 8-bit to merge near-identical colors — IFC exports often
  // emit tiny float-noise differences that would otherwise split buckets.
  return `${Math.round(c.x * 255)}-${Math.round(c.y * 255)}-${Math.round(c.z * 255)}-${Math.round(c.w * 255)}`;
}

async function convertIfc(buffer: Buffer): Promise<Buffer> {
  const { IfcAPI } = await import("web-ifc");
  const ifcApi = new IfcAPI();

  // web-ifc's default locate handler resolves WASM relative to its own
  // module path (node_modules/web-ifc/*.wasm). Vercel's nft tracer picks
  // that up via the dynamic import above. forceSingleThread: true avoids
  // the mt WASM which needs SharedArrayBuffer (not available in
  // serverless runtimes).
  await ifcApi.Init(undefined, true);

  const modelID = ifcApi.OpenModel(new Uint8Array(buffer), {
    COORDINATE_TO_ORIGIN: true,
    CIRCLE_SEGMENTS: 12,
  });

  const buckets = new Map<string, ColorBucket>();

  ifcApi.StreamAllMeshes(modelID, (mesh) => {
    const geoms = mesh.geometries;
    const count = geoms.size();
    for (let i = 0; i < count; i++) {
      const placed = geoms.get(i);
      const geometry = ifcApi.GetGeometry(modelID, placed.geometryExpressID);

      const verts = ifcApi.GetVertexArray(
        geometry.GetVertexData(),
        geometry.GetVertexDataSize()
      );
      const inds = ifcApi.GetIndexArray(
        geometry.GetIndexData(),
        geometry.GetIndexDataSize()
      );
      const m = placed.flatTransformation; // 16 floats, column-major

      const c = placed.color;
      const key = colorKey(c);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          color: [c.x, c.y, c.z, c.w],
          positions: [],
          normals: [],
          indices: [],
        };
        buckets.set(key, bucket);
      }
      const baseIdx = bucket.positions.length / 3;

      const vcount = verts.length / 6;
      for (let v = 0; v < vcount; v++) {
        const o = v * 6;
        const px = verts[o],     py = verts[o + 1], pz = verts[o + 2];
        const nx = verts[o + 3], ny = verts[o + 4], nz = verts[o + 5];
        // 4x4 column-major: columns at m[0..3], m[4..7], m[8..11], m[12..15]
        const tx = m[0] * px + m[4] * py + m[8]  * pz + m[12];
        const ty = m[1] * px + m[5] * py + m[9]  * pz + m[13];
        const tz = m[2] * px + m[6] * py + m[10] * pz + m[14];
        // Normals use the rotation block only. IFC transforms are
        // typically rigid-body for architecture, so ignoring inverse-
        // transpose is visually fine.
        const tnx = m[0] * nx + m[4] * ny + m[8]  * nz;
        const tny = m[1] * nx + m[5] * ny + m[9]  * nz;
        const tnz = m[2] * nx + m[6] * ny + m[10] * nz;
        const nlen = Math.hypot(tnx, tny, tnz) || 1;
        bucket.positions.push(tx, ty, tz);
        bucket.normals.push(tnx / nlen, tny / nlen, tnz / nlen);
      }
      for (let k = 0; k < inds.length; k++) {
        bucket.indices.push(baseIdx + inds[k]);
      }
      geometry.delete();
    }
  });

  ifcApi.CloseModel(modelID);

  if (buckets.size === 0) {
    throw new Error("לא נמצאו גיאומטריות בקובץ ה-IFC");
  }

  // ── Build glTF Document ───────────────────────────────────────────
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene("ifc");
  const mesh = doc.createMesh("ifc-mesh");
  const node = doc.createNode("ifc-root").setMesh(mesh);
  scene.addChild(node);

  // Array.from to satisfy TS target-es2015 iteration rules without having
  // to flip downlevelIteration for the whole project.
  for (const bucket of Array.from(buckets.values())) {
    if (bucket.indices.length === 0) continue;
    const pos = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array(bucket.positions));
    const nor = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array(bucket.normals));
    const idx = doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(new Uint32Array(bucket.indices));
    const mat = doc
      .createMaterial()
      .setBaseColorFactor(bucket.color)
      .setMetallicFactor(0)
      .setRoughnessFactor(0.8);
    if (bucket.color[3] < 1) {
      mat.setAlphaMode("BLEND");
    }
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", pos)
      .setAttribute("NORMAL", nor)
      .setIndices(idx)
      .setMaterial(mat);
    mesh.addPrimitive(prim);
  }

  await compressWithDraco(doc);
  const io = await getIO();
  const out = await io.writeBinary(doc);
  return Buffer.from(out);
}

/**
 * Convert any supported 3D model buffer into a Draco-compressed GLB.
 * Throws UnsupportedFormatError for formats we can't handle yet (fbx/dae).
 */
export async function convertModel(
  buffer: Buffer,
  format: string
): Promise<{ glb: Buffer; size: number }> {
  const fmt = format.toLowerCase();
  let glb: Buffer;

  switch (fmt) {
    case "glb":
      glb = await convertGlb(buffer);
      break;
    case "gltf":
      glb = await convertGltf(buffer);
      break;
    case "obj":
      glb = await convertObj(buffer);
      break;
    case "ifc":
      glb = await convertIfc(buffer);
      break;
    case "fbx":
    case "dae":
      throw new UnsupportedFormatError(fmt);
    default:
      throw new UnsupportedFormatError(fmt);
  }

  return { glb, size: glb.length };
}

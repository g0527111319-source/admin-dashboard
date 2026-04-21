// ==========================================
// Model format conversion + Draco compression
// ==========================================
// Entry point: convertModel(buffer, format) → { glb, size }
//
// Pipeline per input format:
//   glb / gltf  → Draco-optimize (often halves size)
//   obj         → obj2gltf → glb → Draco
//   ifc         → web-ifc StreamAllMeshes → @gltf-transform Document → Draco
//   fbx / dae   → assimpjs → glb2 → Draco
//
// All conversions output binary GLB (self-contained, best for CDN
// delivery). Draco compression is applied at the default quality
// settings — tuned for interior-design geometry (most wins come from
// de-duplicated vertices, not aggressive quantization).
//
// Known limitations we surface as friendlier errors:
//   - gltf (JSON) with external .bin/.png siblings will fail to convert,
//     since the uploader only passes one file. Detected via buffer URI scan.
//   - obj with external .mtl materials will succeed geometrically but
//     without materials — the user is warned at upload time.

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

export class ExternalResourcesError extends Error {
  constructor(format: string, missing: string[]) {
    const sample = missing.slice(0, 3).join(", ");
    super(
      `קובץ ה-${format.toUpperCase()} מפנה לקבצים חיצוניים (${sample}${missing.length > 3 ? "..." : ""}). ` +
        `יש לייצא כ-GLB (קובץ יחיד) או להטמיע את המשאבים בתוך ה-glTF.`
    );
    this.name = "ExternalResourcesError";
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

  // Scan for URIs that reference external files — anything not starting
  // with "data:" means the designer exported in multi-file mode and we
  // won't be able to resolve the sibling files here. Surface a clean,
  // actionable error instead of the cryptic "cannot read resource" from
  // gltf-transform.
  const externalUris: string[] = [];
  const collect = (uri?: string) => {
    if (uri && typeof uri === "string" && !uri.startsWith("data:")) {
      externalUris.push(uri);
    }
  };
  for (const buf of json.buffers ?? []) collect(buf.uri);
  for (const img of json.images ?? []) collect(img.uri);
  if (externalUris.length > 0) {
    throw new ExternalResourcesError("gltf", externalUris);
  }

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

// ─── FBX / DAE via assimpjs ─────────────────────────────────────────
// assimpjs is a WASM build of Assimp (~6MB). We use it specifically for
// the formats that @gltf-transform can't handle natively. The module
// init loads the .wasm from disk — in Vercel the file gets traced
// automatically via our next.config.mjs outputFileTracingIncludes entry.

type AssimpInstance = {
  FileList: new () => {
    AddFile: (name: string, content: Uint8Array) => void;
  };
  ConvertFileList: (
    fileList: unknown,
    format: string
  ) => {
    IsSuccess: () => boolean;
    FileCount: () => number;
    GetErrorCode: () => string;
    GetFile: (i: number) => { GetContent: () => Uint8Array };
  };
};

let assimpPromise: Promise<AssimpInstance> | null = null;
async function getAssimp(): Promise<AssimpInstance> {
  if (!assimpPromise) {
    assimpPromise = (async () => {
      // assimpjs exports a CommonJS factory. The top-level call returns
      // a Promise<AssimpInstance>. We dynamic-import so the WASM only
      // loads when actually needed (FBX/DAE uploads are rare).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const assimpjs = require("assimpjs");
      return (await assimpjs()) as AssimpInstance;
    })();
  }
  return assimpPromise;
}

async function convertWithAssimp(
  buffer: Buffer,
  inputExt: "fbx" | "dae"
): Promise<Buffer> {
  const ajs = await getAssimp();
  const fileList = new ajs.FileList();
  // The filename gets passed back in error messages — keep it simple.
  fileList.AddFile(`input.${inputExt}`, new Uint8Array(buffer));

  // "glb2" = glTF 2.0 binary. This is self-contained (meshes + materials
  // + textures in one file) which matches what the rest of the pipeline
  // expects.
  const result = ajs.ConvertFileList(fileList, "glb2");
  if (!result.IsSuccess() || result.FileCount() === 0) {
    const code = result.GetErrorCode();
    throw new Error(
      `assimp לא הצליח להמיר את קובץ ה-${inputExt.toUpperCase()}: ${code || "שגיאה לא ידועה"}`
    );
  }
  const outFile = result.GetFile(0);
  const glb = Buffer.from(outFile.GetContent());
  // Run through our Draco pipeline to shrink the result — assimp emits
  // uncompressed GLBs which can be large for complex models.
  return await convertGlb(glb);
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
  // web-ifc ships two bundles: a Node CommonJS build that loads
  // `web-ifc-node.wasm` from disk via fs.readFileSync, and a browser ESM
  // build that fetch()'s `web-ifc.wasm`. The package's `exports` map
  // `require`/`node` → node build and `import` → browser build. When we
  // used `await import("web-ifc")` here, Next.js's webpack sometimes
  // resolved the `import` condition (or the package's `"module"` field),
  // giving us the browser bundle — which then blows up in Node because
  // it tries to fetch() a WASM URL. Plain require() forces the CJS/node
  // branch unconditionally, matching what we do for assimpjs above.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { IfcAPI } = require("web-ifc") as typeof import("web-ifc");
  const ifcApi = new IfcAPI();

  // forceSingleThread: true avoids the mt WASM which needs
  // SharedArrayBuffer (not available in Vercel serverless runtimes).
  // web-ifc's default locator uses __dirname of web-ifc-api-node.js,
  // which resolves to node_modules/web-ifc/ at runtime — and our
  // next.config.mjs outputFileTracingIncludes entry copies the sibling
  // `web-ifc-node.wasm` into the lambda next to it.
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
      glb = await convertWithAssimp(buffer, fmt);
      break;
    default:
      throw new UnsupportedFormatError(fmt);
  }

  return { glb, size: glb.length };
}

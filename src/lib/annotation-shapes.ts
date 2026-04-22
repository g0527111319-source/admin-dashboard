// ==========================================
// Annotation shapes — validation + serialization
// ==========================================
// Supports: POINT, LINE, RECTANGLE, CIRCLE
//
// Geometry contract (world coordinates from three.js raycasting):
//   POINT      — posX/Y/Z + normX/Y/Z (anchor + surface normal)
//   LINE       — posX/Y/Z + pos2X/Y/Z (two endpoints); normals optional
//   RECTANGLE  — posX/Y/Z + pos2X/Y/Z (opposite corners in world space);
//                rendered as an axis-aligned outline aligned to the surface normal
//   CIRCLE     — posX/Y/Z (center) + normX/Y/Z (surface normal for orientation)
//                + radius (world units)
//
// All numeric fields must be finite numbers. The viewer is responsible for
// raycasting and producing the right vectors — the API is only gatekeeping.

import type { AnnotationShape } from "@/generated/prisma/client";

export type ShapeInput = {
  shape?: string;
  posX?: number;
  posY?: number;
  posZ?: number;
  normX?: number;
  normY?: number;
  normZ?: number;
  pos2X?: number;
  pos2Y?: number;
  pos2Z?: number;
  norm2X?: number;
  norm2Y?: number;
  norm2Z?: number;
  radius?: number;
};

export type ShapeValidated = {
  shape: AnnotationShape;
  posX: number;
  posY: number;
  posZ: number;
  normX: number;
  normY: number;
  normZ: number;
  pos2X: number | null;
  pos2Y: number | null;
  pos2Z: number | null;
  norm2X: number | null;
  norm2Y: number | null;
  norm2Z: number | null;
  radius: number | null;
};

const ALLOWED_SHAPES: AnnotationShape[] = ["POINT", "LINE", "RECTANGLE", "CIRCLE"];

function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function triple(
  x: unknown,
  y: unknown,
  z: unknown
): [number, number, number] | null {
  if (!isFiniteNum(x) || !isFiniteNum(y) || !isFiniteNum(z)) return null;
  return [x, y, z];
}

export function normalizeShape(raw: unknown): AnnotationShape {
  const s = typeof raw === "string" ? raw.toUpperCase() : "POINT";
  if ((ALLOWED_SHAPES as string[]).includes(s)) return s as AnnotationShape;
  return "POINT";
}

/**
 * Validate + normalize shape input. Returns null if the input is invalid for
 * the requested shape type; the caller should respond with 400.
 *
 * Backwards-compatible: if `shape` is missing, treat as POINT and require
 * only the six existing point+normal coords — same contract as before the
 * shape migration.
 */
export function validateShapeInput(
  body: ShapeInput
): { ok: true; data: ShapeValidated } | { ok: false; error: string } {
  const shape = normalizeShape(body.shape);

  const anchor = triple(body.posX, body.posY, body.posZ);
  if (!anchor) {
    return { ok: false, error: "חסרים ערכי מיקום תקינים (posX/Y/Z)" };
  }

  const normal = triple(body.normX, body.normY, body.normZ);
  if (!normal) {
    return { ok: false, error: "חסרים ערכי normal תקינים (normX/Y/Z)" };
  }

  let pos2: [number, number, number] | null = null;
  let norm2: [number, number, number] | null = null;
  let radius: number | null = null;

  if (shape === "LINE" || shape === "RECTANGLE") {
    pos2 = triple(body.pos2X, body.pos2Y, body.pos2Z);
    if (!pos2) {
      return {
        ok: false,
        error: `${shape === "LINE" ? "קו" : "ריבוע"} דורש נקודה שנייה (pos2X/Y/Z)`,
      };
    }
    // norm2 is optional — defaults to the first normal if not supplied
    const maybeN2 = triple(body.norm2X, body.norm2Y, body.norm2Z);
    norm2 = maybeN2;
  }

  if (shape === "CIRCLE") {
    if (!isFiniteNum(body.radius) || body.radius <= 0) {
      return { ok: false, error: "עיגול דורש רדיוס חיובי (radius)" };
    }
    radius = body.radius;
  }

  return {
    ok: true,
    data: {
      shape,
      posX: anchor[0],
      posY: anchor[1],
      posZ: anchor[2],
      normX: normal[0],
      normY: normal[1],
      normZ: normal[2],
      pos2X: pos2 ? pos2[0] : null,
      pos2Y: pos2 ? pos2[1] : null,
      pos2Z: pos2 ? pos2[2] : null,
      norm2X: norm2 ? norm2[0] : null,
      norm2Y: norm2 ? norm2[1] : null,
      norm2Z: norm2 ? norm2[2] : null,
      radius,
    },
  };
}

/**
 * Compute a focus point + suggested camera distance for a given shape.
 * Used by the viewer to "fly to" an annotation.
 */
export function focusFromShape(input: {
  shape: AnnotationShape;
  posX: number;
  posY: number;
  posZ: number;
  pos2X: number | null;
  pos2Y: number | null;
  pos2Z: number | null;
  radius: number | null;
}): { target: [number, number, number]; size: number } {
  if (input.shape === "LINE" || input.shape === "RECTANGLE") {
    if (input.pos2X != null && input.pos2Y != null && input.pos2Z != null) {
      const cx = (input.posX + input.pos2X) / 2;
      const cy = (input.posY + input.pos2Y) / 2;
      const cz = (input.posZ + input.pos2Z) / 2;
      const dx = input.posX - input.pos2X;
      const dy = input.posY - input.pos2Y;
      const dz = input.posZ - input.pos2Z;
      const size = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return { target: [cx, cy, cz], size };
    }
  }
  if (input.shape === "CIRCLE" && input.radius) {
    return {
      target: [input.posX, input.posY, input.posZ],
      size: input.radius * 2,
    };
  }
  return { target: [input.posX, input.posY, input.posZ], size: 0.5 };
}

"use client";

// ==========================================
// ThreeDViewer — three.js canvas + shape annotations
// ==========================================
// Loads a glTF/GLB model and renders it with OrbitControls + soft lighting.
// Supports four annotation shapes placed by raycasting onto the loaded mesh:
//
//   POINT       — one click, anchor + surface normal
//   LINE        — two clicks, p1 → p2
//   RECTANGLE   — two clicks as opposite corners, drawn axis-aligned in the
//                 surface tangent plane derived from the first hit's normal
//   CIRCLE      — click center, click edge; radius = |edge − center|,
//                 oriented to the surface normal
//
// During placement the viewer renders a live preview that follows the cursor
// between clicks so the user sees exactly what they're about to commit. All
// persistent annotations from `annotations` are drawn in-world on a separate
// group with gentle polygon-offset + a semi-transparent occluded pass so
// shapes stay legible behind geometry without z-fighting.
//
// ref handle exposes projectToScreen (for the HTML pin overlay of POINT
// annotations), isPointOccluded (for pin fade-behind-geometry), a one-shot
// captureThumbnail for first-visit JPEG upload, and focusOnAnnotation which
// smoothly flies the camera + orbit pivot to the annotation's focus point
// using focusFromShape from the server-side shape helpers.
//
// IMPORTANT: three.js is ~600KB. The parent MUST render via
// `next/dynamic({ ssr: false })` — this file uses await import() for every
// three.js chunk so nothing leaks into the main bundle.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { focusFromShape } from "@/lib/annotation-shapes";

// ─── Public types ────────────────────────────────────────────────────

export type ShapeName = "POINT" | "LINE" | "RECTANGLE" | "CIRCLE";
export type Vec3 = { x: number; y: number; z: number };
export type ScreenPoint = { x: number; y: number; visible: boolean };

export type ShapePlaceResult = {
  shape: ShapeName;
  pos: Vec3;
  normal: Vec3;
  pos2?: Vec3;
  norm2?: Vec3;
  radius?: number;
};

export type AnnotationPrimitive = {
  id: string;
  shape: ShapeName;
  posX: number;
  posY: number;
  posZ: number;
  normX: number;
  normY: number;
  normZ: number;
  pos2X: number | null;
  pos2Y: number | null;
  pos2Z: number | null;
  radius: number | null;
};

export type ThreeDViewerHandle = {
  projectToScreen: (pos: Vec3) => ScreenPoint;
  isPointOccluded: (pos: Vec3) => boolean;
  captureThumbnail: (maxWidth?: number, quality?: number) => Promise<Blob | null>;
  focusOnAnnotation: (a: AnnotationPrimitive) => void;
};

type Props = {
  gltfUrl: string;
  className?: string;
  shape?: ShapeName;
  placementMode?: boolean;
  onShapePlace?: (r: ShapePlaceResult) => void;
  onPartialPlace?: (stage: "first" | "cleared") => void;
  annotations?: AnnotationPrimitive[];
  highlightedId?: string | null;
  onLoadProgress?: (pct: number) => void;
  onLoadComplete?: () => void;
  onLoadError?: (msg: string) => void;
  onFrame?: () => void;
};

// ─── Constants ───────────────────────────────────────────────────────

const DRACO_CDN = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

// Ivory Blinds palette — duplicated here so the shapes don't depend on
// CSS variables that aren't available inside the WebGL layer.
const GOLD = 0xc9a84c;
const GOLD_HIGHLIGHT = 0xffd76b;
const GOLD_DIM = 0x8b6914;

// How far to offset shape geometry along the surface normal so the gold
// outline sits just above the mesh without z-fighting on dense surfaces.
const SURFACE_OFFSET = 0.004;

// Circle tessellation — 64 is a common sweet spot for crisp curves at
// reasonable pixel counts without wasting geometry on huge circles.
const CIRCLE_SEGMENTS = 64;

// ─── Component ───────────────────────────────────────────────────────

const ThreeDViewer = forwardRef<ThreeDViewerHandle, Props>(function ThreeDViewer(
  {
    gltfUrl,
    className,
    shape = "POINT",
    placementMode = false,
    onShapePlace,
    onPartialPlace,
    annotations,
    highlightedId = null,
    onLoadProgress,
    onLoadComplete,
    onLoadError,
    onFrame,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const modelRootRef = useRef<any>(null);
  const annotationsGroupRef = useRef<any>(null);
  const previewGroupRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const threeRef = useRef<any>(null);
  const pointerDownRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // First hit during a two-click placement (null = waiting for first click).
  const firstHitRef = useRef<{ pos: any; normal: any } | null>(null);
  // Live tweened camera flight target — consumed by the render tick.
  const flyToRef = useRef<{
    fromPos: any;
    toPos: any;
    fromTarget: any;
    toTarget: any;
    start: number;
    duration: number;
  } | null>(null);

  // Props mirrored into refs so the mount-time effect doesn't rerun on every
  // placement-mode / shape / highlight change.
  const shapeRef = useRef<ShapeName>(shape);
  const placementModeRef = useRef(placementMode);
  const onShapePlaceRef = useRef(onShapePlace);
  const onPartialPlaceRef = useRef(onPartialPlace);
  const highlightedIdRef = useRef<string | null>(highlightedId);

  const [ready, setReady] = useState(false);

  // Keep refs in sync without re-mounting three.js.
  useEffect(() => {
    shapeRef.current = shape;
    // Changing shape aborts any in-progress two-click flow so the preview
    // cannot describe a different shape than the toolbar says it does.
    if (firstHitRef.current) {
      firstHitRef.current = null;
      clearPreview();
      onPartialPlaceRef.current?.("cleared");
    }
  }, [shape]);

  useEffect(() => {
    placementModeRef.current = placementMode;
    if (containerRef.current) {
      containerRef.current.style.cursor = placementMode ? "crosshair" : "grab";
    }
    // Leaving placement mode cancels a half-placed shape.
    if (!placementMode && firstHitRef.current) {
      firstHitRef.current = null;
      clearPreview();
      onPartialPlaceRef.current?.("cleared");
    }
  }, [placementMode]);

  useEffect(() => {
    onShapePlaceRef.current = onShapePlace;
  }, [onShapePlace]);

  useEffect(() => {
    onPartialPlaceRef.current = onPartialPlace;
  }, [onPartialPlace]);

  useEffect(() => {
    highlightedIdRef.current = highlightedId;
    // Repaint highlight state without rebuilding geometry.
    refreshHighlight();
  }, [highlightedId]);

  // A stable key that changes only when the geometric fields of an annotation
  // list actually change. Parents rebuild this array on every render (SWR,
  // frameTick), so depending on the array identity directly would thrash the
  // group rebuild on every frame — which eats CPU and causes flicker.
  const annotationsKey = useMemo(() => {
    if (!annotations || annotations.length === 0) return "";
    return annotations
      .map(
        (a) =>
          `${a.id}|${a.shape}|${a.posX}|${a.posY}|${a.posZ}|${a.normX}|${a.normY}|${a.normZ}|${a.pos2X ?? ""}|${a.pos2Y ?? ""}|${a.pos2Z ?? ""}|${a.radius ?? ""}`
      )
      .join("::");
  }, [annotations]);

  // Rebuild the persistent annotation shapes whenever geometry changes or the
  // scene finishes loading for the first time.
  useEffect(() => {
    if (!ready) return;
    rebuildAnnotations(annotations ?? []);
    refreshHighlight();
    // annotationsKey captures the relevant structural changes; adding the raw
    // `annotations` array would trigger every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotationsKey, ready]);

  // ── Imperative handle ─────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    projectToScreen: (pos) => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const THREE = threeRef.current;
      if (!camera || !renderer || !THREE) return { x: 0, y: 0, visible: false };
      const v = new THREE.Vector3(pos.x, pos.y, pos.z);
      v.project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      const sx = (v.x * 0.5 + 0.5) * rect.width;
      const sy = (-v.y * 0.5 + 0.5) * rect.height;
      const inFrame =
        sx >= 0 && sy >= 0 && sx <= rect.width && sy <= rect.height && v.z < 1;
      return { x: sx, y: sy, visible: inFrame };
    },

    isPointOccluded: (pos) => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const raycaster = raycasterRef.current;
      const modelRoot = modelRootRef.current;
      const THREE = threeRef.current;
      if (!scene || !camera || !raycaster || !modelRoot || !THREE) return false;
      const target = new THREE.Vector3(pos.x, pos.y, pos.z);
      const dir = new THREE.Vector3().subVectors(target, camera.position);
      const dist = dir.length();
      dir.normalize();
      raycaster.set(camera.position, dir);
      raycaster.far = dist - 0.01;
      const hits = raycaster.intersectObject(modelRoot, true);
      return hits.length > 0;
    },

    captureThumbnail: async (maxWidth = 512, quality = 0.75) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return null;
      // Synchronous render into the current back buffer so toBlob has
      // something to sample — some drivers clear after present.
      renderer.render(scene, camera);
      const srcCanvas: HTMLCanvasElement = renderer.domElement;
      const srcW = srcCanvas.width;
      const srcH = srcCanvas.height;
      const scale = Math.min(1, maxWidth / Math.max(srcW, srcH));
      const dstW = Math.max(1, Math.round(srcW * scale));
      const dstH = Math.max(1, Math.round(srcH * scale));
      const off = document.createElement("canvas");
      off.width = dstW;
      off.height = dstH;
      const ctx = off.getContext("2d");
      if (!ctx) return null;
      // JPEG needs an opaque background or the composite shows black.
      ctx.fillStyle = "#FAFAF8";
      ctx.fillRect(0, 0, dstW, dstH);
      ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);
      return await new Promise<Blob | null>((resolve) =>
        off.toBlob((b) => resolve(b), "image/jpeg", quality)
      );
    },

    focusOnAnnotation: (a) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const THREE = threeRef.current;
      if (!camera || !controls || !THREE) return;
      const focus = focusFromShape({
        shape: a.shape,
        posX: a.posX,
        posY: a.posY,
        posZ: a.posZ,
        pos2X: a.pos2X,
        pos2Y: a.pos2Y,
        pos2Z: a.pos2Z,
        radius: a.radius,
      });
      const target = new THREE.Vector3(...focus.target);
      // Distance scaled to the shape's footprint so a tiny pin doesn't make
      // the camera collide with the surface and a huge rectangle doesn't
      // push the camera to the far plane.
      const halfFov = (camera.fov * Math.PI) / 360;
      const fitDist = Math.max(focus.size, 0.4) / 2 / Math.tan(halfFov) / 0.55;
      // Preserve the user's current viewing direction so the fly-to feels
      // like a pan + dolly, not an abrupt orbit snap.
      const dirFromCurrent = new THREE.Vector3()
        .subVectors(camera.position, controls.target)
        .normalize();
      const toPos = target.clone().add(dirFromCurrent.multiplyScalar(fitDist));
      flyToRef.current = {
        fromPos: camera.position.clone(),
        toPos,
        fromTarget: controls.target.clone(),
        toTarget: target,
        start: performance.now(),
        duration: 650,
      };
    },
  }));

  // ── Shape mesh builders (created once THREE is loaded) ─────────────

  // Build an orthonormal basis (right, up) on the tangent plane of a given
  // surface normal. Used for RECTANGLE corner derivation — we need a stable
  // "right" axis even when the normal is aligned with world up/down.
  function tangentBasis(THREE: any, normal: any): { right: any; up: any } {
    const n = normal.clone().normalize();
    // Pick a reference that is NOT parallel to n. World Y works for most
    // surfaces; fall back to X when we're looking at a near-horizontal face.
    const ref =
      Math.abs(n.y) < 0.95
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(ref, n).normalize();
    const up = new THREE.Vector3().crossVectors(n, right).normalize();
    return { right, up };
  }

  function buildLine(
    THREE: any,
    p1: any,
    p2: any,
    material: any
  ): any {
    const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const line = new THREE.Line(geom, material);
    // Draw on top of mesh to avoid z-fighting on coplanar surfaces.
    line.renderOrder = 3;
    return line;
  }

  // Small gold sphere marker used at shape vertices / centers.
  function buildMarker(THREE: any, pos: any, size: number, color: number): any {
    const geom = new THREE.SphereGeometry(size, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color,
      depthTest: true,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    mesh.renderOrder = 4;
    return mesh;
  }

  // Rectangle outline in the tangent plane of the first surface normal.
  // p1 and p2 are the two diagonal corners as given by the user.
  function buildRectangle(
    THREE: any,
    p1: any,
    p2: any,
    normal: any,
    material: any
  ): any {
    const { right, up } = tangentBasis(THREE, normal);
    // Project the diagonal vector onto the tangent plane to derive rect
    // extents. Any normal component is discarded so corners sit flush on
    // the surface.
    const diag = new THREE.Vector3().subVectors(p2, p1);
    const extentR = diag.dot(right);
    const extentU = diag.dot(up);
    // Four corners: p1, p1+extentR*right, p1+extentR*right+extentU*up,
    // p1+extentU*up → LineLoop to close the outline.
    const c0 = p1.clone();
    const c1 = p1.clone().add(right.clone().multiplyScalar(extentR));
    const c2 = c1.clone().add(up.clone().multiplyScalar(extentU));
    const c3 = p1.clone().add(up.clone().multiplyScalar(extentU));
    const geom = new THREE.BufferGeometry().setFromPoints([c0, c1, c2, c3]);
    const loop = new THREE.LineLoop(geom, material);
    loop.renderOrder = 3;
    return loop;
  }

  // Circle outline sampled in the tangent plane at `center` with world-space
  // `radius`. 64 segments is enough for smooth curves up to a few hundred
  // pixels of on-screen diameter.
  function buildCircle(
    THREE: any,
    center: any,
    normal: any,
    radius: number,
    material: any
  ): any {
    const { right, up } = tangentBasis(THREE, normal);
    const pts: any[] = [];
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const t = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      const p = center
        .clone()
        .add(right.clone().multiplyScalar(Math.cos(t) * radius))
        .add(up.clone().multiplyScalar(Math.sin(t) * radius));
      pts.push(p);
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const loop = new THREE.Line(geom, material);
    loop.renderOrder = 3;
    return loop;
  }

  // Two passes for one shape outline: a solid, depth-tested "visible" pass
  // and a translucent "occluded" pass that draws on top with no depth test
  // so shapes hidden behind walls remain legible at reduced opacity. This
  // mirrors how CAD/BIM viewers render annotations.
  function makeOutlineMaterials(
    THREE: any,
    color: number,
    highlighted: boolean
  ): { visible: any; occluded: any } {
    const opacity = highlighted ? 1.0 : 0.95;
    const visible = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const occluded = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: highlighted ? 0.45 : 0.25,
      depthTest: false,
      depthWrite: false,
    });
    return { visible, occluded };
  }

  // ── Preview and persistent-group management ───────────────────────

  // Dispose and empty a three.js group in place.
  function disposeGroup(group: any) {
    if (!group) return;
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: any) => m.dispose?.());
        } else {
          obj.material.dispose?.();
        }
      }
    }
  }

  function clearPreview() {
    disposeGroup(previewGroupRef.current);
  }

  // Attach a "visible + occluded" pair of outlines to the given parent group.
  function addOutlinePair(
    THREE: any,
    parent: any,
    build: (material: any) => any,
    color: number,
    highlighted: boolean
  ) {
    const { visible, occluded } = makeOutlineMaterials(THREE, color, highlighted);
    parent.add(build(visible));
    parent.add(build(occluded));
  }

  // Build the in-scene representation of a single annotation. Returns a
  // group so we can tag it with `userData.id` and toggle highlight state
  // without scanning the whole scene.
  function buildAnnotationObject(
    THREE: any,
    a: AnnotationPrimitive,
    highlighted: boolean
  ): any {
    const group = new THREE.Group();
    group.userData.id = a.id;
    group.userData.shape = a.shape;
    const color = highlighted ? GOLD_HIGHLIGHT : GOLD;
    const p1 = new THREE.Vector3(a.posX, a.posY, a.posZ);
    const n1 = new THREE.Vector3(a.normX, a.normY, a.normZ);
    // Lift geometry off the surface so it doesn't z-fight with the mesh.
    const lift = n1.clone().multiplyScalar(SURFACE_OFFSET);
    const p1Lifted = p1.clone().add(lift);

    if (a.shape === "POINT") {
      // POINT is rendered via HTML overlay — in the scene we only drop a
      // tiny anchor dot so occlusion + fly-to still have something to test.
      const dot = buildMarker(THREE, p1Lifted, 0.015, color);
      group.add(dot);
    } else if (a.shape === "LINE" && a.pos2X != null && a.pos2Y != null && a.pos2Z != null) {
      const p2 = new THREE.Vector3(a.pos2X, a.pos2Y, a.pos2Z).add(lift);
      addOutlinePair(
        THREE,
        group,
        (mat) => buildLine(THREE, p1Lifted, p2, mat),
        color,
        highlighted
      );
      group.add(buildMarker(THREE, p1Lifted, 0.02, color));
      group.add(buildMarker(THREE, p2, 0.02, color));
    } else if (
      a.shape === "RECTANGLE" &&
      a.pos2X != null &&
      a.pos2Y != null &&
      a.pos2Z != null
    ) {
      const p2 = new THREE.Vector3(a.pos2X, a.pos2Y, a.pos2Z).add(lift);
      addOutlinePair(
        THREE,
        group,
        (mat) => buildRectangle(THREE, p1Lifted, p2, n1, mat),
        color,
        highlighted
      );
    } else if (a.shape === "CIRCLE" && a.radius && a.radius > 0) {
      addOutlinePair(
        THREE,
        group,
        (mat) => buildCircle(THREE, p1Lifted, n1, a.radius!, mat),
        color,
        highlighted
      );
      group.add(buildMarker(THREE, p1Lifted, 0.015, color));
    }
    return group;
  }

  // Build a preview object for the current placement stage. `second` is the
  // live cursor position on the surface (from pointermove raycasting).
  function buildPreviewObject(
    THREE: any,
    shapeName: ShapeName,
    first: { pos: any; normal: any },
    second: { pos: any; normal: any } | null
  ): any | null {
    const group = new THREE.Group();
    const lift = first.normal.clone().multiplyScalar(SURFACE_OFFSET);
    const p1 = first.pos.clone().add(lift);
    // Preview materials: fully visible (depthTest) dashed-looking line +
    // semi-translucent occluded pass, same as committed shapes but slightly
    // dimmer so the user can distinguish "in-flight" from "placed".
    const matVisible = new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const matOccluded = new THREE.LineBasicMaterial({
      color: GOLD_DIM,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      depthWrite: false,
    });

    if (shapeName === "LINE" && second) {
      const p2 = second.pos.clone().add(lift);
      group.add(buildLine(THREE, p1, p2, matVisible));
      group.add(buildLine(THREE, p1, p2, matOccluded));
    } else if (shapeName === "RECTANGLE" && second) {
      const p2 = second.pos.clone().add(lift);
      group.add(buildRectangle(THREE, p1, p2, first.normal, matVisible));
      group.add(buildRectangle(THREE, p1, p2, first.normal, matOccluded));
    } else if (shapeName === "CIRCLE" && second) {
      const radius = p1.distanceTo(second.pos.clone().add(lift));
      if (radius > 0.001) {
        group.add(buildCircle(THREE, p1, first.normal, radius, matVisible));
        group.add(buildCircle(THREE, p1, first.normal, radius, matOccluded));
      }
    }
    // Anchor dot at the first click — always visible so the user remembers
    // the locked-in point.
    group.add(buildMarker(THREE, p1, 0.02, GOLD));
    return group;
  }

  function rebuildAnnotations(list: AnnotationPrimitive[]) {
    const group = annotationsGroupRef.current;
    const THREE = threeRef.current;
    if (!group || !THREE) return;
    disposeGroup(group);
    const activeId = highlightedIdRef.current;
    for (const a of list) {
      const obj = buildAnnotationObject(THREE, a, a.id === activeId);
      group.add(obj);
    }
  }

  // Toggle highlight on the existing annotation objects without rebuilding
  // their geometry — changing line material color + opacity is much cheaper
  // than reallocating BufferGeometry on every selection change.
  function refreshHighlight() {
    const group = annotationsGroupRef.current;
    if (!group) return;
    const activeId = highlightedIdRef.current;
    for (const child of group.children) {
      const isActive = child.userData?.id === activeId;
      const color = isActive ? GOLD_HIGHLIGHT : GOLD;
      for (const sub of child.children) {
        const mat = sub.material;
        if (!mat) continue;
        mat.color?.setHex(color);
        // Two-pass outlines store their occluded pass with depthTest=false.
        // Nudge opacities so the selected item pops through walls visibly.
        if (mat.depthTest === false) {
          mat.opacity = isActive ? 0.5 : 0.25;
        } else {
          mat.opacity = isActive ? 1 : 0.95;
        }
        mat.needsUpdate = true;
      }
    }
  }

  // ── Main init effect (runs once per gltfUrl) ───────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const cleanupFns: Array<() => void> = [];

    // pointer* listeners below close over `camera`/`renderer`/etc. We cache
    // a local copy so cleanup doesn't need to reach into stale refs.
    async function init(ctr: HTMLDivElement) {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (cancelled) return;
      threeRef.current = THREE;

      const width = ctr.clientWidth;
      const height = ctr.clientHeight;

      // ── Scene ─────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xfafaf8);
      sceneRef.current = scene;

      // Annotations and preview live in their own groups so we can dispose
      // and rebuild them independently of the loaded model.
      const annotationsGroup = new THREE.Group();
      annotationsGroup.name = "annotations";
      scene.add(annotationsGroup);
      annotationsGroupRef.current = annotationsGroup;

      const previewGroup = new THREE.Group();
      previewGroup.name = "preview";
      scene.add(previewGroup);
      previewGroupRef.current = previewGroup;

      // No ground grid — earlier versions drew a 50x50 GridHelper so empty
      // scenes had orientation, but for models of varying real-world sizes
      // (a 2m cube vs a 50m building) the grid was either enormous under a
      // tiny model or barely visible under a large one, and it never
      // communicated useful depth. The auto-fit camera below gives
      // orientation directly from the model's bounding box.

      // ── Camera ────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
      camera.position.set(6, 5, 6);
      cameraRef.current = camera;

      // ── Lights ────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
      keyLight.position.set(10, 15, 10);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xfff8e0, 0.3);
      fillLight.position.set(-8, 6, -4);
      scene.add(fillLight);

      // ── Renderer ──────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      ctr.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // ── Controls ──────────────────────────────────────────────────
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.5;
      controls.maxDistance = 100;
      controlsRef.current = controls;

      // ── Loader ────────────────────────────────────────────────────
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(DRACO_CDN);
      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      gltfLoader.load(
        gltfUrl,
        (gltf) => {
          if (cancelled) return;
          const modelRoot = gltf.scene;
          modelRootRef.current = modelRoot;

          // Center + scale so the model always fits the initial view.
          const box = new THREE.Box3().setFromObject(modelRoot);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          modelRoot.position.sub(center);
          const maxAxis = Math.max(size.x, size.y, size.z);
          if (maxAxis > 0) {
            const scale = 8 / maxAxis;
            modelRoot.scale.setScalar(scale);
          }
          scene.add(modelRoot);

          // Fit the camera to the model's POST-scale bounding box. The
          // centering step above composes transforms as T·R·S so the scaled
          // vertices end up at world_pos = -center + scale·v, leaving the
          // model's true world-space center at center·(scale−1), not at
          // (0,0,0). If we aimed at (0,0,0) the model sits off to one side
          // and OrbitControls orbits empty space — users felt it as
          // "off-center and uncomfortable to navigate." Fix: measure the
          // bounding box AFTER scaling and aim the camera + orbit pivot at
          // that actual center. Framing math: at fov=50° the half-height at
          // distance D is D·tan(25°), solve for D so the longest axis fills
          // ~65% of the viewport.
          const fitBox = new THREE.Box3().setFromObject(modelRoot);
          const fitSize = fitBox.getSize(new THREE.Vector3());
          const fitCenter = fitBox.getCenter(new THREE.Vector3());
          const fitMax = Math.max(fitSize.x, fitSize.y, fitSize.z) || 8;
          const halfFov = (camera.fov * Math.PI) / 360;
          const distance = fitMax / 2 / Math.tan(halfFov) / 0.65;
          const dir = new THREE.Vector3(1, 0.7, 1).normalize();
          camera.position.copy(fitCenter).add(dir.multiplyScalar(distance));
          camera.lookAt(fitCenter);
          controls.target.copy(fitCenter);
          controls.minDistance = distance * 0.05;
          controls.maxDistance = distance * 20;
          controls.update();

          onLoadComplete?.();
          setReady(true);
        },
        (event) => {
          if (event.total > 0) {
            onLoadProgress?.((event.loaded / event.total) * 100);
          }
        },
        (error) => {
          console.error("[ThreeDViewer] load error:", error);
          onLoadError?.(error instanceof Error ? error.message : "שגיאה בטעינת מודל");
        }
      );

      // ── Raycaster ─────────────────────────────────────────────────
      const raycaster = new THREE.Raycaster();
      raycasterRef.current = raycaster;
      const ndc = new THREE.Vector2();

      // Translate an event to NDC coordinates for the current canvas size.
      function eventToNdc(e: PointerEvent) {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        return ndc;
      }

      // Cast against the loaded model only — not against annotation outlines
      // or preview objects, which would otherwise "eat" the ray.
      function rayHitOnModel(e: PointerEvent) {
        const root = modelRootRef.current;
        if (!root) return null;
        raycaster.setFromCamera(eventToNdc(e), camera);
        const hits = raycaster.intersectObject(root, true);
        if (hits.length === 0) return null;
        const hit = hits[0];
        const pos = hit.point.clone();
        const n = hit.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
        if (hit.object.matrixWorld) {
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(
            hit.object.matrixWorld
          );
          n.applyMatrix3(normalMatrix).normalize();
        }
        return { pos, normal: n };
      }

      function onPointerDown(e: PointerEvent) {
        pointerDownRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      }

      function onPointerUp(e: PointerEvent) {
        const down = pointerDownRef.current;
        pointerDownRef.current = null;
        if (!down) return;
        // Click vs orbit-drag: both displacement and duration must be small.
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        if (dx * dx + dy * dy > 25) return;
        if (Date.now() - down.t > 500) return;
        if (!placementModeRef.current) return;

        const hit = rayHitOnModel(e);
        if (!hit) return;

        const currentShape = shapeRef.current;
        // POINT shortcut — one click commits.
        if (currentShape === "POINT") {
          onShapePlaceRef.current?.({
            shape: "POINT",
            pos: { x: hit.pos.x, y: hit.pos.y, z: hit.pos.z },
            normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
          });
          return;
        }

        // Two-click shapes: first click stores, second click commits.
        if (!firstHitRef.current) {
          firstHitRef.current = { pos: hit.pos, normal: hit.normal };
          onPartialPlaceRef.current?.("first");
          // Show an immediate preview anchored on the first click so the
          // user has a visual confirmation before they move the mouse.
          disposeGroup(previewGroupRef.current);
          const previewObj = buildPreviewObject(
            THREE,
            currentShape,
            firstHitRef.current,
            null
          );
          if (previewObj) previewGroupRef.current.add(previewObj);
          return;
        }

        // Second click — commit and clear partial state.
        const first = firstHitRef.current;
        firstHitRef.current = null;
        disposeGroup(previewGroupRef.current);
        const result: ShapePlaceResult = {
          shape: currentShape,
          pos: { x: first.pos.x, y: first.pos.y, z: first.pos.z },
          normal: {
            x: first.normal.x,
            y: first.normal.y,
            z: first.normal.z,
          },
        };
        if (currentShape === "LINE" || currentShape === "RECTANGLE") {
          result.pos2 = { x: hit.pos.x, y: hit.pos.y, z: hit.pos.z };
          result.norm2 = {
            x: hit.normal.x,
            y: hit.normal.y,
            z: hit.normal.z,
          };
        } else if (currentShape === "CIRCLE") {
          // Lift both points before measuring so the radius matches what
          // the user sees on screen (the outline is rendered on the lifted
          // geometry).
          const lift = first.normal
            .clone()
            .multiplyScalar(SURFACE_OFFSET);
          const c = first.pos.clone().add(lift);
          const e2 = hit.pos.clone().add(lift);
          result.radius = Math.max(0.001, c.distanceTo(e2));
        }
        onShapePlaceRef.current?.(result);
      }

      // Throttle preview raycasts to ~30Hz — pointermove can fire 100+ Hz
      // and re-building a 64-segment circle every event wastes cycles.
      let lastPreviewRender = 0;
      function onPointerMove(e: PointerEvent) {
        if (!placementModeRef.current) return;
        if (!firstHitRef.current) return; // preview only after first click
        const currentShape = shapeRef.current;
        if (currentShape === "POINT") return;
        const now = performance.now();
        if (now - lastPreviewRender < 33) return;
        lastPreviewRender = now;

        const hit = rayHitOnModel(e);
        if (!hit) return;
        disposeGroup(previewGroupRef.current);
        const obj = buildPreviewObject(
          THREE,
          currentShape,
          firstHitRef.current,
          hit
        );
        if (obj) previewGroupRef.current.add(obj);
      }

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      cleanupFns.push(() => {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
      });

      // ── Resize ────────────────────────────────────────────────────
      const onResize = () => {
        const w = ctr.clientWidth;
        const h = ctr.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);
      cleanupFns.push(() => window.removeEventListener("resize", onResize));

      // ── Render loop ───────────────────────────────────────────────
      // easeInOutCubic — the standard "smooth start, smooth stop" feel,
      // used here for the camera fly-to tween.
      const ease = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      let running = true;
      function tick() {
        if (!running) return;
        // Apply in-flight fly-to lerp before OrbitControls.update so the
        // controls respect the interpolated target this frame.
        const flight = flyToRef.current;
        if (flight) {
          const raw = (performance.now() - flight.start) / flight.duration;
          const t = Math.min(1, Math.max(0, raw));
          const k = ease(t);
          camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
          controls.target.lerpVectors(
            flight.fromTarget,
            flight.toTarget,
            k
          );
          if (t >= 1) flyToRef.current = null;
        }
        controls.update();
        renderer.render(scene, camera);
        onFrame?.();
        requestAnimationFrame(tick);
      }
      tick();
      cleanupFns.push(() => {
        running = false;
      });
    }

    init(container).catch((err) => {
      console.error("[ThreeDViewer] init failed:", err);
      onLoadError?.("שגיאה באתחול צופה התלת-מימד");
    });

    const ctrForCleanup = container;
    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch {
          /* noop */
        }
      });
      // Dispose shape groups before the renderer to avoid leaking buffers.
      disposeGroup(annotationsGroupRef.current);
      disposeGroup(previewGroupRef.current);
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === ctrForCleanup) {
          ctrForCleanup.removeChild(renderer.domElement);
        }
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      modelRootRef.current = null;
      raycasterRef.current = null;
      annotationsGroupRef.current = null;
      previewGroupRef.current = null;
      threeRef.current = null;
      firstHitRef.current = null;
      flyToRef.current = null;
      setReady(false);
    };
    // Reloading the full pipeline on prop changes other than gltfUrl would
    // re-download the model and lose camera state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltfUrl]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#FAFAF8",
        cursor: placementMode ? "crosshair" : "grab",
        touchAction: "none",
      }}
      aria-label={ready ? "צופה תלת מימד" : "טוען מודל..."}
    />
  );
});

export default ThreeDViewer;

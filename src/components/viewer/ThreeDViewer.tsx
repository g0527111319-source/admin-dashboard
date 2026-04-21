"use client";

// ==========================================
// ThreeDViewer — the three.js canvas wrapper
// ==========================================
// Loads a glTF/GLB model and renders it with OrbitControls + lighting.
// When `placementMode` is true, a pointer-up on the mesh raycasts onto the
// surface and calls `onPinPlace(position, normal)`.
//
// The viewer also exposes a ref handle so the parent (ShareModelPage) can
// ask for the current screen projection of a world-space point — used by
// PinOverlay to position HTML pins over the canvas.
//
// IMPORTANT: three.js is ~600KB. We import it lazily inside the effect so
// it never lands in the main bundle. The parent should render this
// component via `next/dynamic({ ssr: false })`.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type Vec3 = { x: number; y: number; z: number };
export type ScreenPoint = { x: number; y: number; visible: boolean };

export type ThreeDViewerHandle = {
  projectToScreen: (pos: Vec3) => ScreenPoint;
  isPointOccluded: (pos: Vec3) => boolean;
  // Capture the canvas into a JPEG Blob at the requested output size.
  // Returns null if the renderer isn't ready. Used for one-shot thumbnail
  // generation the first time a client opens a model.
  captureThumbnail: (maxWidth?: number, quality?: number) => Promise<Blob | null>;
};

type Props = {
  gltfUrl: string;
  placementMode?: boolean;
  onPinPlace?: (pos: Vec3, normal: Vec3) => void;
  onLoadProgress?: (pct: number) => void;
  onLoadComplete?: () => void;
  onLoadError?: (msg: string) => void;
  onFrame?: () => void; // called every render tick — used to reposition overlay pins
  className?: string;
};

const DRACO_CDN = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

const ThreeDViewer = forwardRef<ThreeDViewerHandle, Props>(function ThreeDViewer(
  {
    gltfUrl,
    placementMode = false,
    onPinPlace,
    onLoadProgress,
    onLoadComplete,
    onLoadError,
    onFrame,
    className,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const modelRootRef = useRef<any>(null);
  const raycasterRef = useRef<any>(null);
  const pointerDownRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const placementModeRef = useRef(placementMode);
  const [ready, setReady] = useState(false);

  // Keep the ref in sync without restarting the whole effect when the
  // mode toggles — three.js setup is expensive.
  useEffect(() => {
    placementModeRef.current = placementMode;
    if (controlsRef.current) {
      // In placement mode we still allow orbit but the cursor becomes a crosshair
      containerRef.current?.style.setProperty(
        "cursor",
        placementMode ? "crosshair" : "grab"
      );
    }
  }, [placementMode]);

  useImperativeHandle(ref, () => ({
    projectToScreen: (pos) => {
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!camera || !renderer) return { x: 0, y: 0, visible: false };
      // Lazy require three — the module is already loaded by the time
      // the parent calls this (imperative handle is set post-mount).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const THREE = require("three");
      const v = new THREE.Vector3(pos.x, pos.y, pos.z);
      v.project(camera);
      // v.x, v.y are in NDC [-1, 1]. Convert to CSS pixels relative to canvas.
      const rect = renderer.domElement.getBoundingClientRect();
      const sx = (v.x * 0.5 + 0.5) * rect.width;
      const sy = (-v.y * 0.5 + 0.5) * rect.height;
      // v.z > 1 means behind the far plane; z in [-1..1] is visible NDC depth.
      // We also flag anything outside the canvas rect as not-visible so the
      // overlay can hide pins that drifted off-screen.
      const inFrame =
        sx >= 0 && sy >= 0 && sx <= rect.width && sy <= rect.height && v.z < 1;
      return { x: sx, y: sy, visible: inFrame };
    },

    isPointOccluded: (pos) => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const raycaster = raycasterRef.current;
      const modelRoot = modelRootRef.current;
      if (!scene || !camera || !raycaster || !modelRoot) return false;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const THREE = require("three");
      const target = new THREE.Vector3(pos.x, pos.y, pos.z);
      const dir = new THREE.Vector3().subVectors(target, camera.position);
      const dist = dir.length();
      dir.normalize();
      raycaster.set(camera.position, dir);
      raycaster.far = dist - 0.01; // slightly short so the pin's own surface isn't a hit
      const hits = raycaster.intersectObject(modelRoot, true);
      return hits.length > 0;
    },

    captureThumbnail: async (maxWidth = 512, quality = 0.75) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return null;
      // Force a fresh render into the current back buffer so toBlob can
      // read it (WebGL clears after present on some browsers — rendering
      // synchronously here guarantees pixels exist when we sample).
      renderer.render(scene, camera);
      const srcCanvas: HTMLCanvasElement = renderer.domElement;
      // Downscale to the target thumbnail size via an offscreen 2D canvas.
      // We cap the long edge at maxWidth so the payload stays tiny.
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
      // JPEG needs an opaque background or the composite will show black;
      // paint the Ivory cream behind the model for visual consistency.
      ctx.fillStyle = "#FAFAF8";
      ctx.fillRect(0, 0, dstW, dstH);
      ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);
      return await new Promise<Blob | null>((resolve) =>
        off.toBlob((b) => resolve(b), "image/jpeg", quality)
      );
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let cleanupFns: Array<() => void> = [];

    async function init(ctr: HTMLDivElement) {
      // Dynamic imports — these chunks only load when the viewer renders.
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      if (cancelled) return;

      const width = ctr.clientWidth;
      const height = ctr.clientHeight;

      // ── Scene ─────────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xfafaf8); // Ivory cream
      sceneRef.current = scene;

      // Subtle grid so empty space has orientation. Gold-dim lines matching
      // the brand palette.
      const grid = new THREE.GridHelper(50, 50, 0xe5e1d4, 0xe5e1d4);
      (grid.material as any).opacity = 0.4;
      (grid.material as any).transparent = true;
      scene.add(grid);

      // ── Camera ────────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
      camera.position.set(6, 5, 6);
      cameraRef.current = camera;

      // ── Lights ────────────────────────────────────────────────────────
      // A balanced ambient + directional combo. Intentionally soft so
      // interior renders don't blow out.
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
      keyLight.position.set(10, 15, 10);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xfff8e0, 0.3);
      fillLight.position.set(-8, 6, -4);
      scene.add(fillLight);

      // ── Renderer ──────────────────────────────────────────────────────
      // preserveDrawingBuffer keeps the framebuffer readable after the
      // browser composites — without it, toBlob/drawImage can return a
      // transparent canvas on some drivers. Cost is small for an occasional
      // thumbnail capture.
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

      // ── Controls ──────────────────────────────────────────────────────
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.5;
      controls.maxDistance = 100;
      controlsRef.current = controls;

      // ── Loader ────────────────────────────────────────────────────────
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
          // Prevents wildly-scaled IFC exports from being invisible or huge.
          const box = new THREE.Box3().setFromObject(modelRoot);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          modelRoot.position.sub(center);
          const maxAxis = Math.max(size.x, size.y, size.z);
          if (maxAxis > 0) {
            const scale = 8 / maxAxis; // fit in a ~8-unit viewport roughly
            modelRoot.scale.setScalar(scale);
          }
          scene.add(modelRoot);
          onLoadComplete?.();
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

      // ── Raycaster for pin placement ──────────────────────────────────
      const raycaster = new THREE.Raycaster();
      raycasterRef.current = raycaster;
      const ndc = new THREE.Vector2();

      function onPointerDown(e: PointerEvent) {
        pointerDownRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      }
      function onPointerUp(e: PointerEvent) {
        const down = pointerDownRef.current;
        pointerDownRef.current = null;
        if (!down) return;
        // Distinguish click-to-place from orbit-drag: both displacement and
        // duration must be small.
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        const movedSq = dx * dx + dy * dy;
        const elapsed = Date.now() - down.t;
        if (movedSq > 25 || elapsed > 500) return; // orbit drag, not a click
        if (!placementModeRef.current) return;
        if (!modelRootRef.current || !onPinPlace) return;

        const rect = renderer.domElement.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(modelRootRef.current, true);
        if (hits.length === 0) return;
        const hit = hits[0];
        const p = hit.point;
        // face.normal is in local space — transform to world so pin is correct
        // no matter how the model was scaled/rotated.
        const n = hit.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
        if (hit.object.matrixWorld) {
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
          n.applyMatrix3(normalMatrix).normalize();
        }
        onPinPlace({ x: p.x, y: p.y, z: p.z }, { x: n.x, y: n.y, z: n.z });
      }

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      cleanupFns.push(() => {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
      });

      // ── Resize handling ──────────────────────────────────────────────
      const onResize = () => {
        const w = ctr.clientWidth;
        const h = ctr.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);
      cleanupFns.push(() => window.removeEventListener("resize", onResize));

      // ── Render loop ──────────────────────────────────────────────────
      let running = true;
      function tick() {
        if (!running) return;
        controls.update();
        renderer.render(scene, camera);
        onFrame?.();
        requestAnimationFrame(tick);
      }
      tick();
      cleanupFns.push(() => {
        running = false;
      });

      setReady(true);
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
      // Dispose renderer + remove canvas
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
    };
    // gltfUrl is the only input that should restart the whole pipeline.
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

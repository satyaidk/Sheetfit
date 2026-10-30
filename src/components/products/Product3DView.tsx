"use client";

/**
 * Interactive 3D view of a product with the design on it.
 *
 * A studio set: a photographed studio (a CC0 HDRI with large softboxes,
 * `public/env/`) lights the product and gives glaze, steel and glass real
 * highlights to reflect; three.js's synthetic room stands in while it loads
 * or if it fails. A key light casts a soft shadow onto an invisible floor,
 * and a backdrop gradient is picked for contrast with the blank colour
 * (`backdropFor`). Drag to orbit, scroll or pinch to zoom; the view is
 * framed to the product's size and re-framed only when the product changes,
 * so switching colours or designs keeps the angle the user chose.
 *
 * A small toolbar gives Front, Side and Back views (animated, shortest way
 * round), zoom buttons and full screen, so the print can be inspected without
 * fiddly dragging. It renders on demand: only while the view moves, turns or
 * changes, so a preview left open (the editor's dock) costs nothing at rest.
 *
 * Loaded with `next/dynamic` (three.js is only downloaded when a 3D view
 * opens). WebGL failures fall back to a message rather than a blank box.
 */

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import type { ProductPreset } from "@/lib/catalogue/products";
import type { PrintProcess } from "@/types/editor";
import { backdropFor } from "@/lib/catalogue/colors";
import { buildProductModel, disposeModel, printStyle, weaveRepeat } from "@/lib/three/product-model";
import { colorTexture, corkTexture, fabricRoughnessTexture, knitNormalTexture, loadImage, printCanvas, weaveNormalTexture } from "@/lib/three/print-textures";
import { threeConsole } from "@/lib/three/driver-notes";
import { whiteBalance } from "@/lib/three/studio";
import { cn } from "@/lib/utils";

// Keep Direct3D compiler notes (Chrome on Windows) out of the console; real shader errors still show.
THREE.setConsoleFunction(threeConsole);

export interface Product3DViewProps {
  product: ProductPreset;
  /** Blank colour (hex). */
  color: string;
  /** Image of the whole print box (slot), or null for the plain blank. */
  designUrl: string | null;
  process: PrintProcess;
  autoRotate?: boolean;
  /** Filled with a function that renders the current view to a PNG blob. */
  captureRef?: React.RefObject<(() => Promise<Blob | null>) | null>;
  className?: string;
  /** Called after each model build, with the number of print meshes (tests read it from the DOM). */
  onModel?: (info: { family: string; prints: number }) => void;
  /** Show the view, zoom and full-screen toolbar (off for small docked previews). */
  toolbar?: boolean;
  /** Called when the user takes control (drags or uses the toolbar), e.g. to stop auto-rotation. */
  onInteract?: () => void;
}

type View = "front" | "side" | "back";
const VIEW_OFFSET: Record<View, number> = { front: 0, side: Math.PI / 2, back: Math.PI };
/** Camera elevation used for framing and the preset views (radians above the horizon). */
const ELEVATION = 0.2;

interface CameraMove {
  from: THREE.Spherical;
  to: THREE.Spherical;
  /** Frame time the move began; -1 until its first frame. */
  start: number;
  duration: number;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  key: THREE.DirectionalLight;
  floor: THREE.Mesh<THREE.CircleGeometry, THREE.ShadowMaterial>;
  model: THREE.Group | null;
  textures: THREE.Texture[];
  weave: THREE.CanvasTexture;
  cork: THREE.CanvasTexture;
  knit: THREE.DataTexture;
  knitRoughness: THREE.DataTexture;
  framedFor: string | null;
  /** Set whenever the picture may have changed; the loop renders only then. */
  dirty: boolean;
  move: CameraMove | null;
  /** Framed distance, the azimuth facing the print centre (Front view) and the camera height for preset views. */
  home: { front: number; distance: number; elevation: number };
  /** Environment intensity of the current lighting (room or studio), and the current model's share of it. */
  envBase: number;
  envShare: number;
}

/** "Studio Small 03" by Greg Zaal, Poly Haven, CC0 (public/env/CREDITS.md). */
const STUDIO_HDRI = "/env/studio_small_03_1k.hdr";
/**
 * The studio's softbox is bright and large: facing the camera it washes a
 * glossy print out. Turned to the upper left it leaves a narrow highlight
 * near the edge, as in a product photo. Tuned by eye on the mug, tumbler and
 * T-shirt; the key light is lowered because the studio now does half its work.
 */
const STUDIO = { rotation: -0.8, intensity: 0.7, key: 1.3 };

const NO_WEBGL = "3D preview needs WebGL, which this browser has turned off. The flat preview still works.";

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export default function Product3DView({
  product,
  color,
  designUrl,
  process,
  autoRotate = false,
  captureRef,
  className,
  onModel,
  toolbar = true,
  onInteract,
}: Product3DViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const interact = useRef(onInteract);
  const [fullscreen, setFullscreen] = useState(false);
  const stage = useRef<Stage | null>(null);
  const [error, setError] = useState<string | null>(() => (webglAvailable() ? null : NO_WEBGL));
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState(true);
  const backdrop = backdropFor(color);

  // One renderer per view, for its whole life.
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      // Context creation can still fail (GPU blocklisted, too many contexts).
      queueMicrotask(() => setError(NO_WEBGL));
      return;
    }
    // Supersample on standard screens (1.5x) for crisper edges and print detail; cap at 2x.
    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 1.5), 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    // Variance shadow maps blur well, which reads as a soft studio shadow.
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.domElement.className = "block size-full touch-none outline-none";
    renderer.domElement.setAttribute("aria-label", "3D product view: drag to turn, scroll to zoom");
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    let env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    scene.environment = env;
    scene.environmentIntensity = 0.9;

    const camera = new THREE.PerspectiveCamera(30, 1, 1, 50000);
    const key = new THREE.DirectionalLight("#ffffff", 1.7);
    key.castShadow = true;
    // A blurred map gives the soft-edged shadow of a large studio light.
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 22;
    key.shadow.blurSamples = 24;
    // A rim light from behind separates the silhouette from the backdrop.
    const rim = new THREE.DirectionalLight("#ffffff", 0.55);
    rim.position.set(-2, 1.4, -2.6);
    scene.add(key, key.target, rim, new THREE.HemisphereLight("#ffffff", "#8a8f99", 0.35));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.autoRotateSpeed = 1.4;
    const s: Stage = {
      renderer,
      scene,
      camera,
      controls,
      key,
      floor,
      model: null,
      textures: [],
      weave: weaveNormalTexture(),
      cork: corkTexture(),
      knit: knitNormalTexture(),
      knitRoughness: fabricRoughnessTexture(),
      framedFor: null,
      dirty: true,
      move: null,
      home: { front: 0, distance: 1, elevation: ELEVATION },
      envBase: 0.9,
      envShare: 1,
    };
    stage.current = s;

    // Swap in the photographed studio once it arrives (1.6 MB); until then, or if it fails, keep the room.
    let disposed = false;
    new HDRLoader().setDataType(THREE.FloatType).load(
      STUDIO_HDRI,
      (hdr) => {
        if (!disposed) {
          whiteBalance(hdr.image.data as Float32Array);
          hdr.needsUpdate = true;
          env.dispose();
          env = pmrem.fromEquirectangular(hdr).texture;
          scene.environment = env;
          s.envBase = STUDIO.intensity;
          scene.environmentIntensity = s.envBase * s.envShare;
          scene.environmentRotation.y = STUDIO.rotation;
          key.intensity = STUDIO.key;
          s.dirty = true;
        }
        hdr.dispose();
      },
      undefined,
      () => undefined,
    );

    controls.addEventListener("change", () => (s.dirty = true));
    controls.addEventListener("start", () => {
      setHint(false);
      s.move = null;
      interact.current?.();
    });

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let frame = 0;
    const offset = new THREE.Vector3();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (s.move) {
        const m = s.move;
        if (m.start < 0) m.start = now;
        const t = m.duration > 0 ? Math.min(1, (now - m.start) / m.duration) : 1;
        const e = easeInOut(t);
        const sph = new THREE.Spherical(
          m.from.radius + (m.to.radius - m.from.radius) * e,
          m.from.phi + (m.to.phi - m.from.phi) * e,
          m.from.theta + (m.to.theta - m.from.theta) * e,
        );
        camera.position.copy(controls.target).add(offset.setFromSpherical(sph));
        camera.lookAt(controls.target);
        if (t >= 1) s.move = null;
        s.dirty = true;
      }
      controls.update(); // emits "change" while damping or turning
      if (s.dirty) {
        s.dirty = false;
        renderer.render(scene, camera);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      const s = stage.current;
      if (s?.model) {
        disposeModel(s.model);
        s.scene.remove(s.model);
      }
      s?.textures.forEach((t) => t.dispose());
      s?.weave.dispose();
      s?.cork.dispose();
      s?.knit.dispose();
      s?.knitRoughness.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      stage.current = null;
    };
  }, []);

  // Rebuild the model when the product, colour, design or process changes.
  useEffect(() => {
    let cancelled = false;
    const s = stage.current;
    if (!s) return;
    setLoading(true);
    (async () => {
      let design: HTMLImageElement | null = null;
      try {
        design = designUrl ? await loadImage(designUrl) : null;
      } catch {
        design = null;
      }
      if (cancelled || !stage.current) return;
      const art = printCanvas(product, design, color, process);
      const artTex = art ? colorTexture(art, s.renderer.capabilities.getMaxAnisotropy()) : null;
      const r = weaveRepeat(product);
      s.weave.repeat.set(r, r);
      const style = printStyle(product);
      const model = buildProductModel(product, {
        color,
        process,
        textures: {
          print: style === "overlay" ? null : artTex,
          overlay: style === "overlay" ? artTex : null,
          weave: s.weave,
          cork: s.cork,
          knit: s.knit,
          knitRoughness: s.knitRoughness,
        },
      });

      // Stand the model on the floor, centred.
      const group = model.group;
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      group.position.set(-center.x, -box.min.y, -center.z);
      const sphere = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere());

      if (s.model) {
        disposeModel(s.model);
        s.scene.remove(s.model);
      }
      s.textures.forEach((t) => t.dispose());
      s.textures = artTex ? [artTex] : [];
      s.model = group;
      s.scene.add(group);
      s.envShare = model.environment ?? 1;
      s.scene.environmentIntensity = s.envBase * s.envShare;

      // Light, shadow and floor scale with the product (a pet tag is 30 mm, a flag 450 mm).
      const R = sphere.radius;
      s.key.position.set(R * 1.4, R * 3.2, R * 2.4);
      s.key.target.position.copy(sphere.center);
      // The floor (a disc of 3R, enough for the longest shadow) must sit wholly
      // inside the shadow camera; where the frustum edge crosses the floor, VSM
      // draws a thin line.
      const cam = s.key.shadow.camera as THREE.OrthographicCamera;
      cam.left = cam.bottom = -R * 3.3;
      cam.right = cam.top = R * 3.3;
      cam.near = R * 0.5;
      cam.far = R * 8;
      cam.updateProjectionMatrix();
      s.floor.scale.set(R * 3, R * 3, 1);
      s.dirty = true;

      if (s.framedFor !== product.id) {
        const fov = (s.camera.fov * Math.PI) / 180;
        const dist = (R / Math.sin(fov / 2)) * 1.08;
        const az = model.viewAzimuth;
        const el = model.viewElevation ?? ELEVATION;
        s.home = { front: model.frontAzimuth ?? 0, distance: dist, elevation: el };
        s.move = null;
        const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
        s.controls.target.copy(sphere.center);
        s.camera.position.copy(sphere.center).addScaledVector(dir, dist);
        s.camera.near = Math.max(0.5, dist / 200);
        s.camera.far = dist * 40;
        s.camera.updateProjectionMatrix();
        s.controls.minDistance = R * 0.9;
        s.controls.maxDistance = dist * 3;
        s.controls.update();
        s.framedFor = product.id;
      }
      setLoading(false);
      onModel?.({ family: model.family, prints: model.printMeshes.length });
    })();
    return () => {
      cancelled = true;
    };
  }, [product, color, designUrl, process, onModel]);

  useEffect(() => {
    interact.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    if (stage.current) stage.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.floor.material.opacity = backdrop.shadow;
    s.dirty = true;
  }, [backdrop.shadow]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /** Animate the camera to a new position around the product (shortest way round). */
  function moveTo(target: { theta?: number; phi?: number; radius?: number }) {
    const s = stage.current;
    if (!s) return;
    setHint(false);
    interact.current?.();
    const from = new THREE.Spherical().setFromVector3(s.camera.position.clone().sub(s.controls.target));
    const to = new THREE.Spherical(target.radius ?? from.radius, target.phi ?? from.phi, target.theta ?? from.theta);
    let d = (to.theta - from.theta) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    to.theta = from.theta + d;
    to.radius = Math.min(s.controls.maxDistance, Math.max(s.controls.minDistance, to.radius));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    s.move = { from, to, start: -1, duration: reduced ? 0 : 650 };
  }

  function showView(view: View) {
    const s = stage.current;
    if (!s) return;
    moveTo({ theta: s.home.front + VIEW_OFFSET[view], phi: Math.PI / 2 - s.home.elevation, radius: s.home.distance });
  }

  function zoom(factor: number) {
    const s = stage.current;
    if (!s) return;
    moveTo({ radius: s.camera.position.distanceTo(s.controls.target) * factor });
  }

  function toggleFullscreen() {
    const el = root.current;
    if (!el) return;
    if (document.fullscreenElement === el) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  }

  // Saving composites the transparent render over the same backdrop gradient.
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = async () => {
      const s = stage.current;
      if (!s) return null;
      s.renderer.render(s.scene, s.camera);
      const src = s.renderer.domElement;
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext("2d")!;
      const g = ctx.createRadialGradient(out.width / 2, out.height * 0.38, 0, out.width / 2, out.height * 0.38, Math.max(out.width, out.height) * 0.75);
      g.addColorStop(0, backdrop.inner);
      g.addColorStop(1, backdrop.outer);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(src, 0, 0);
      return new Promise((resolve) => out.toBlob((b) => resolve(b), "image/png"));
    };
    return () => {
      captureRef.current = null;
    };
  }, [captureRef, backdrop.inner, backdrop.outer]);

  return (
    <div
      ref={root}
      className={cn("relative size-full overflow-hidden transition-[background] duration-500", className)}
      style={{ background: `radial-gradient(circle at 50% 38%, ${backdrop.inner} 0%, ${backdrop.outer} 100%)` }}
      data-testid="product-3d-view"
      data-loading={loading ? "true" : "false"}
    >
      <div ref={host} className="absolute inset-0" />
      {error && <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-lg bg-surface/95 p-3 text-center text-[13px] text-ink-muted shadow">{error}</p>}
      {loading && !error && (
        <span className={cn("absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[12px] font-medium", backdrop.dark ? "bg-white/15 text-white" : "bg-white/80 text-ink-muted")}>
          Building the 3D model…
        </span>
      )}
      {hint && toolbar && !loading && !error && (
        <span
          className={cn(
            "pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap animate-fade",
            backdrop.dark ? "bg-white/15 text-white" : "bg-white/85 text-ink-muted shadow-sm",
          )}
        >
          Drag to turn. Scroll or pinch to zoom.
        </span>
      )}
      {toolbar && !error && (
        <div
          role="toolbar"
          aria-label="3D view"
          className={cn(
            "absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full p-1 shadow-sm ring-1 transition-opacity",
            backdrop.dark ? "bg-black/35 text-white ring-white/15" : "bg-white/90 text-ink ring-black/10",
            loading && "pointer-events-none opacity-40",
          )}
        >
          {(["front", "side", "back"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => showView(v)}
              aria-label={`${v[0].toUpperCase()}${v.slice(1)} view`}
              className={cn("h-7 rounded-full px-2.5 text-[12px] font-semibold capitalize", backdrop.dark ? "hover:bg-white/15" : "hover:bg-black/6")}
            >
              {v}
            </button>
          ))}
          <span aria-hidden className={cn("mx-1 h-4 w-px", backdrop.dark ? "bg-white/25" : "bg-black/15")} />
          <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom out" title="Zoom out" className={cn("flex size-7 items-center justify-center rounded-full [&_svg]:size-4", backdrop.dark ? "hover:bg-white/15" : "hover:bg-black/6")}>
            <ZoomOut />
          </button>
          <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom in" title="Zoom in" className={cn("flex size-7 items-center justify-center rounded-full [&_svg]:size-4", backdrop.dark ? "hover:bg-white/15" : "hover:bg-black/6")}>
            <ZoomIn />
          </button>
          <button
            type="button"
            onClick={() => toggleFullscreen()}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            title={fullscreen ? "Exit full screen" : "Full screen"}
            className={cn("flex size-7 items-center justify-center rounded-full [&_svg]:size-4", backdrop.dark ? "hover:bg-white/15" : "hover:bg-black/6")}
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </button>
        </div>
      )}
    </div>
  );
}

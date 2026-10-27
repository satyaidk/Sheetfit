"use client";

/**
 * Interactive 3D view of a product with the design on it.
 *
 * A studio set: a room environment for reflections (glaze, steel and glass
 * need something to reflect), a key light casting a soft shadow onto an
 * invisible floor, and a backdrop gradient picked for contrast with the blank
 * colour (`backdropFor`). Drag to orbit, scroll or pinch to zoom; the view is
 * framed to the product's size and re-framed only when the product changes,
 * so switching colours or designs keeps the angle the user chose.
 *
 * Loaded with `next/dynamic` (three.js is only downloaded when a 3D view
 * opens). WebGL failures fall back to a message rather than a blank box.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ProductPreset } from "@/lib/catalogue/products";
import type { PrintProcess } from "@/types/editor";
import { backdropFor } from "@/lib/catalogue/colors";
import { buildProductModel, disposeModel, printStyle, weaveRepeat } from "@/lib/three/product-model";
import { colorTexture, corkTexture, loadImage, printCanvas, weaveNormalTexture } from "@/lib/three/print-textures";
import { threeConsole } from "@/lib/three/driver-notes";
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
  framedFor: string | null;
}

const NO_WEBGL = "3D preview needs WebGL, which this browser has turned off. The flat preview still works.";

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Product3DView({ product, color, designUrl, process, autoRotate = false, captureRef, className, onModel }: Product3DViewProps) {
  const host = useRef<HTMLDivElement>(null);
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.85;

    const camera = new THREE.PerspectiveCamera(30, 1, 1, 50000);
    const key = new THREE.DirectionalLight("#ffffff", 1.7);
    key.castShadow = true;
    // A blurred map gives the soft-edged shadow of a large studio light.
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 22;
    key.shadow.blurSamples = 24;
    scene.add(key, key.target, new THREE.HemisphereLight("#ffffff", "#8a8f99", 0.35));
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
    controls.addEventListener("start", () => setHint(false));

    stage.current = { renderer, scene, camera, controls, key, floor, model: null, textures: [], weave: weaveNormalTexture(), cork: corkTexture(), framedFor: null };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
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
        textures: { print: style === "overlay" ? null : artTex, overlay: style === "overlay" ? artTex : null, weave: s.weave, cork: s.cork },
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

      if (s.framedFor !== product.id) {
        const fov = (s.camera.fov * Math.PI) / 180;
        const dist = (R / Math.sin(fov / 2)) * 1.08;
        const az = model.viewAzimuth;
        const el = 0.2;
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
    if (stage.current) stage.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (stage.current) stage.current.floor.material.opacity = backdrop.shadow;
  }, [backdrop.shadow]);

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
      {hint && !loading && !error && (
        <span
          className={cn(
            "pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap animate-fade",
            backdrop.dark ? "bg-white/15 text-white" : "bg-white/85 text-ink-muted shadow-sm",
          )}
        >
          Drag to turn. Scroll or pinch to zoom.
        </span>
      )}
    </div>
  );
}

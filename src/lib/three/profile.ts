/**
 * Filleted 2D profiles, shared by the lathed drinkware and the T-shirt.
 *
 * Kept free of `@/` imports (only `three`), so the T-shirt generator that uses
 * it can also run from a plain Node script (`scripts/export-tshirt.mjs`).
 */

import * as THREE from "three";

/** A profile corner: radius (x), height (y) and the fillet that rounds it (0 or absent = sharp). */
export type Corner = [x: number, y: number, round?: number];

/**
 * Rounds the corners of a 2D polyline with circular fillets, as a CAD fillet
 * does. A fillet never takes more than half of either edge, so neighbouring
 * fillets cannot overlap; the first and last points stay sharp.
 */
export function roundCorners(pts: Corner[], steps = 8): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  const push = (v: THREE.Vector2) => {
    const last = out[out.length - 1];
    if (!last || last.distanceTo(v) > 1e-4) out.push(v);
  };
  pts.forEach(([x, y, round = 0], i) => {
    const p = new THREE.Vector2(x, y);
    if (round <= 0 || i === 0 || i === pts.length - 1) {
      push(p);
      return;
    }
    const a = new THREE.Vector2(pts[i - 1][0], pts[i - 1][1]).sub(p);
    const b = new THREE.Vector2(pts[i + 1][0], pts[i + 1][1]).sub(p);
    const la = a.length();
    const lb = b.length();
    a.normalize();
    b.normalize();
    const theta = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
    if (theta < 1e-3 || Math.PI - theta < 1e-3) {
      push(p);
      return;
    }
    const d = Math.min(round / Math.tan(theta / 2), la / 2, lb / 2);
    const r = d * Math.tan(theta / 2);
    const t1 = p.clone().addScaledVector(a, d);
    const t2 = p.clone().addScaledVector(b, d);
    const c = p.clone().addScaledVector(a.clone().add(b).normalize(), r / Math.sin(theta / 2));
    const a1 = Math.atan2(t1.y - c.y, t1.x - c.x);
    let sweep = Math.atan2(t2.y - c.y, t2.x - c.x) - a1;
    if (sweep > Math.PI) sweep -= Math.PI * 2;
    if (sweep < -Math.PI) sweep += Math.PI * 2;
    for (let k = 0; k <= steps; k++) {
      const ang = a1 + (sweep * k) / steps;
      push(new THREE.Vector2(c.x + r * Math.cos(ang), c.y + r * Math.sin(ang)));
    }
  });
  return out;
}

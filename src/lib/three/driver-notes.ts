/**
 * Console filter for harmless graphics-driver notes.
 *
 * On Windows, Chrome and Edge run WebGL through ANGLE on Direct3D. Its HLSL
 * compiler returns notes such as "warning X4122: sum of 1 and -1.49e-017
 * cannot be represented accurately in double precision" for three.js's own
 * shadow shaders, even though they compile, link and render correctly.
 * three.js forwards any non-empty program log as a console warning, so every
 * 3D view printed a block of this noise. This filter drops exactly those
 * Direct3D compiler warnings; link failures, any other warning and all errors
 * still reach the console unchanged.
 */

const PROGRAM_LOG = "THREE.WebGLProgram: Program Info Log:";
const D3D_WARNING = /warning X\d{4}:/;

type ConsoleType = "log" | "warn" | "error";

/** True when a three.js message is a program log made only of Direct3D compiler warnings. */
export function isDriverNote(message: string, params: unknown[]): boolean {
  if (message !== PROGRAM_LOG || typeof params[0] !== "string") return false;
  const lines = params[0]
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 0 && lines.every((l) => D3D_WARNING.test(l) && !/error/i.test(l));
}

/** Console function for `THREE.setConsoleFunction`: skips driver notes, forwards the rest. */
export function threeConsole(type: ConsoleType, message: string, ...params: unknown[]) {
  if (type === "warn" && isDriverNote(message, params)) return;
  console[type](message, ...params);
}

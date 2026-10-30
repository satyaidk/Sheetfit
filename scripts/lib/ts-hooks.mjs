/**
 * Node module hooks so plain scripts can import SheetFit's TypeScript sources
 * (Node strips the types itself): extensionless relative imports resolve to
 * `.ts` files. Only for self-contained modules that import `three` and each
 * other, not the `@/` alias.
 */
export async function resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]s$/.test(specifier)) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      // Not a TypeScript file: fall through to the default resolution.
    }
  }
  return next(specifier, context);
}

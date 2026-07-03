/**
 * Node ESM resolve hook: falls back to appending ".ts" for extensionless
 * relative specifiers (e.g. "./noteMapper"), so app source written for
 * bundler-style resolution can be run directly with `node --import`.
 * Node's built-in TypeScript support (v22.6+) strips types once resolved;
 * this hook only fixes specifier resolution, not transpilation.
 */
export async function resolve(specifier, context, nextResolve) {
  if (/^\.\.?\//.test(specifier) && !/\.[a-zA-Z0-9]+$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      // Fall through to default resolution (e.g. it really is extensionless on disk).
    }
  }
  return nextResolve(specifier, context)
}

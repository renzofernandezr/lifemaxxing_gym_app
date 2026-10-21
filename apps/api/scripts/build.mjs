// Empaqueta la API (y @lifemaxxing/core) con esbuild. @node-rs/argon2 queda externo (binario nativo).
import { build } from "esbuild";

await build({
  entryPoints: { server: "src/server.ts", "db/migrate": "src/db/migrate.ts" },
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  external: ["@node-rs/argon2", "pg-native"],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "info",
});

// Bundles src/ into dist/index.js (ESM). Dependencies stay external.
// Types are written by `tsc -p tsconfig.build.json` (see the build script).
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'external',
  logLevel: 'info',
})

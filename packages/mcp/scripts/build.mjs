// Bundles src/bin.ts into dist/bin.js (ESM). Dependencies, including the
// tailwindshades core package, stay external and come from npm.
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/bin.ts'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'external',
  logLevel: 'info',
})

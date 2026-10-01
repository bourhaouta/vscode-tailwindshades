// Bundles src/ into dist/index.js (the library) and dist/bin.js (the CLI), as ESM.
// Shared code goes in a chunk. Dependencies stay external.
// Types are written by `tsc -p tsconfig.build.json` (see the build script).
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/index.ts', 'src/bin.ts'],
  splitting: true,
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'external',
  logLevel: 'info',
})

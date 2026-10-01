// Bundles src/ into dist/index.js (the library) and dist/bin.js (the CLI), as ESM.
// Shared code goes in a chunk. Dependencies stay external.
// Types are written by `tsc -p tsconfig.build.json` (see the build script).
import { rmSync } from 'node:fs'
import * as esbuild from 'esbuild'

// Start clean, so old chunks never get published
rmSync('dist', { recursive: true, force: true })

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

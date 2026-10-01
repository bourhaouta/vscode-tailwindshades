// Bundles src/ into dist/index.js (createServer, for hosting the server in an
// app) and dist/bin.js (the stdio server for npx), as ESM. Shared code goes in a
// chunk. Dependencies, including tailwindshades-cli, stay external.
// Types are written by `tsc -p tsconfig.build.json` (see the build script).
import { readFileSync, rmSync } from 'node:fs'
import * as esbuild from 'esbuild'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

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
  define: { __VERSION__: JSON.stringify(version) },
  logLevel: 'info',
})

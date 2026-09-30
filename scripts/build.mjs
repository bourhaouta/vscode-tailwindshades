// Bundles src/extension.ts (and culori) into dist/extension.js.
// Usage: node scripts/build.mjs [--production] [--watch]
import * as esbuild from 'esbuild'

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

const context = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  // `vscode` is provided by the editor at runtime
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
})

if (watch) {
  await context.watch()
} else {
  await context.rebuild()
  await context.dispose()
}

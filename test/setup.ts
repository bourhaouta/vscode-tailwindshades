// Vitest global setup: builds the packages once, before any test file runs.
// The CLI and MCP tests run the built files, like users do.
import { execFileSync } from 'node:child_process'

export default function setup() {
  for (const pkg of ['core', 'mcp']) {
    execFileSync('node', ['scripts/build.mjs'], { cwd: `packages/${pkg}`, stdio: 'inherit' })
  }
}

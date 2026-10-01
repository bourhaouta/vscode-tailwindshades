// The release publishes the extension, both npm packages and the MCP Registry
// entry from one tag, so their versions and names must match
import { describe, expect, it } from 'vitest'
import root from '../../../package.json'
import core from '../../core/package.json'
import mcp from '../package.json'
import server from '../server.json'

describe('release metadata', () => {
  it('uses one version everywhere', () => {
    expect(core.version).toBe(root.version)
    expect(mcp.version).toBe(root.version)
    expect(server.version).toBe(root.version)
    expect(server.packages[0].version).toBe(root.version)
  })

  it('depends on the core version it is released with', () => {
    expect(mcp.dependencies.tailwindshades).toBe(`^${root.version}`)
  })

  it('links the npm package and the MCP Registry entry', () => {
    expect(server.name).toBe(mcp.mcpName)
    expect(server.packages[0].identifier).toBe(mcp.name)
  })
})

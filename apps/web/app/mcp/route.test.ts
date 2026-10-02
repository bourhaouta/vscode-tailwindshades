// Calls the real /mcp route handlers with the MCP SDK client, in-process (no server)
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { describe, expect, it } from 'vitest'
import { DELETE, GET, OPTIONS, POST } from './route'

const handlers: Record<string, (request: Request) => Response | Promise<Response>> = { GET, POST, DELETE, OPTIONS }

// Sends each request to the route handler for its method, like Next.js does
const fetchRoute = async (url: string | URL, init?: RequestInit) => {
  const request = new Request(url, init)
  return handlers[request.method](request)
}

describe('/mcp', () => {
  it('serves the tools to an MCP client', async () => {
    const client = new Client({ name: 'test', version: '1.0.0' })
    await client.connect(
      new StreamableHTTPClientTransport(new URL('https://tailwindshades.bourhaouta.com/mcp'), { fetch: fetchRoute }),
    )

    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'convert_color',
      'find_closest_tailwind_color',
      'generate_palette',
      'get_tailwind_palette',
      'list_tailwind_colors',
    ])

    const result = await client.callTool({ name: 'generate_palette', arguments: { color: '#db4d53', name: 'brand' } })
    expect(result.structuredContent).toMatchObject({ name: 'brand', inputShade: 500 })
    await client.close()
  })

  it('allows browser clients from any site', async () => {
    const preflight = OPTIONS()
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('*')

    const response = await POST(
      new Request('https://tailwindshades.bourhaouta.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'old', version: '1' } },
        }),
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

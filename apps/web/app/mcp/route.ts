// The remote MCP server: the same tools as `npx tailwindshades-mcp`, over
// Streamable HTTP. Stateless: a fresh server answers every request.
import { createMcpHandler } from '@modelcontextprotocol/server'
import { track } from '@vercel/analytics/server'
import { createServer } from 'tailwindshades-mcp'

const handler = createMcpHandler(createServer)

// Every request runs the handler; never prerender or cache it
export const dynamic = 'force-dynamic'

// Open CORS, so browser-based MCP clients can connect. The server is public and
// read-only, with no cookies or login, so any site may call it. (A host-header
// check against DNS rebinding is for servers on localhost, not this one.)
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': '*',
}

// Records which app connects (e.g. claude-code, cursor), from the clientInfo every
// client sends in its initialize request. Nothing about the user is kept.
async function trackClient(request: Request) {
  if (request.method !== 'POST') return
  try {
    const body: unknown = await request.clone().json()
    for (const message of Array.isArray(body) ? body : [body]) {
      if (message?.method !== 'initialize') continue
      const client = message.params?.clientInfo
      const properties = { client: String(client?.name ?? 'unknown'), version: String(client?.version ?? 'unknown') }
      console.log('mcp client', properties)
      await track('MCP client', properties, { request })
    }
  } catch {
    // Not JSON: the MCP handler answers with the error
  }
}

async function handle(request: Request): Promise<Response> {
  await trackClient(request)
  const response = await handler.fetch(request)
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(cors)) headers.set(name, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors })
}

export { handle as DELETE, handle as GET, handle as POST }

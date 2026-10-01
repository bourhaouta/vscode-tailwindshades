// The remote MCP server: the same tools as `npx tailwindshades-mcp`, over
// Streamable HTTP. Stateless: a fresh server answers every request.
import { createMcpHandler } from '@modelcontextprotocol/server'
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

async function handle(request: Request): Promise<Response> {
  const response = await handler.fetch(request)
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(cors)) headers.set(name, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors })
}

export { handle as DELETE, handle as GET, handle as POST }

# tailwindshades-mcp

An [MCP](https://modelcontextprotocol.io) server that gives AI agents real [Tailwind CSS](https://tailwindcss.com/) palettes, so they stop guessing shades. Works with **Tailwind v4, v3, v2 and v1**.

Ask your agent *"Add a brand color #db4d53 to my theme"*, and it writes a full `50` to `950` palette in the project's Tailwind format, with `#db4d53` exactly at `brand-500`. Same engine as the [Tailwind Shades](https://marketplace.visualstudio.com/items?itemName=bourhaouta.tailwindshades) editor extension and [tailwindshades.bourhaouta.com](https://tailwindshades.bourhaouta.com).

## Setup

### Remote (nothing to install)

Connect your agent to `https://tailwindshades.bourhaouta.com/mcp` (Streamable HTTP, no API key).

**Claude Code**

```sh
claude mcp add --transport http --scope user tailwindshades https://tailwindshades.bourhaouta.com/mcp
```

**Cursor** (`~/.cursor/mcp.json`, or `.cursor/mcp.json` in a project)

```json
{
  "mcpServers": {
    "tailwindshades": { "url": "https://tailwindshades.bourhaouta.com/mcp" }
  }
}
```

**VS Code** (`.vscode/mcp.json`)

```json
{
  "servers": {
    "tailwindshades": { "type": "http", "url": "https://tailwindshades.bourhaouta.com/mcp" }
  }
}
```

### Local (stdio)

Runs on your machine with `npx`, so nothing leaves it. Needs Node.js 20 or later.

**Claude Code**

```sh
claude mcp add --scope user tailwindshades -- npx -y tailwindshades-mcp
```

**Cursor** (`~/.cursor/mcp.json`, or `.cursor/mcp.json` in a project)

```json
{
  "mcpServers": {
    "tailwindshades": { "command": "npx", "args": ["-y", "tailwindshades-mcp"] }
  }
}
```

**VS Code** (`.vscode/mcp.json`)

```json
{
  "servers": {
    "tailwindshades": { "command": "npx", "args": ["-y", "tailwindshades-mcp"] }
  }
}
```

**Other agents**: use the URL above, or run `npx -y tailwindshades-mcp` as a stdio server. It's also in the [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.bourhaouta/tailwindshades`.

## Tools

All three tools are read-only.

### `generate_palette`

A full palette from one color, ready to paste.

| Input | Default |
| --- | --- |
| `color` | required: any CSS color (`#db4d53`, `rgb()`, `hsl()`, `oklch()`, a name) |
| `name` | the closest Tailwind color, which replaces Tailwind's own palette, so the tool warns |
| `tailwindVersion` | `4` (also `3`, `2`, `1`) |
| `format` | `oklch` for v4, `hex` before (also `rgb`) |
| `output` | `theme` for v4, `config` before (also `css`) |

Returns the code, plus the shades, the shade that holds the input color and the closest Tailwind color as structured data.

### `find_closest_tailwind_color`

The Tailwind shade that looks most like a color, e.g. `#db4d53` → `red-500`, with Tailwind's value, the distance, and whether the difference is visible. Agents use it to pick an existing class instead of an arbitrary value, or to decide a custom palette is needed.

### `get_tailwind_palette`

Tailwind's own default colors, exactly as Tailwind defines them: a whole color (`blue`) or one shade (`slate-500`), for Tailwind v4, v3, v2 or v1. Values are `oklch()` in v4 and hex before. Agents use it instead of writing Tailwind's default values from memory.

## Host it yourself

The package also exports `createServer()`, a fresh `McpServer` with all three tools. Serve it with the [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/), for example over HTTP in any web-standard runtime (this is how the remote server above runs, as a Next.js route):

```ts
import { createMcpHandler } from '@modelcontextprotocol/server'
import { createServer } from 'tailwindshades-mcp'

const handler = createMcpHandler(createServer)

export const POST = (request: Request) => handler.fetch(request)
```

## More

- [tailwindshades-cli](https://www.npmjs.com/package/tailwindshades-cli): the same palettes from the command line
- [Source and issues](https://github.com/bourhaouta/vscode-tailwindshades)

## License

MIT © Omar Bourhaouta

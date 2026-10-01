# tailwindshades-mcp

An [MCP](https://modelcontextprotocol.io) server that gives AI agents real [Tailwind CSS](https://tailwindcss.com/) palettes, so they stop guessing shades. Works with **Tailwind v4, v3, v2 and v1**.

Ask your agent *"Add a brand color #db4d53 to my theme"*, and it writes a full `50` to `950` palette in the project's Tailwind format, with `#db4d53` exactly at `brand-500`. Same engine as the [Tailwind Shades](https://marketplace.visualstudio.com/items?itemName=bourhaouta.tailwindshades) editor extension.

## Setup

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

**Other agents**: run `npx -y tailwindshades-mcp` as a stdio server. It's also in the [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.bourhaouta/tailwindshades`.

Needs Node.js 20 or later. No API keys, and nothing leaves your machine.

## Tools

Both tools are read-only.

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

### `closest_tailwind_color`

The Tailwind shade that looks most like a color, e.g. `#db4d53` → `red-500`, with Tailwind's value, the distance, and whether the difference is visible. Agents use it to pick an existing class instead of an arbitrary value, or to decide a custom palette is needed.

## More

- [tailwindshades-cli](https://www.npmjs.com/package/tailwindshades-cli): the same palettes from the command line
- [Source and issues](https://github.com/bourhaouta/vscode-tailwindshades)

## License

MIT © Omar Bourhaouta

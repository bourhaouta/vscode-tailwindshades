# Changelog

## 1.1.0

Tailwind Shades is now also a CLI and an MCP server for AI agents, with the same engine as the extension.

- **CLI** (npm package [`tailwindshades-cli`](https://www.npmjs.com/package/tailwindshades-cli)): `npx tailwindshades-cli "#db4d53" --name brand` prints the same palette the extension writes. Options for the Tailwind version (`-t`), color format (`-f`) and output (`-o theme|config|css`).
- **MCP server** (npm package [`tailwindshades-mcp`](https://www.npmjs.com/package/tailwindshades-mcp)): gives AI agents like Claude Code, Cursor and VS Code two tools, `generate_palette` and `closest_tailwind_color`, so they use real Tailwind palettes instead of guessing colors.
- **Better shade fit**: your color now goes to the shade with the closest lightness in its Tailwind color, so the palette follows Tailwind's light-to-dark steps more closely. For example, `#db4d53` is now `500` in v4 (was `400`), and Tailwind v3's `violet-600` stays `600` in v4 (was `500`). Most colors don't change.
- **Tinted grays fixed**: a slightly warm or cool gray now keeps its exact value at its shade (before, its hue was dropped, so `#7a6f67` came out as `#7b6d71`), and it follows the Tailwind gray with the same tint (`stone` for warm grays instead of `zinc`).

## 1.0.0

A full update for modern Tailwind CSS.

- **Tailwind v4 support**: writes an `@theme` block with `--color-*` variables in CSS files, or only the variables when the cursor is already inside `@theme`.
- **All shades from 50 to 950** (v4 and v3), 50–900 for v2 and 100–900 for v1.
- **Tailwind-like shades**: palettes follow Tailwind's own colors, computed in OKLCH. Your color stays exactly as it is, at the shade where it fits best.
- **Version aware**: detects the Tailwind version from `package.json`, the CSS directives in your files (`@import "tailwindcss"`, `@theme`, `@tailwind base`) or a `tailwind.config.*` file, or set `tailwindshades.tailwindVersion`. Each version uses its own default palette as the reference.
- **Colors in OKLCH, hex or rgb** (`tailwindshades.colorFormat`).
- **Any CSS color as input**: hex, `rgb()`, `hsl()`, `oklch()` and color names. Works on the color under the cursor, no selection needed.
- **Choose the name**: the closest Tailwind color name (from all current names like `slate`, `sky`, `rose`) is suggested.
- New command: **Generate color palette (choose version and output)…**
- The CSS variables command now ships (it was never published after 0.1.0).
- Rewritten in TypeScript and bundled; published to Open VSX too.

## 0.1.0

- New `generateColorPaletteCSSVars` command (#2). Not published to the Marketplace.

## 0.0.5

- Initial release & fix build issues

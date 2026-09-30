# Changelog

## 1.0.0

A full update for modern Tailwind CSS.

- **Tailwind v4 support**: writes an `@theme` block with `--color-*` variables in CSS files, or only the variables when the cursor is already inside `@theme`.
- **All shades from 50 to 950** (v4 and v3), 50–900 for v2 and 100–900 for v1.
- **Tailwind-like shades**: palettes follow Tailwind's own colors, computed in OKLCH. Your color stays exactly as it is, at the shade where it fits best.
- **Version aware**: reads the Tailwind version from `package.json`, or set `tailwindshades.tailwindVersion`. Each version uses its own default palette as the reference.
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

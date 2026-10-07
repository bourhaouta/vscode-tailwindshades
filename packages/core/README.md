# tailwindshades-cli

Generate a full [Tailwind CSS](https://tailwindcss.com/) color palette (`50` to `950`) from any color. Works with **Tailwind v4, v3, v2 and v1**.

The engine behind the [Tailwind Shades](https://marketplace.visualstudio.com/items?itemName=bourhaouta.tailwindshades) editor extension, as a command line tool and a library. Try it in the browser: [tailwindshades.bourhaouta.com](https://tailwindshades.bourhaouta.com).

## Command line

```sh
npx tailwindshades-cli "#db4d53" --name brand
```

```css
@theme {
  --color-brand-50: oklch(97.1% 0.01 13.669);
  --color-brand-100: oklch(93.2% 0.024 14.006);
  --color-brand-200: oklch(87.7% 0.046 14.623);
  --color-brand-300: oklch(79.5% 0.085 15.86);
  --color-brand-400: oklch(68.7% 0.143 18.505);
  --color-brand-500: oklch(61.6% 0.177 21.62);
  --color-brand-600: oklch(56% 0.183 23.614);
  --color-brand-700: oklch(49.2% 0.159 23.807);
  --color-brand-800: oklch(43.6% 0.133 23.188);
  --color-brand-900: oklch(39.2% 0.106 22.012);
  --color-brand-950: oklch(25.8% 0.069 22.331);
}
```

Your color stays exactly as it is, at the shade where it fits best (here `500`). The other shades follow the closest Tailwind color, so they look like Tailwind's own.

| Option | Values | Default |
| --- | --- | --- |
| `-n, --name` | letters, digits and dashes | the closest Tailwind color |
| `-t, --tailwind` | `4`, `3`, `2`, `1` | `4` |
| `-f, --format` | `oklch`, `hex`, `rgb` | `oklch` for v4, `hex` before |
| `-o, --output` | `theme`, `config`, `css`, `live`, `shopify` | `theme` for v4, `config` before |

- `theme`: a v4 `@theme` block for your CSS file
- `config`: an object for `theme.extend.colors` in `tailwind.config.js`
- `css`: plain CSS variables (`--brand-500: …;`)
- `live`: a palette that follows a color picked at runtime (see below)
- `shopify`: the same, for a Shopify theme where the merchant picks the color

Any CSS color works: `#db4d53`, `db4d53` (no `#` needed, since `#` starts a comment in most shells), `rgb(…)`, `hsl(…)`, `oklch(…)` or a color name. Quote colors with spaces.

The palette goes to stdout and a short summary to stderr, so you can add it to a file:

```sh
npx tailwindshades-cli db4d53 -t 3 -o config >> colors.js
```

Without `--name`, the palette uses the closest Tailwind color's name (like `red`), which replaces Tailwind's own palette. The CLI prints a note when that happens.

### Colors picked at runtime

When the color is picked after you ship (by a user, a tenant of a white-label app, a CMS setting), a fixed palette can't follow it. `-o live` writes CSS where every shade follows one variable, `--color-primary`, rebuilt in the browser:

```sh
npx tailwindshades-cli "#223859" --name primary --output live
```

It prints:

1. An `@theme` block with your color as `--color-primary` and the palette for it, so `bg-primary`, `bg-primary-500` and the other utilities exist. Being in `@theme`, the default loses to any rule or inline style that sets the variable.
2. An `@supports` block that redefines each shade from `--color-primary` with relative colors, using the same math as the other outputs:

```css
--color-primary-500: oklch(from var(--color-primary, #223859) min(0.959, 0.7143 * l + 0.2883) calc(min(c, 0.132) * 1.0455) calc(h + 0.13));
```

Each formula also has your color as the `var()` fallback, so the palette still works when nothing sets `--color-primary`, even if you paste only this block. (With `--plain`, that fallback is the only default: a `:root` default could win over your own rule just by coming later.)

Then set the color on `:root` however you like, e.g. `document.documentElement.style.setProperty('--color-primary', '#1f6f43')`, and every shade follows. The shades are computed on `:root`, so set it there, not on an inner element.

Your color's shade (here `700`) is `var(--color-primary, #223859)` itself. The Tailwind color the curve follows and the shade that holds the runtime color are picked from your color when you run the command; the runtime color then moves every shade's lightness, chroma and hue. A color far from yours (another hue, much lighter or darker) still gets a smooth palette, but with your color's curve.

| Option | |
| --- | --- |
| `--plain` | A plain `:root` block instead of `@theme`, for projects without Tailwind |
| `--semantic` | Also writes `--color-primary-foreground`, for text on the color: white or the darkest shade, whichever has more WCAG contrast with the runtime color (black when your color is the darkest shade itself) |

Relative colors work in Chrome and Edge 119+, Safari 18+ and Firefox 128+. Older browsers skip the `@supports` block and keep the static palette for the default color. The live and Shopify outputs need Tailwind v4 (`-t 4`, the default).

### Shopify themes

In a Shopify theme, the merchant picks the brand color in the theme editor. `-o shopify` is the live output, plus what connects it to the theme editor:

```sh
npx tailwindshades-cli "#223859" --name primary --output shopify
```

1. A color setting for `config/settings_schema.json`, with your color as the default.
2. The line for `snippets/css-variables.liquid` (inside `{% style %}`), which turns the setting into `--color-primary`. It uses no Liquid color filters, so the theme editor previews changes live.
3. The `@theme` and `@supports` blocks of the live output.

`--plain` and `--semantic` work the same way; use `--plain` for themes without Tailwind, like Dawn.

## Library

```sh
npm install tailwindshades-cli
```

```js
import { createPalette } from 'tailwindshades-cli'

const palette = createPalette({ color: '#db4d53', name: 'brand', version: 4 })

palette.text // the @theme block above
palette.anchor // 500: the shade that holds your color
palette.shades // [{ shade: 50, value: 'oklch(97.1% 0.01 13.669)' }, …]
```

| Option | Default |
| --- | --- |
| `color` | required: any CSS color |
| `name` | the closest Tailwind color |
| `version` | `4` (also `3`, `2`, `1`) |
| `format` | `'oklch'` for v4, `'hex'` before (also `'rgb'`) |
| `output` | `'theme'` for v4, `'config'` before (also `'cssVariables'`, and `'live'` and `'shopify'` for v4) |
| `indent` | two spaces |
| `plain`, `semantic` | `false`: the `--plain` and `--semantic` options of the live and Shopify outputs |

It throws on an invalid color or name. ESM only, with TypeScript types.

## More

- [Tailwind Shades for VS Code](https://marketplace.visualstudio.com/items?itemName=bourhaouta.tailwindshades) and [Open VSX](https://open-vsx.org/extension/bourhaouta/tailwindshades) (Cursor, Windsurf, VSCodium)
- [tailwindshades-mcp](https://www.npmjs.com/package/tailwindshades-mcp): the same palettes for AI agents
- [Source and issues](https://github.com/bourhaouta/vscode-tailwindshades)

## License

MIT © Omar Bourhaouta

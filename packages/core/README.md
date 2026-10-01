# tailwindshades

Generate a full [Tailwind CSS](https://tailwindcss.com/) color palette (`50` to `950`) from any color. Works with **Tailwind v4, v3, v2 and v1**.

The engine behind the [Tailwind Shades](https://marketplace.visualstudio.com/items?itemName=bourhaouta.tailwindshades) editor extension, as a command line tool and a library.

## Command line

```sh
npx tailwindshades "#db4d53" --name brand
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
| `-o, --output` | `theme`, `config`, `css` | `theme` for v4, `config` before |

- `theme`: a v4 `@theme` block for your CSS file
- `config`: an object for `theme.extend.colors` in `tailwind.config.js`
- `css`: plain CSS variables (`--brand-500: …;`)

Any CSS color works: `#db4d53`, `db4d53` (no `#` needed, since `#` starts a comment in most shells), `rgb(…)`, `hsl(…)`, `oklch(…)` or a color name. Quote colors with spaces.

The palette goes to stdout and a short summary to stderr, so you can add it to a file:

```sh
npx tailwindshades db4d53 -t 3 -o config >> colors.js
```

Without `--name`, the palette uses the closest Tailwind color's name (like `red`), which replaces Tailwind's own palette. The CLI prints a note when that happens.

## Library

```sh
npm install tailwindshades
```

```js
import { createPalette } from 'tailwindshades'

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
| `output` | `'theme'` for v4, `'config'` before (also `'cssVariables'`) |
| `indent` | two spaces |

It throws on an invalid color or name. ESM only, with TypeScript types.

## More

- [Tailwind Shades for VS Code](https://marketplace.visualstudio.com/items?itemName=bourhaouta.tailwindshades) and [Open VSX](https://open-vsx.org/extension/bourhaouta/tailwindshades) (Cursor, Windsurf, VSCodium)
- [tailwindshades-mcp](https://www.npmjs.com/package/tailwindshades-mcp): the same palettes for AI agents
- [Source and issues](https://github.com/bourhaouta/vscode-tailwindshades)

## License

MIT © Omar Bourhaouta

import { displayable, wcagContrast, wcagLuminance } from 'culori'
import { formatColor, type Color, type ColorFormat, type Palette, type PaletteCurve } from './palette.js'

export type LiveOptions = {
  name: string
  palette: Palette
  /** Format of the static fallback palette */
  colorFormat: ColorFormat
  indent: string
  /** A plain `:root` block instead of `@theme`, for projects without Tailwind */
  plain?: boolean
  /** Also write `--color-<name>-foreground`: white or the darkest shade, whichever reads better on the color */
  semantic?: boolean
}

// Shades are kept this much darker than the one before, like applyCurve
const STEP = 0.005

const number = (value: number) => String(Number(value.toFixed(4)) || 0)

/** A line `a + b·l` in the input lightness, as its value at l = 0 and at l = 1 */
type Line = { at0: number; at1: number }

/** `b * l + a` as CSS, with the fewest terms */
function formatLine({ at0, at1 }: Line): string {
  const offset = number(at0)
  const slope = number(at1 - at0)
  if (slope === '0') return offset
  const term = slope === '1' ? 'l' : `${slope} * l`
  if (offset === '0') return term
  return offset.startsWith('-') ? `${term} - ${offset.slice(1)}` : `${term} + ${offset}`
}

/**
 * Lightness of each shade as a function of the input lightness `l`, the same
 * way applyCurve computes it: the shade's own line, capped by every line
 * before it (back to the lightest shade, or to the anchor) minus 0.005 per step.
 */
function lightnessLines(curve: PaletteCurve): Line[][] {
  const [anchorL] = curve.reference
  const own = curve.shades.map(({ reference: [l], fade }, index): Line => {
    if (index === curve.anchor) return { at0: 0, at1: 1 }
    const keep = 1 - fade
    return { at0: l - anchorL * keep, at1: l + (1 - anchorL) * keep }
  })

  return curve.shades.map((_, index) => {
    const first = index < curve.anchor ? 0 : curve.anchor
    const lines = [{ at0: 1, at1: 1 }] // The upper clamp: lightness stays within 0..1
    for (let before = first; before <= index; before++) {
      const shift = STEP * (index - before)
      lines.push({ at0: own[before].at0 - shift, at1: own[before].at1 - shift })
    }
    // `l` is between 0 and 1, so a line above another at both ends never wins the min()
    return lines.filter(
      (line, i) =>
        !lines.some(
          (other, j) =>
            j !== i &&
            other.at0 <= line.at0 &&
            other.at1 <= line.at1 &&
            (other.at0 < line.at0 || other.at1 < line.at1 || j < i),
        ),
    )
  })
}

function lightnessExpression(lines: Line[]): string {
  const terms = lines.map(formatLine)
  const value = terms.length === 1 ? terms[0] : `min(${terms.join(', ')})`
  // The lowest point of a min() of lines is at l = 0 or l = 1
  const lowest = Math.min(...lines.map(({ at0 }) => at0), ...lines.map(({ at1 }) => at1))
  if (lowest < 0) return `max(0, ${value})`
  return terms.length === 1 && value.includes(' ') ? `calc(${value})` : value
}

function chromaExpression(curve: PaletteCurve, index: number): string {
  const { reference, fade } = curve.shades[index]
  if (curve.gray) {
    const keep = number(1 - fade)
    return keep === '1' ? 'c' : keep === '0' ? '0' : `calc(c * ${keep})`
  }
  // Cᵢ · min(c / Cₐ, 3), with the cap on c so it reads as a chroma
  const anchorC = curve.reference[1]
  return `calc(min(c, ${number(3 * anchorC)}) * ${number(reference[1] / anchorC)})`
}

function hueExpression(hueShift: number): string {
  const shift = number(hueShift)
  if (shift === '0') return 'h'
  return shift.startsWith('-') ? `calc(h - ${shift.slice(1)})` : `calc(h + ${shift})`
}

/** The L, C and H channels of each shade, in the input's `l`, `c` and `h` */
function channelExpressions(curve: PaletteCurve): [string, string, string][] {
  const lightness = lightnessLines(curve)
  return curve.shades.map(({ hueShift }, index) =>
    index === curve.anchor
      ? ['l', 'c', 'h']
      : [lightnessExpression(lightness[index]), chromaExpression(curve, index), hueExpression(hueShift)],
  )
}

/**
 * The relative color for each shade: `oklch(from var(--color-<name>) L C H)`,
 * which rebuilds the palette in the browser from whatever color the variable
 * holds. The anchor shade is the variable itself.
 */
export function relativeShades(name: string, curve: PaletteCurve): { shade: number; value: string }[] {
  const channels = channelExpressions(curve)
  return curve.shades.map(({ shade }, index) => ({
    shade,
    value: index === curve.anchor ? `var(--color-${name})` : `oklch(from var(--color-${name}) ${channels[index].join(' ')})`,
  }))
}

const contrast = (a: Color, b: Color | string) =>
  wcagContrast(formatColor(a, 'hex'), typeof b === 'string' ? b : formatColor(b, 'hex'))

/** True when the input color is the darkest shade itself: the dark foreground is then black */
const anchoredLast = (palette: Palette) => palette.anchor === palette.shades.at(-1)!.shade

/**
 * White, or the darkest shade when it contrasts more with the input color
 * (WCAG 2). Black instead of the darkest shade when that is the input color.
 */
export function foregroundShade(palette: Palette): 'white' | 'black' | number {
  const input = palette.shades.find(({ shade }) => shade === palette.anchor)!.color
  const darkest = palette.shades.at(-1)!
  const dark = anchoredLast(palette) ? '#000000' : darkest.color
  if (contrast(input, dark) <= contrast(input, '#ffffff')) return 'white'
  return anchoredLast(palette) ? 'black' : darkest.shade
}

// OKLab to cone responses (LMS, before cubing) and LMS to linear sRGB, from https://bottosson.github.io/posts/oklab/
const OKLAB_TO_LMS = [
  [0.3963377774, 0.2158037573],
  [-0.1055613458, -0.0638541728],
  [-0.0894841775, -1.291485548],
]
const LMS_TO_RGB = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
]
// WCAG 2 relative luminance of linear sRGB, so of each cone response
const LUMINANCE = [0.2126, 0.7152, 0.0722]
const LMS_TO_LUMINANCE = [0, 1, 2].map((cone) => LUMINANCE.reduce((sum, weight, rgb) => sum + weight * LMS_TO_RGB[rgb][cone], 0))

/** WCAG 2 relative luminance of the input color, from its `l`, `c` and `h`, as CSS */
function luminanceExpression(): string {
  const a = 'c * cos(h * 1deg)'
  const b = 'c * sin(h * 1deg)'
  const terms = OKLAB_TO_LMS.map(([fromA, fromB], cone) => {
    const sign = (value: number) => (value < 0 ? `- ${number(-value)}` : `+ ${number(value)}`)
    const cube = `pow(l ${sign(fromA)} * ${a} ${sign(fromB)} * ${b}, 3)`
    return `${sign(LMS_TO_LUMINANCE[cone])} * ${cube}`
  })
  return terms.join(' ').replace(/^\+ /, '').replace(/^- /, '-')
}

/**
 * Luminance above which the darkest shade contrasts more than white with the
 * color (WCAG 2): where (Y + 0.05)² = 1.05 · (Y₉₅₀ + 0.05). It uses the darkest
 * shade of the input color, which barely changes with the merchant color.
 */
export function foregroundThreshold(palette: Palette): number {
  const darkest = anchoredLast(palette) ? '#000000' : formatColor(palette.shades.at(-1)!.color, 'hex')
  return Math.sqrt(1.05 * (wcagLuminance(darkest) + 0.05)) - 0.05
}

/**
 * The foreground as a relative color: white on dark colors, the darkest shade
 * on light ones, switched on the color's WCAG luminance.
 * `clamp(0, (Y - threshold) * 10000, 1)` is the switch.
 */
export function relativeForeground(name: string, palette: Palette): string {
  const [l, c, h] = anchoredLast(palette) ? ['0', '0', 'h'] : channelExpressions(palette.curve).at(-1)!
  const darker = `clamp(0, (${luminanceExpression()} - ${number(foregroundThreshold(palette))}) * 10000, 1)`
  return `oklch(from var(--color-${name}) calc(1 + ${darker} * (${l} - 1)) calc(${darker} * ${c}) ${h})`
}

/** The static palette and the `@supports` block that rebuilds it from `--color-<name>` */
function paletteParts(options: LiveOptions): string[] {
  const { name, palette, colorFormat, indent, plain, semantic } = options
  const block = (selector: string, lines: string[], depth = 0) => {
    const pad = indent.repeat(depth)
    return [`${pad}${selector} {`, ...lines.map((line) => `${pad}${indent}${line}`), `${pad}}`]
  }

  const fallback = palette.shades.map(({ shade, color }) => `--color-${name}-${shade}: ${formatColor(color, colorFormat)};`)
  const live = relativeShades(name, palette.curve).map(({ shade, value }) => `--color-${name}-${shade}: ${value};`)
  const foreground: string[] = []
  if (semantic) {
    const shade = foregroundShade(palette)
    const value = shade === 'white' ? '#fff' : shade === 'black' ? '#000' : `var(--color-${name}-${shade})`
    fallback.push(`--color-${name}-foreground: ${value};`)
    // pow() came after relative colors in Chrome (120 vs 119): without it, keep the static foreground
    foreground.push(
      '',
      `/* The same file: the foreground for --color-${name} (also needs pow() and cos()) */`,
      '@supports (color: oklch(from red calc(pow(l, 1) * cos(h * 1deg)) c h)) {',
      ...block(':root', [`--color-${name}-foreground: ${relativeForeground(name, palette)};`], 1),
      '}',
    )
  }

  return [
    plain
      ? '/* Your stylesheet: the palette for the default color */'
      : '/* Your Tailwind CSS file, after @import "tailwindcss": the palette for the default color */',
    ...block(plain ? ':root' : '@theme', fallback),
    '',
    `/* The same file: rebuilds the palette from --color-${name} (relative colors; other browsers keep the palette above) */`,
    '@supports (color: oklch(from red l c h)) {',
    ...block(':root', live, 1),
    '}',
    ...foreground,
  ]
}

/**
 * CSS where the whole palette follows one variable, `--color-<name>`, set at
 * runtime (by a user, a tenant, a CMS setting...). The browser rebuilds every
 * shade from it with relative colors; older browsers use the static palette.
 */
export function formatLive(options: LiveOptions): string {
  const { name, palette, colorFormat, indent } = options
  const input = palette.shades.find(({ shade }) => shade === palette.anchor)!.color
  // Hex keeps an sRGB color exact; the other formats round it a little
  const exact = displayable({ mode: 'oklch', ...input }) ? 'hex' : colorFormat
  return [
    `/* The color to follow: set --color-${name} on :root at runtime (inline style, JS or any later rule) */`,
    // In a layer, so any unlayered rule or inline style wins over the default
    '@layer base {',
    `${indent}:root {`,
    `${indent}${indent}--color-${name}: ${formatColor(input, exact)};`,
    `${indent}}`,
    '}',
    '',
    ...paletteParts(options),
  ].join('\n')
}

/**
 * Shopify theme code where the merchant picks the color in the theme editor:
 * the color setting, the Liquid line that exposes it as `--color-<name>`, and
 * the live palette (see formatLive).
 */
export function formatShopify(options: LiveOptions): string {
  const { name, palette, indent } = options
  const id = `color_${name.replaceAll('-', '_')}`
  const label = name
    .split('-')
    .filter(Boolean) // Names like "brand-" or "brand--dark" are valid
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
  const input = palette.shades.find(({ shade }) => shade === palette.anchor)!.color
  const setting = { type: 'color', id, label, default: formatColor(input, 'hex') }

  return [
    '/* config/settings_schema.json: add to the "settings" of a group, e.g. "Colors" */',
    JSON.stringify(setting, null, indent),
    '',
    // Liquid color filters would break the theme editor's live preview, so the value goes in as is
    '/* snippets/css-variables.liquid: add the line inside {% style %}, in the :root rule */',
    `--color-${name}: {{ settings.${id} }};`,
    '',
    ...paletteParts(options),
  ].join('\n')
}

import { converter, formatHex, formatRgb, parse, toGamut } from 'culori'
import type { Oklch, ReferencePalette } from './tailwind-palette.js'

export type ColorFormat = 'oklch' | 'hex' | 'rgb'

/** OKLCH color: lightness 0-1, chroma 0-~0.4, hue in degrees (undefined = no hue, e.g. gray) */
export type Color = { l: number; c: number; h: number | undefined }

export type Palette = {
  /** Closest Tailwind color, used as the reference and as the suggested name */
  family: string
  /** Shade where the input color sits unchanged, e.g. 500 */
  anchor: number
  /** Shades in order, lightest first */
  shades: { shade: number; color: Color }[]
}

// Below this chroma a color is treated as gray (its hue is not meaningful)
const GRAY_CHROMA = 0.02

const toOklch = converter('oklch')

/** Parses any CSS color (hex, rgb(), hsl(), oklch(), named colors, ...) */
export function parseColor(input: string): Color | undefined {
  const parsed = parse(input.trim())
  if (!parsed) return undefined

  const { l, c = 0, h } = toOklch(parsed)
  return { l, c, h: c < GRAY_CHROMA || h === undefined ? undefined : h }
}

function hueDifference(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180
}

// Euclidean distance in OKLab, with lightness scaled by `lightnessWeight`
function distance(color: Color, [l, c, h]: Oklch, lightnessWeight: number): number {
  const hue = ((color.h ?? h) * Math.PI) / 180
  const refHue = (h * Math.PI) / 180
  const da = color.c * Math.cos(hue) - c * Math.cos(refHue)
  const db = color.c * Math.sin(hue) - c * Math.sin(refHue)
  return Math.hypot((color.l - l) * lightnessWeight, da, db)
}

/**
 * Finds the Tailwind color and shade index that look most like `color`.
 * By default lightness counts half, so the hue picks the family: that's the
 * best curve for a palette. Use `lightnessWeight: 1` for the plain OKLab
 * distance, to find the shade that looks the same.
 */
export function closestTailwindShade(
  color: Color,
  reference: ReferencePalette,
  { lightnessWeight = 0.5 } = {},
): { family: string; index: number; distance: number } {
  let best = { family: '', index: 0, distance: Infinity }

  for (const [family, shades] of Object.entries(reference.colors)) {
    shades.forEach((shade, index) => {
      const score = distance(color, shade, lightnessWeight)
      if (score < best.distance) best = { family, index, distance: score }
    })
  }

  return best
}

/**
 * Generates Tailwind-like shades that follow `reference` (its shade names and
 * how lightness, chroma and hue change across them), keeping `color` exactly
 * at its closest shade.
 */
export function generatePalette(color: Color, reference: ReferencePalette): Palette {
  // The family comes from the default match (hue first). Inside it, the shade
  // that looks the same keeps the lightness shift, and so the curve's bend, small.
  const { family } = closestTailwindShade(color, reference)
  const curve = reference.colors[family]
  const { index: anchor } = closestTailwindShade(
    color,
    { shades: reference.shades, colors: { [family]: curve } },
    { lightnessWeight: 1 },
  )
  const [refL, refC, refH] = curve[anchor]
  const last = curve.length - 1

  const lightnessShift = color.l - refL
  // How much more (or less) colorful the input is than the matched Tailwind shade
  const chromaScale = refC > 0.005 ? Math.min(color.c / refC, 3) : undefined

  let previousL = Infinity

  const shades = curve.map(([l, c, h], index) => {
    const shade = reference.shades[index]

    if (index === anchor) {
      previousL = color.l
      return { shade, color }
    }

    // 0 at the anchor, 1 at the lightest/darkest shade: the shift fades out
    // toward the ends so they stay as light/dark as Tailwind's
    const end = index < anchor ? 0 : last
    const fade = Math.abs(index - anchor) / Math.abs(end - anchor)

    // Keep shades strictly darker from lightest to darkest
    const lightness = Math.min(l + lightnessShift * (1 - fade), previousL - 0.005)
    previousL = lightness

    const chroma = chromaScale === undefined ? color.c * (1 - fade) : c * chromaScale

    // Keep the input hue, plus Tailwind's small hue drift between shades
    const hue = color.h === undefined ? h : (color.h + hueDifference(refH, h) + 360) % 360

    return {
      shade,
      color: {
        l: Math.max(0, Math.min(1, lightness)),
        c: Math.max(0, chroma),
        h: chroma < 0.001 ? undefined : hue,
      },
    }
  })

  return { family, anchor: reference.shades[anchor], shades }
}

const round = (value: number, digits: number) => Number(value.toFixed(digits))

/** Formats a color like Tailwind does, e.g. `oklch(62.3% 0.214 259.815)` or `#3b82f6` */
export function formatColor(color: Color, format: ColorFormat): string {
  const oklch = { mode: 'oklch' as const, l: color.l, c: color.c, h: color.h }

  if (format === 'oklch') {
    // Stay within Display P3, like Tailwind's own palette
    const mapped = toOklch(toGamut('p3', 'oklch')(oklch))
    const chroma = mapped.c ?? 0
    const hue = mapped.h === undefined || chroma < 0.0005 ? 0 : round(mapped.h, 3)
    return `oklch(${round(mapped.l * 100, 1)}% ${round(chroma, 3)} ${hue})`
  }

  const srgb = toGamut('rgb', 'oklch')(oklch)
  return format === 'hex' ? formatHex(srgb) : formatRgb(srgb)
}

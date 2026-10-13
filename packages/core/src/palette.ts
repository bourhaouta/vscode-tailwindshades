import { converter, formatHex, formatRgb, parse, toGamut } from 'culori'
import type { Oklch, ReferencePalette } from './tailwind-palette.js'

export type ColorFormat = 'oklch' | 'hex' | 'rgb'

/** OKLCH color: lightness 0-1, chroma 0-~0.4, hue in degrees (undefined = no hue, e.g. pure gray) */
export type Color = { l: number; c: number; h: number | undefined }

export type Palette = {
  /** Closest Tailwind color, used as the reference and as the suggested name */
  family: string
  /** Shade where the input color sits unchanged, e.g. 500 */
  anchor: number
  /** Shades in order, lightest first */
  shades: { shade: number; color: Color }[]
  /** How the shades follow the input color, to rebuild them from another color */
  curve: PaletteCurve
}

/** One shade of a curve: Tailwind's own color there, and how far it is from the anchor */
export type ShadeRule = {
  shade: number
  /** Reference color [Lᵢ, Cᵢ, Hᵢ] */
  reference: Oklch
  /** 0 at the anchor, 1 at the lightest/darkest shade: how much of the input's lightness shift fades out */
  fade: number
  /** Hᵢ − Hₐ: Tailwind's hue drift from the anchor, in degrees */
  hueShift: number
}

/**
 * The part of a palette that doesn't depend on the input color: the Tailwind
 * color it follows and the anchor shade. `applyCurve` turns it into shades.
 */
export type PaletteCurve = {
  /** Index of the anchor shade in `shades` */
  anchor: number
  /** Reference color at the anchor [Lₐ, Cₐ, Hₐ] */
  reference: Oklch
  /** True when the anchor is gray (Cₐ ≤ 0.005): chroma then fades from the input's instead of scaling */
  gray: boolean
  /** Shades in order, lightest first */
  shades: ShadeRule[]
}

const toOklch = converter('oklch')

/** Parses any CSS color (hex, rgb(), hsl(), oklch(), named colors, ...) */
export function parseColor(input: string): Color | undefined {
  const parsed = parse(input.trim())
  if (!parsed) return undefined

  // Keep the hue even for grays: a warm gray must match stone, not zinc, and
  // must stay exactly as it is at its shade
  const { l, c = 0, h } = toOklch(parsed)
  return { l, c, h }
}

function hueDifference(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180
}

// Euclidean distance in OKLab, with lightness scaled by `lightnessWeight`
function distance(color: Color, [l, c, h]: Oklch, lightnessWeight: number): number {
  // No hue means no chroma, so any hue gives the same distance
  const hue = ((color.h ?? 0) * Math.PI) / 180
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
  reference: Pick<ReferencePalette, 'shades' | 'colors'>,
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
  const { index: anchor } = closestTailwindShade(
    color,
    { shades: reference.shades, colors: { [family]: reference.colors[family] } },
    { lightnessWeight: 1 },
  )
  const curve = paletteCurve(reference.colors[family], reference.shades, anchor)
  return { family, anchor: reference.shades[anchor], shades: applyCurve(color, curve), curve }
}

/** The curve of Tailwind color `colors` (one family), anchored at shade index `anchor` */
export function paletteCurve(colors: readonly Oklch[], shades: readonly number[], anchor: number): PaletteCurve {
  const [, refC, refH] = colors[anchor]
  const last = colors.length - 1

  return {
    anchor,
    reference: colors[anchor],
    gray: refC <= 0.005,
    shades: colors.map((reference, index) => {
      // The shift fades out toward the ends so they stay as light/dark as Tailwind's
      const end = index < anchor ? 0 : last
      const fade = index === anchor ? 0 : Math.abs(index - anchor) / Math.abs(end - anchor)
      return { shade: shades[index], reference, fade, hueShift: hueDifference(refH, reference[2]) }
    }),
  }
}

/** Builds the shades of `curve` around `color`, which stays unchanged at the anchor */
export function applyCurve(color: Color, curve: PaletteCurve): Palette['shades'] {
  const [refL, refC] = curve.reference
  const lightnessShift = color.l - refL
  // How much more (or less) colorful the input is than the matched Tailwind shade
  const chromaScale = curve.gray ? undefined : Math.min(color.c / refC, 3)

  let previousL = Infinity

  return curve.shades.map(({ shade, reference: [l, c, h], fade, hueShift }, index) => {
    if (index === curve.anchor) {
      previousL = color.l
      return { shade, color }
    }

    // Keep shades strictly darker from lightest to darkest
    const lightness = Math.min(l + lightnessShift * (1 - fade), previousL - 0.005)
    previousL = lightness

    const chroma = chromaScale === undefined ? color.c * (1 - fade) : c * chromaScale

    // Keep the input hue, plus Tailwind's small hue drift between shades
    const hue = color.h === undefined ? h : (color.h + hueShift + 360) % 360

    return {
      shade,
      color: {
        l: Math.max(0, Math.min(1, lightness)),
        c: Math.max(0, chroma),
        h: chroma < 0.001 ? undefined : hue,
      },
    }
  })
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

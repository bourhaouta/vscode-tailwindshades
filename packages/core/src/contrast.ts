import { wcagContrast } from 'culori'
import { formatColor, type Palette } from './palette.js'

/** WCAG AA minimum for normal text */
const AA = 4.5
/** WCAG AAA minimum for normal text */
const AAA = 7

/** A shade of the palette, or plain white */
export type PairColor = number | 'white'

/** A text and background pair that passes WCAG AA, or one to avoid */
export type ReadablePair = {
  use: 'button' | 'text' | 'badge' | 'dark'
  background: PairColor
  text: PairColor
  /** WCAG contrast ratio, from 1 to 21 */
  ratio: number
  level: 'AAA' | 'AA' | 'fail'
}

export type ReadablePairs = {
  pairs: ReadablePair[]
  /** White text on the input color, when it fails AA (the obvious choice for a button) */
  avoid?: ReadablePair
}

/** WCAG contrast ratio between two colors in sRGB, rounded down to 2 digits */
export function contrastRatio(a: string, b: string): number {
  return Math.floor(wcagContrast(a, b) * 100) / 100
}

function level(ratio: number): ReadablePair['level'] {
  return ratio >= AAA ? 'AAA' : ratio >= AA ? 'AA' : 'fail'
}

/**
 * Picks readable text and background pairs from a palette: a button, text on
 * white, a soft badge and text in dark mode. Shades are tested, not fixed: a
 * yellow needs dark text, a red needs a darker button than its 500.
 */
export function readablePairs(palette: Palette): ReadablePairs {
  const hex = new Map<PairColor, string>([['white', '#ffffff']])
  for (const { shade, color } of palette.shades) hex.set(shade, formatColor(color, 'hex'))
  const shades = palette.shades.map(({ shade }) => shade)
  const darkest = shades.at(-1)!
  const anchor = shades.indexOf(palette.anchor)

  const pair = (use: ReadablePair['use'], background: PairColor, text: PairColor): ReadablePair => {
    const ratio = contrastRatio(hex.get(background)!, hex.get(text)!)
    return { use, background, text, ratio, level: level(ratio) }
  }
  // First pair that passes AA, trying `candidates` in order
  const first = (use: ReadablePair['use'], candidates: [PairColor, PairColor][]) =>
    candidates.map(([background, text]) => pair(use, background, text)).find(({ level }) => level !== 'fail')

  // Button: the input color itself when possible, with white or dark text,
  // else the lightest darker shade that holds white text
  const onAnchor = pair('button', palette.anchor, 'white')
  const button = first('button', [
    [palette.anchor, 'white'],
    [palette.anchor, darkest],
    ...shades.slice(anchor + 1).map((shade): [PairColor, PairColor] => [shade, 'white']),
  ])

  // Lightest shade that reads on white: as close to the brand color as possible
  const text = first(
    'text',
    shades.map((shade): [PairColor, PairColor] => ['white', shade]),
  )

  // Soft badge on the 100 shade, which every version has
  const badge = first(
    'badge',
    shades.filter((shade) => shade > 100).map((shade): [PairColor, PairColor] => [100, shade]),
  )

  // Dark mode: the most colorful shade that reads on the darkest one
  const dark = first(
    'dark',
    shades
      .slice(0, -1)
      .reverse()
      .map((shade): [PairColor, PairColor] => [darkest, shade]),
  )

  return {
    pairs: [button, text, badge, dark].filter((found) => found !== undefined),
    avoid: onAnchor.level === 'fail' ? onAnchor : undefined,
  }
}

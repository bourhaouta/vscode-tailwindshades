import { describe, expect, it } from 'vitest'
import { contrastRatio, readablePairs } from '../src/contrast'
import { formatColor, generatePalette, parseColor } from '../src/palette'
import { VERSIONS, type TailwindVersion } from '../src/versions'

const palette = (color: string, version: TailwindVersion = 4) =>
  generatePalette(parseColor(color)!, VERSIONS[version].reference)

describe('contrastRatio', () => {
  it('matches the WCAG ratios', () => {
    expect(contrastRatio('#000', '#fff')).toBe(21)
    expect(contrastRatio('#fff', '#fff')).toBe(1)
  })
})

describe('readablePairs', () => {
  it('moves the button to a darker shade when white text fails on the input color', () => {
    const { pairs, avoid } = readablePairs(palette('#db4d53'))
    expect(pairs.find(({ use }) => use === 'button')).toMatchObject({ background: 600, text: 'white' })
    expect(avoid).toMatchObject({ background: 500, text: 'white', level: 'fail' })
  })

  it('puts dark text on a light input color', () => {
    const { pairs } = readablePairs(palette('#facc15'))
    expect(pairs.find(({ use }) => use === 'button')).toMatchObject({ background: 300, text: 950 })
  })

  it('keeps the input color for the button when white text passes', () => {
    const { pairs, avoid } = readablePairs(palette('#1d4ed8'))
    const button = pairs.find(({ use }) => use === 'button')!
    expect(button.background).toBe(palette('#1d4ed8').anchor)
    expect(avoid).toBeUndefined()
  })

  it('only suggests pairs that pass WCAG AA, for any color and version', () => {
    const colors = ['#db4d53', '#facc15', '#22c55e', '#06b6d4', '#64748b', '#000000', '#ffffff', '#ff00ff', 'oklch(0.9 0.2 120)']
    for (const version of [4, 3, 2, 1] as const) {
      for (const color of colors) {
        const result = palette(color, version)
        const hex = (shade: number | 'white') =>
          shade === 'white' ? '#ffffff' : formatColor(result.shades.find((s) => s.shade === shade)!.color, 'hex')
        const { pairs } = readablePairs(result)
        expect(pairs.map(({ use }) => use)).toEqual(['button', 'text', 'badge', 'dark'])
        for (const pair of pairs) {
          expect(contrastRatio(hex(pair.background), hex(pair.text))).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})

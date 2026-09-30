import { differenceEuclidean, parse } from 'culori'
import { describe, expect, it } from 'vitest'
import { formatColor, generatePalette, parseColor, type Color } from '../src/palette'
import { PALETTE_V1, PALETTE_V3, PALETTE_V4, type Oklch } from '../src/tailwind-palette'
import { VERSIONS } from '../src/versions'

const toColor = ([l, c, h]: Oklch): Color => ({ l, c, h })
const oklchString = ([l, c, h]: Oklch) => `oklch(${l * 100}% ${c} ${h})`
const deltaE = differenceEuclidean('oklab')

describe('parseColor', () => {
  it.each(['#3b82f6', '#38f', 'rgb(59 130 246)', 'hsl(217 91% 60%)', 'oklch(62.3% 0.214 259.815)', 'teal'])(
    'parses %s',
    (input) => {
      expect(parseColor(input)).toBeDefined()
    },
  )

  it.each(['', 'not a color', '#12', 'rgb(']) ('rejects %j', (input) => {
    expect(parseColor(input)).toBeUndefined()
  })

  it('treats grays as having no hue', () => {
    expect(parseColor('#777777')?.h).toBeUndefined()
  })
})

describe('generatePalette', () => {
  it.each([
    ['v4', PALETTE_V4],
    ['v3', PALETTE_V3],
    ['v1', PALETTE_V1],
  ])('gives back the exact %s palette for its own 500 shades', (_, reference) => {
    for (const [family, shades] of Object.entries(reference.colors)) {
      const anchorIndex = reference.shades.indexOf(500)
      const palette = generatePalette(toColor(shades[anchorIndex]), reference)

      // Grays can match another gray family with the same curve; colors must match exactly
      if (shades[anchorIndex][1] > 0.05) expect(palette.family).toBe(family)
      expect(palette.anchor).toBe(500)

      palette.shades.forEach(({ color }, index) => {
        const expected = parse(oklchString(reference.colors[palette.family][index]))!
        expect(deltaE({ mode: 'oklch', ...color }, expected)).toBeLessThan(0.01)
      })
    }
  })

  it('uses the shade names of each version', () => {
    const color = parseColor('#8b5cf6')!
    expect(generatePalette(color, VERSIONS[4].reference).shades.map((s) => s.shade)).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ])
    expect(generatePalette(color, VERSIONS[2].reference).shades.map((s) => s.shade)).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
    ])
    expect(generatePalette(color, VERSIONS[1].reference).shades.map((s) => s.shade)).toEqual([
      100, 200, 300, 400, 500, 600, 700, 800, 900,
    ])
  })

  it('keeps the input color exactly at its closest shade', () => {
    const color = parseColor('#fde68a')! // Tailwind's amber-200
    const palette = generatePalette(color, PALETTE_V4)
    expect(palette.anchor).toBe(200)
    expect(palette.shades.find((s) => s.shade === 200)?.color).toBe(color)
  })

  it.each(['#db4d53', '#064453', '#ff4b5c', '#38b2ac', '#111111', '#f5f5f5', '#00ff00', 'oklch(70% 0.37 150)'])(
    'makes shades go from light to dark for %s',
    (input) => {
      for (const version of [4, 3, 2, 1] as const) {
        const { shades } = generatePalette(parseColor(input)!, VERSIONS[version].reference)
        for (let i = 1; i < shades.length; i++) {
          expect(shades[i].color.l).toBeLessThan(shades[i - 1].color.l)
        }
      }
    },
  )

  it('keeps the hue of the input color', () => {
    const color = parseColor('#db4d53')!
    const { shades } = generatePalette(color, PALETTE_V4)
    for (const { color: shade } of shades.slice(1, -1)) {
      const drift = Math.abs(((shade.h! - color.h! + 540) % 360) - 180)
      expect(drift).toBeLessThan(15)
    }
  })
})

describe('formatColor', () => {
  const blue = parseColor('oklch(62.3% 0.214 259.815)')!

  it('formats OKLCH like Tailwind', () => {
    expect(formatColor(blue, 'oklch')).toBe('oklch(62.3% 0.214 259.815)')
  })

  it('formats hex and rgb in sRGB', () => {
    expect(formatColor(blue, 'hex')).toMatch(/^#[0-9a-f]{6}$/)
    expect(formatColor(blue, 'rgb')).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
  })

  it('writes 0 as the hue of grays', () => {
    expect(formatColor(parseColor('#777777')!, 'oklch')).toMatch(/^oklch\([\d.]+% 0 0\)$/)
  })
})

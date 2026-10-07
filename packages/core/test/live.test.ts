import { converter, displayable, formatHex, wcagContrast, wcagLuminance } from 'culori'
import { describe, expect, it } from 'vitest'
import { runCli } from '../src/cli'
import { createPalette } from '../src/create'
import { foregroundThreshold } from '../src/live'
import { applyCurve, formatColor, generatePalette, parseColor, type Color, type PaletteCurve } from '../src/palette'
import { PALETTE_V4 } from '../src/tailwind-palette'

/**
 * Evaluates the CSS math the live output writes (numbers, l/c/h, + - * /,
 * calc(), min(), max(), clamp(), pow(), cos() and sin() of `<number>deg`), the way a browser does for
 * `oklch(from <color> ...)`. A missing hue is 0, like `none` in CSS. Without
 * `from` (the variable is not set), it uses the var() fallback, like a browser.
 */
function evaluate(value: string, from: Color | undefined, name = 'primary'): Color {
  // var(--color-<name>) or var(--color-<name>, <fallback color>)
  const source = new RegExp(`^var\\(--color-${name}(?:, ((?:[^()]|\\([^()]*\\))+))?\\)`)
  const relative = value.startsWith('oklch(from ')
  const match = value.slice(relative ? 'oklch(from '.length : 0).match(source)
  expect(match).not.toBeNull()
  if (from === undefined) {
    expect(match![1]).toBeDefined()
    from = parseColor(match![1])!
  }
  if (!relative) {
    expect(match![0]).toBe(value)
    return from
  }
  const rest = value.slice('oklch(from '.length + match![0].length)
  expect(rest.startsWith(' ') && rest.endsWith(')')).toBe(true)

  const tokens = rest.slice(1, -1).match(/\d*\.?\d+|[a-z]+|[-+*/(),]/g)!
  const channels: Record<string, number> = { l: from.l, c: from.c, h: from.h ?? 0 }
  let at = 0
  const next = () => tokens[at++]
  const take = (token: string) => expect(next()).toBe(token)

  const primary = (): number => {
    const token = next()
    if (token === '-') return -primary()
    if (token === '(') {
      const result = sum()
      take(')')
      return result
    }
    // Angles are kept in degrees
    if (/^[\d.]/.test(token)) return tokens[at] === 'deg' ? (next(), Number(token)) : Number(token)
    if (token in channels && tokens[at] !== '(') return channels[token]
    take('(')
    const args = [sum()]
    while (tokens[at] === ',') {
      next()
      args.push(sum())
    }
    take(')')
    switch (token) {
      case 'calc':
        return args[0]
      case 'min':
        return Math.min(...args)
      case 'max':
        return Math.max(...args)
      case 'clamp':
        return Math.max(args[0], Math.min(args[1], args[2]))
      case 'pow':
        return args[0] ** args[1]
      case 'cos':
        return Math.cos((args[0] * Math.PI) / 180)
      case 'sin':
        return Math.sin((args[0] * Math.PI) / 180)
    }
    throw new Error(`unknown function ${token}`)
  }
  const product = () => {
    let result = primary()
    while (tokens[at] === '*' || tokens[at] === '/') result = next() === '*' ? result * primary() : result / primary()
    return result
  }
  const sum = () => {
    let result = product()
    while (tokens[at] === '+' || tokens[at] === '-') result = next() === '+' ? result + product() : result - product()
    return result
  }

  // Channels are separated by spaces, so each one is a single value or function
  const [l, c, h] = [primary(), primary(), primary()]
  expect(at).toBe(tokens.length)
  return { l, c, h: ((h % 360) + 360) % 360 }
}

/** The `--color-<name>-<shade>` values in the @supports block */
function liveShades(text: string, name = 'primary'): Map<number, string> {
  const live = text.slice(text.indexOf('@supports'))
  const pattern = new RegExp(`--color-${name}-(\\d+): (.+);`, 'g')
  return new Map([...live.matchAll(pattern)].map(([, shade, value]) => [Number(shade), value]))
}

function expectSameColor(actual: Color, expected: Color) {
  expect(actual.l).toBeCloseTo(expected.l, 3)
  expect(actual.c).toBeCloseTo(expected.c, 3)
  // Without chroma there is no hue
  if (expected.h === undefined || expected.c < 0.001) return
  const gap = Math.abs(((actual.h! - expected.h + 540) % 360) - 180)
  expect(gap).toBeLessThan(1e-3)
}

/** Checks the CSS of `curve` against applyCurve for the merchant color `input` */
function expectRoundTrip(text: string, curve: PaletteCurve, input: Color) {
  const live = liveShades(text)
  const expected = applyCurve(input, curve)
  expect([...live.keys()]).toEqual(expected.map(({ shade }) => shade))
  for (const { shade, color } of expected) expectSameColor(evaluate(live.get(shade)!, input), color)
}

const shopify = (color: string, options = {}) =>
  createPalette({ color, name: 'primary', output: 'shopify', ...options })
const live = (color: string, options = {}) => createPalette({ color, name: 'primary', output: 'live', ...options })

/** The value of `--color-<name>-foreground` in the @supports block */
const liveForeground = (text: string) =>
  text.slice(text.indexOf('@supports')).match(/--color-primary-foreground: (.+);/)![1]

// Every Tailwind v4 color at a few shades, plus grays, extremes and out-of-gamut colors
const INPUTS = [
  ...Object.values(PALETTE_V4.colors).flatMap((shades) =>
    [1, 4, 5, 7, 10].map((index) => `oklch(${shades[index][0]} ${shades[index][1]} ${shades[index][2]})`),
  ),
  '#223859',
  '#1f6f43',
  '#db4d53',
  '#fde68a',
  '#777777',
  '#7a6f67',
  '#98a196',
  '#ffffff',
  '#fefefe',
  '#fffbea',
  '#000000',
  '#0a0a0a',
  '#020617',
  '#00ff00',
  'oklch(70% 0.37 150)',
  'oklch(99% 0.02 90)',
  'oklch(8% 0.05 300)',
]

describe('live and Shopify outputs', () => {
  it('share the palette code, so the tests below cover both', () => {
    for (const input of ['#223859', '#777777', 'oklch(70% 0.37 150)']) {
      for (const options of [{}, { plain: true, semantic: true }]) {
        const palette = (text: string) => text.slice(text.search(/\/\* Your (Tailwind CSS file|stylesheet)/))
        expect(palette(live(input, options).text)).toBe(palette(shopify(input, options).text))
      }
    }
  })

  it('rebuilds the palette in CSS from the input color', () => {
    for (const input of INPUTS) {
      const { text, palette } = shopify(input)
      expectRoundTrip(text, palette.curve, parseColor(input)!)
      // And gives generatePalette's own colors
      const live = liveShades(text)
      for (const { shade, color } of palette.shades) expectSameColor(evaluate(live.get(shade)!, parseColor(input)!), color)
    }
  })

  it('follows any merchant color with the curve picked for the design color', () => {
    const merchants = [...INPUTS.filter((_, index) => index % 5 === 0), '#1f6f43', '#00ff00', '#ffffff', '#000000']
    for (const design of INPUTS.filter((_, index) => index % 3 === 0)) {
      const { text, palette } = shopify(design)
      for (const merchant of merchants) expectRoundTrip(text, palette.curve, parseColor(merchant)!)
    }
  })

  it('follows every lightness, chroma and hue', () => {
    for (const design of ['#223859', '#db4d53', '#777777', '#fde68a', '#020617']) {
      const { text, palette } = shopify(design)
      for (let l = 0; l <= 1; l += 0.025) {
        for (const [c, h] of [[0, undefined], [0.02, 40], [0.15, 200], [0.35, 320]] as const) {
          expectRoundTrip(text, palette.curve, { l, c, h })
        }
      }
    }
  })

  it('makes the fixture palette for #223859', () => {
    const { text, palette, family, anchor } = shopify('#223859', { format: 'hex' })
    const scale = '#f7fafd #eef4fa #dce5f2 #c1d1e5 #839cbf #546d93 #374d6f #223859 #122340 #091331 #01041f'.split(' ')
    expect([family, anchor]).toEqual(['slate', 700])
    expect(palette.shades.map(({ color }) => formatColor(color, 'hex'))).toEqual(scale)

    const input = parseColor('#223859')!
    const live = liveShades(text)
    expect(live.get(700)).toBe('var(--color-primary, #223859)')
    expect([...live.values()].map((value) => formatColor(evaluate(value, input), 'hex'))).toEqual(scale)
  })

  it('moves every shade with the merchant color', () => {
    const { text } = shopify('#223859')
    const live = liveShades(text)
    const green = parseColor('#1f6f43')!
    // Browsers clip colors outside sRGB channel by channel (green-900 here)
    const toRgb = converter('rgb')
    const hex = (shade: number) => {
      const { r, g, b } = toRgb({ mode: 'oklch', ...evaluate(live.get(shade)!, green) })
      const clip = (value: number) => Math.min(1, Math.max(0, value))
      return formatHex({ mode: 'rgb', r: clip(r), g: clip(g), b: clip(b) })
    }
    expect(hex(700)).toBe('#1f6f43')
    expect(hex(500)).toBe('#4d9d6c')
    expect(hex(900)).toBe('#002d12')
  })

  it('caps the chroma at 3 times the anchor', () => {
    const { text, palette } = shopify('#223859')
    const live = liveShades(text)
    const vivid = parseColor('#00ff00')!
    const [, anchorC] = palette.curve.reference
    expect(vivid.c).toBeGreaterThan(3 * anchorC)
    for (const { shade, reference } of palette.curve.shades) {
      if (shade === 700) continue
      expect(live.get(shade)).toContain(`min(c, ${Number((3 * anchorC).toFixed(4))})`)
      expect(evaluate(live.get(shade)!, vivid).c).toBeCloseTo(reference[1] * 3, 3)
    }
  })

  it('fades the chroma of a gray anchor instead of scaling it', () => {
    const { text, palette } = shopify('#777777')
    expect(palette.curve.gray).toBe(true)
    const live = liveShades(text)
    expect(live.get(50)).toContain(' 0 ')
    expect(live.get(400)).toMatch(/calc\(c \* [\d.]+\)/)
  })

  it('writes the four parts, each with the file it goes in', () => {
    const { text } = shopify('#223859')
    expect(text).toContain('/* config/settings_schema.json')
    expect(text).toContain('"type": "color",\n  "id": "color_primary",\n  "label": "Primary",\n  "default": "#223859"')
    expect(text).toContain('/* snippets/css-variables.liquid')
    expect(text).toContain('--color-primary: {{ settings.color_primary }};')
    expect(text).toMatch(/@theme \{\n {2}--color-primary: #223859;\n {2}--color-primary-50: oklch\(/)
    expect(text).toContain('@supports (color: oklch(from red l c h)) {\n  :root {\n    --color-primary-50: oklch(from')
    // Liquid color filters break the theme editor's live preview
    expect(text).not.toMatch(/\| *color_/)
  })

  it('uses underscores in the setting id and words in its label', () => {
    const { text } = createPalette({ color: '#223859', name: 'brand-dark', output: 'shopify' })
    expect(text).toContain('"id": "color_brand_dark"')
    expect(text).toContain('"label": "Brand Dark"')
    expect(text).toContain('--color-brand-dark: {{ settings.color_brand_dark }};')
    expect(liveShades(text, 'brand-dark').get(500)).toMatch(/^oklch\(from var\(--color-brand-dark, #223859\) /)

    // Valid names with a trailing or doubled dash
    expect(createPalette({ color: '#223859', name: 'brand-', output: 'shopify' }).text).toContain('"label": "Brand"')
    expect(createPalette({ color: '#223859', name: 'brand--dark', output: 'shopify' }).text).toContain(
      '"label": "Brand Dark"',
    )
  })

  it('writes a plain :root block for themes without Tailwind', () => {
    const result = shopify('#223859', { plain: true })
    expect(result.text).not.toContain('@theme')
    expect(result.text).toMatch(/\n:root \{\n {2}--color-primary-50: oklch\(/)
    expect(result.text).toContain('@supports')
  })

  it('adds a foreground color with --semantic', () => {
    expect(shopify('#223859', { semantic: true }).text).toContain('--color-primary-foreground: #fff;')
    expect(shopify('#fde68a', { semantic: true }).text).toContain(
      '--color-primary-foreground: var(--color-primary-950);',
    )
    expect(shopify('#223859').text).not.toContain('foreground')
    // Its own @supports, so browsers with relative colors but no pow() keep the static foreground
    const text = shopify('#223859', { semantic: true }).text
    const guard = '@supports (color: oklch(from red calc(pow(l, 1) * cos(h * 1deg)) c h)) {\n  :root {\n    --color-primary-foreground: oklch(from'
    expect(text).toContain(guard)
    expect(text.slice(text.indexOf('@supports'), text.indexOf(guard))).not.toContain('--color-primary-foreground:')
    // #020617 is slate-950 itself, so the dark option is black
    expect(shopify('#020617').anchor).toBe(950)
    expect(shopify('#020617', { semantic: true }).text).toContain('--color-primary-foreground: #fff;')
  })

  it('switches the foreground with the merchant color: white on dark, the darkest shade on light', () => {
    const hex = (color: Color) => formatColor(color, 'hex')
    let worst = Infinity
    for (const design of INPUTS.filter((_, index) => index % 3 === 0)) {
      const { text, palette } = shopify(design, { semantic: true })
      const threshold = foregroundThreshold(palette)
      const foreground = liveForeground(text)
      const merchants = [
        ...INPUTS.map((input) => parseColor(input)!),
        ...Array.from({ length: 400 }, (_, i) => ({ l: (i % 41) / 40, c: ((i * 7) % 30) / 100, h: (i * 37) % 360 })),
      ]
      // Merchant colors come from a color picker, so they are sRGB (WCAG contrast is only defined there)
      for (const merchant of merchants.filter((color) => displayable({ mode: 'oklch', ...color }))) {
        const luminance = wcagLuminance(hex(merchant))
        if (Math.abs(luminance - threshold) < 0.002) continue
        // Black when the design color is the darkest shade itself
        const dark = palette.anchor === 950 ? { l: 0, c: 0, h: undefined } : applyCurve(merchant, palette.curve).at(-1)!.color
        const darker = luminance > threshold
        expectSameColor(evaluate(foreground, merchant), darker ? dark : { l: 1, c: 0, h: undefined })

        // The threshold uses the design color's darkest shade, so the pick can only be off by a hair
        const onWhite = wcagContrast(hex(merchant), '#ffffff')
        const onDarkest = wcagContrast(hex(merchant), hex(dark))
        worst = Math.min(worst, (darker ? onDarkest : onWhite) / Math.max(onWhite, onDarkest))
      }
    }
    expect(worst).toBeGreaterThan(0.97)
  })

  it('switches where white and the darkest shade contrast the same', () => {
    for (const design of ['#223859', '#db4d53', '#fde68a', '#777777']) {
      const { palette } = shopify(design, { semantic: true })
      const darkest = formatColor(palette.shades.at(-1)!.color, 'hex')
      // A gray right at the threshold luminance
      const y = foregroundThreshold(palette)
      const gray = formatHex({ mode: 'lrgb', r: y, g: y, b: y })
      const onWhite = wcagContrast(gray, '#ffffff')
      expect(wcagContrast(gray, darkest) / onWhite).toBeCloseTo(1, 1)
    }
  })

  it('writes the default color for the live output', () => {
    // In @theme, so it also makes a bg-primary utility, and in every formula's var() fallback
    expect(live('#223859').text).toMatch(/\n@theme \{\n {2}--color-primary: #223859;\n {2}--color-primary-50: /)
    expect(live('#223859').text).not.toContain('@layer')
    // Hex can't hold colors outside sRGB
    expect(live('oklch(70% 0.37 150)').text).toMatch(/--color-primary: oklch\([^)]+\);/)
    // Without Tailwind, a :root default could override the runtime value, so it is only the fallback
    const plain = live('#223859', { plain: true }).text
    expect(plain).not.toMatch(/--color-primary: /)
    expect(liveShades(plain).get(700)).toBe('var(--color-primary, #223859)')
  })

  it('falls back to the default color when nothing sets the variable', () => {
    for (const input of ['#223859', '#db4d53', '#777777', 'oklch(70% 0.37 150)']) {
      for (const output of [live, shopify]) {
        for (const options of [{ semantic: true }, { semantic: true, plain: true }]) {
          const { text, palette } = output(input, options)
          const values = liveShades(text)
          expect(values.size).toBe(palette.shades.length)
          // Each formula alone gives the default palette, so pasting part of the code can't break it
          for (const { shade, color } of palette.shades) expectSameColor(evaluate(values.get(shade)!, undefined), color)
          expect(liveForeground(text)).toContain('var(--color-primary, ')
        }
      }
    }
    expect(live('#223859').text).not.toContain('settings')
    expect(live('#223859', { plain: true }).text).not.toContain('@theme')
  })

  it('only works with Tailwind v4', () => {
    expect(() => shopify('#223859', { version: 3 })).toThrow('the shopify output needs Tailwind CSS v4')
    expect(() => live('#223859', { version: 2 })).toThrow('the live output needs Tailwind CSS v4')
  })

  it('keeps generatePalette and the other outputs as they were', () => {
    const palette = generatePalette(parseColor('#223859')!, PALETTE_V4)
    expect(shopify('#223859').shades).toEqual(createPalette({ color: '#223859', name: 'primary' }).shades)
    expect(palette.shades.find(({ shade }) => shade === 700)!.color).toEqual(parseColor('#223859'))
  })
})

describe('runCli -o live and -o shopify', () => {
  it('prints the live palette code', () => {
    const { code, stdout } = runCli(['#223859', '-n', 'primary', '-o', 'live', '--semantic'])
    expect(code).toBe(0)
    expect(stdout).toMatchSnapshot()
  })

  it('prints the Shopify theme code', () => {
    const { code, stdout, stderr } = runCli(['#223859', '-n', 'primary', '-o', 'shopify'])
    expect(code).toBe(0)
    expect(stderr).toBe('primary-50 to primary-950 (Tailwind v4), your color is primary-700\n')
    expect(stdout).toMatchSnapshot()
  })

  it('reads --plain and --semantic', () => {
    expect(runCli(['#223859', '-n', 'primary', '-o', 'shopify', '--plain', '--semantic']).stdout).toBe(
      `${shopify('#223859', { plain: true, semantic: true }).text}\n`,
    )
  })

  it.each([
    [['#223859', '-o', 'shopify', '-t', '3'], 'the shopify output needs Tailwind CSS v4'],
    [['#223859', '-o', 'live', '-t', '1'], 'the live output needs Tailwind CSS v4'],
    [['#223859', '--plain'], '--plain only works with --output live or shopify'],
    [['#223859', '-o', 'theme', '--semantic'], '--semantic only works with --output live or shopify'],
  ])('fails on %j', (args, message) => {
    const { code, stderr } = runCli(args)
    expect(code).toBe(1)
    expect(stderr).toContain(message)
  })
})

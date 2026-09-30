import { describe, expect, it } from 'vitest'
import { formatPalette, isInsideThemeBlock, isValidName, outputForLanguage } from '../src/format'
import { generatePalette, parseColor } from '../src/palette'
import { VERSIONS, versionFromCss, versionFromPackageJson } from '../src/versions'

const palette = generatePalette(parseColor('#3b82f6')!, VERSIONS[4].reference)
const base = { name: 'brand', palette, colorFormat: 'hex' as const, indent: '  ', baseIndent: '' }

describe('formatPalette', () => {
  it('writes a v4 @theme block', () => {
    const text = formatPalette({ ...base, output: 'theme' })
    const lines = text.split('\n')
    expect(lines[0]).toBe('@theme {')
    expect(lines[1]).toMatch(/^ {2}--color-brand-50: #[0-9a-f]{6};$/)
    expect(lines.at(-2)).toMatch(/^ {2}--color-brand-950: /)
    expect(lines.at(-1)).toBe('}')
    expect(lines).toHaveLength(13)
  })

  it('writes only the variables inside an existing @theme block', () => {
    const text = formatPalette({ ...base, output: 'theme', baseIndent: '  ', insideTheme: true })
    const lines = text.split('\n')
    expect(lines).toHaveLength(11)
    expect(lines[0]).toMatch(/^--color-brand-50: /)
    expect(lines[1]).toMatch(/^ {2}--color-brand-100: /)
  })

  it('writes a config object and quotes names with dashes', () => {
    const text = formatPalette({ ...base, name: 'brand-blue', output: 'config', baseIndent: '    ' })
    const lines = text.split('\n')
    expect(lines[0]).toBe("'brand-blue': {")
    expect(lines[1]).toMatch(/^ {6}50: '#[0-9a-f]{6}',$/)
    expect(lines.at(-1)).toBe('    },')
  })

  it('writes plain CSS variables', () => {
    const text = formatPalette({ ...base, output: 'cssVariables' })
    expect(text.split('\n')[0]).toMatch(/^--brand-50: #[0-9a-f]{6};$/)
  })
})

describe('isInsideThemeBlock', () => {
  it('detects an open @theme block', () => {
    expect(isInsideThemeBlock('@import "tailwindcss";\n@theme {\n  ')).toBe(true)
    expect(isInsideThemeBlock('@theme inline {\n  --font-sans: x;\n  ')).toBe(true)
  })

  it('ignores closed blocks and other rules', () => {
    expect(isInsideThemeBlock('@theme {\n}\n.btn {\n  ')).toBe(false)
    expect(isInsideThemeBlock('.btn {\n  ')).toBe(false)
  })
})

describe('outputForLanguage', () => {
  it('uses @theme for CSS with v4 and CSS variables before v4', () => {
    expect(outputForLanguage('css', VERSIONS[4])).toBe('theme')
    expect(outputForLanguage('scss', VERSIONS[3])).toBe('cssVariables')
  })

  it('uses a config object for JS and TS', () => {
    expect(outputForLanguage('javascript', VERSIONS[3])).toBe('config')
    expect(outputForLanguage('typescript', VERSIONS[4])).toBe('config')
  })

  it('asks for other files', () => {
    expect(outputForLanguage('markdown', VERSIONS[4])).toBeUndefined()
  })
})

describe('isValidName', () => {
  it.each(['brand', 'brand-blue', 'primary2'])('accepts %s', (name) => {
    expect(isValidName(name)).toBe(true)
  })

  it.each(['', '2brand', 'brand blue', 'brand.500'])('rejects %j', (name) => {
    expect(isValidName(name)).toBe(false)
  })
})

describe('versionFromPackageJson', () => {
  it.each([
    ['{"devDependencies":{"tailwindcss":"^4.1.0"}}', 4],
    ['{"dependencies":{"tailwindcss":"~3.4.1"}}', 3],
    ['{"dependencies":{"tailwindcss":"2.2.19"}}', 2],
    ['{"dependencies":{"tailwindcss":"^1.9.6"}}', 1],
    ['{"dependencies":{"tailwindcss":"^5.0.0"}}', 4],
  ])('reads %s', (json, version) => {
    expect(versionFromPackageJson(json)).toBe(version)
  })

  it('returns undefined without tailwindcss or with invalid JSON', () => {
    expect(versionFromPackageJson('{"dependencies":{"react":"^19.0.0"}}')).toBeUndefined()
    expect(versionFromPackageJson('{"dependencies":{"tailwindcss":"latest"}}')).toBeUndefined()
    expect(versionFromPackageJson('not json')).toBeUndefined()
  })
})

describe('versionFromCss', () => {
  it.each([
    ['@import "tailwindcss";', 4],
    ["@import 'tailwindcss/theme.css' layer(theme);", 4],
    ['@theme {\n  --color-brand-500: red;\n}', 4],
    ['@utility tab-4 {\n  tab-size: 4;\n}', 4],
    ['@plugin "@tailwindcss/typography";', 4],
    ['@custom-variant dark (&:where(.dark, .dark *));', 4],
    ['@tailwind base;\n@tailwind components;\n@tailwind utilities;', 3],
    ['@tailwind base;\n@variants hover {\n  .btn {}\n}', 2],
    ['@responsive {\n  .box {}\n}', 2],
  ])('reads %j', (css, version) => {
    expect(versionFromCss(css)).toBe(version)
  })

  it('ignores CSS without Tailwind directives', () => {
    expect(versionFromCss('.btn {\n  color: red;\n}')).toBeUndefined()
    expect(versionFromCss('@import "./reset.css";\n@layer base {}')).toBeUndefined()
  })

  it('ignores directives in comments', () => {
    expect(versionFromCss('/* @import "tailwindcss"; */\n@tailwind base;')).toBe(3)
    expect(versionFromCss('/*\n@theme {\n}\n*/')).toBeUndefined()
  })
})

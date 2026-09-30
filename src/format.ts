import { formatColor, type ColorFormat, type Palette } from './palette'
import type { Output, VersionProfile } from './versions'

export type FormatOptions = {
  name: string
  palette: Palette
  output: Output
  colorFormat: ColorFormat
  /** One level of indentation, e.g. "  " or "\t" */
  indent: string
  /** Indentation of the line the palette is inserted on */
  baseIndent: string
  /** True when the cursor is already inside an `@theme { ... }` block */
  insideTheme?: boolean
}

const CSS_LANGUAGES = ['css', 'scss', 'sass', 'less', 'postcss', 'tailwindcss', 'vue-postcss']
const JS_LANGUAGES = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'json', 'jsonc']

/** Picks the output for a file type, or undefined when the user should choose */
export function outputForLanguage(languageId: string, profile: VersionProfile): Output | undefined {
  if (CSS_LANGUAGES.includes(languageId)) return profile.cssOutput
  if (JS_LANGUAGES.includes(languageId)) return 'config'
  return undefined
}

/** Valid color names: letters, digits and dashes, starting with a letter */
export function isValidName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/i.test(name)
}

/** True when `textBefore` (the document up to the cursor) ends inside an open `@theme` block */
export function isInsideThemeBlock(textBefore: string): boolean {
  const start = textBefore.lastIndexOf('@theme')
  const open = textBefore.indexOf('{', start)
  if (start === -1 || open === -1) return false

  // Follow the @theme block's own braces; once it closes, later blocks don't count
  let depth = 1
  for (const char of textBefore.slice(open + 1)) {
    if (char === '{') depth++
    else if (char === '}' && --depth === 0) return false
  }
  return true
}

/**
 * Builds the text that replaces the selected color. The first line has no
 * indentation (it starts where the selection was); the others use `baseIndent`.
 */
export function formatPalette(options: FormatOptions): string {
  const { name, palette, output, colorFormat, indent, baseIndent, insideTheme } = options
  const entries = palette.shades.map(({ shade, color }) => ({
    shade,
    value: formatColor(color, colorFormat),
  }))
  const newline = `\n${baseIndent}`

  switch (output) {
    case 'theme': {
      const lines = entries.map(({ shade, value }) => `--color-${name}-${shade}: ${value};`)
      if (insideTheme) return lines.join(newline)
      return ['@theme {', ...lines.map((line) => indent + line), '}'].join(newline)
    }

    case 'cssVariables':
      return entries.map(({ shade, value }) => `--${name}-${shade}: ${value};`).join(newline)

    case 'config': {
      // Names with dashes need quotes as object keys
      const key = /^[a-z_$][\w$]*$/i.test(name) ? name : `'${name}'`
      const lines = entries.map(({ shade, value }) => `${indent}${shade}: '${value}',`)
      return [`${key}: {`, ...lines, '},'].join(newline)
    }
  }
}

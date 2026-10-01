import { formatPalette, isValidName } from './format.js'
import { formatColor, generatePalette, parseColor, type ColorFormat, type Palette } from './palette.js'
import { LATEST_VERSION, VERSIONS, type Output, type TailwindVersion } from './versions.js'

export type CreateOptions = {
  /** Any CSS color: hex, rgb(), hsl(), oklch(), a named color, ... */
  color: string
  /** Color name, e.g. "brand". Defaults to the closest Tailwind color */
  name?: string
  /** Tailwind CSS version. Defaults to the latest */
  version?: TailwindVersion
  /** Defaults to OKLCH for v4 and hex for older versions */
  format?: ColorFormat
  /** Defaults to an @theme block for v4 and a config object for older versions */
  output?: Output
  /** One level of indentation. Defaults to two spaces */
  indent?: string
}

export type CreateResult = {
  /** The palette as code, ready to paste */
  text: string
  name: string
  version: TailwindVersion
  format: ColorFormat
  output: Output
  /** Shade where the input color sits unchanged, e.g. 500 */
  anchor: number
  /** Closest Tailwind color, e.g. "red" */
  family: string
  /** Each shade's color in `format`, lightest first */
  shades: { shade: number; value: string }[]
  /** True when `name` is a default Tailwind color, so the code replaces Tailwind's palette */
  replacesTailwindColor: boolean
  palette: Palette
}

/** Output used when none is given: where colors usually live in that version */
export function defaultOutput(version: TailwindVersion): Output {
  return version === 4 ? 'theme' : 'config'
}

/**
 * Generates a palette from `color` and formats it as code, the same way the
 * editor extension writes it at the start of a line. Throws on an invalid
 * color or name.
 */
export function createPalette(options: CreateOptions): CreateResult {
  const color = parseColor(options.color)
  if (!color) throw new Error(`"${options.color}" is not a valid CSS color`)

  const version = options.version ?? LATEST_VERSION
  const profile = VERSIONS[version]
  if (!profile) throw new Error(`Tailwind CSS v${version} is not supported (use 4, 3, 2 or 1)`)

  const palette = generatePalette(color, profile.reference)
  const name = options.name ?? palette.family
  if (!isValidName(name)) {
    throw new Error(`"${name}" is not a valid name (use letters, digits and dashes, starting with a letter)`)
  }

  const format = options.format ?? profile.colorFormat
  const output = options.output ?? defaultOutput(version)
  const text = formatPalette({
    name,
    palette,
    output,
    colorFormat: format,
    indent: options.indent ?? '  ',
    baseIndent: '',
  })

  return {
    text,
    name,
    version,
    format,
    output,
    anchor: palette.anchor,
    family: palette.family,
    shades: palette.shades.map(({ shade, color }) => ({ shade, value: formatColor(color, format) })),
    replacesTailwindColor: Object.hasOwn(profile.reference.colors, name),
    palette,
  }
}

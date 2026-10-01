import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { createPalette } from './create.js'
import type { ColorFormat } from './palette.js'
import type { Output, TailwindVersion } from './versions.js'

const HELP = `Usage: tailwindshades <color> [options]

Generates a Tailwind CSS palette (50-950) from any CSS color.

Options:
  -n, --name <name>        Color name, e.g. brand (default: closest Tailwind color)
  -t, --tailwind <4|3|2|1> Tailwind CSS version (default: 4)
  -f, --format <format>    oklch, hex or rgb (default: oklch for v4, hex for older)
  -o, --output <output>    theme, config or css (default: theme for v4, config for older)
  -h, --help               Show this help
  -v, --version            Show the version

Examples:
  npx tailwindshades "#db4d53" --name brand
  npx tailwindshades "oklch(62% 0.2 250)" -t 3 -o config
  npx tailwindshades db4d53 -o css >> colors.css
`

const VERSIONS = ['4', '3', '2', '1']
const FORMATS: ColorFormat[] = ['oklch', 'hex', 'rgb']
const OUTPUTS: Record<string, Output> = { theme: 'theme', config: 'config', css: 'cssVariables' }

export type CliResult = { code: number; stdout: string; stderr: string }

function choice(option: string, value: string | undefined, allowed: string[]) {
  if (value === undefined || allowed.includes(value)) return value
  throw new Error(`--${option} must be one of: ${allowed.join(', ')}`)
}

/** Runs the CLI with `args` (without node and the script path) */
export function runCli(args: string[]): CliResult {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        name: { type: 'string', short: 'n' },
        tailwind: { type: 'string', short: 't' },
        format: { type: 'string', short: 'f' },
        output: { type: 'string', short: 'o' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    })

    if (values.help) return { code: 0, stdout: HELP, stderr: '' }
    if (values.version) {
      const { version } = createRequire(import.meta.url)('../package.json')
      return { code: 0, stdout: `${version}\n`, stderr: '' }
    }
    if (positionals.length !== 1) throw new Error('give exactly one color, e.g. "#db4d53"')

    // `#` starts a comment in most shells, so accept hex without it
    let [color] = positionals
    if (/^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) color = `#${color}`

    const tailwind = choice('tailwind', values.tailwind, VERSIONS)
    const format = choice('format', values.format, FORMATS)
    const output = choice('output', values.output, Object.keys(OUTPUTS))

    const result = createPalette({
      color,
      name: values.name,
      version: tailwind ? (Number(tailwind) as TailwindVersion) : undefined,
      format: format as ColorFormat | undefined,
      output: output ? OUTPUTS[output] : undefined,
    })

    const { name, shades, version, anchor } = result
    const range = `${name}-${shades[0].shade} to ${name}-${shades.at(-1)!.shade}`
    return {
      code: 0,
      stdout: `${result.text}\n`,
      // Goes to stderr so `> file.css` gets only the palette
      stderr: `${range} (Tailwind v${version}), your color is ${name}-${anchor}\n`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { code: 1, stdout: '', stderr: `tailwindshades: ${message}\nRun "tailwindshades --help" for usage.\n` }
  }
}

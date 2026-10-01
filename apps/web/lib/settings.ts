import type { ColorFormat, Output, TailwindVersion } from 'tailwindshades-cli'

export type Settings = {
  color: string
  name: string
  version: TailwindVersion
  format: ColorFormat | 'auto'
  output: Output | 'auto'
}

// The default is the teal of the logo (Tailwind v1 teal-700)
export const DEFAULTS: Settings = { color: '#2c7a7b', name: 'brand', version: 4, format: 'auto', output: 'auto' }

const VERSIONS = ['4', '3', '2', '1']
const FORMATS = ['oklch', 'hex', 'rgb']
// Same short names as the CLI: css means plain CSS variables
const OUTPUTS: Record<string, Output> = { theme: 'theme', config: 'config', css: 'cssVariables' }

/** Reads settings from a query string like `?color=db4d53&name=brand&v=3`, ignoring bad values */
export function parseSettings(search: string): Settings {
  const params = new URLSearchParams(search)
  const settings = { ...DEFAULTS }

  const color = params.get('color')
  // `#` can't be in a query value without escaping, so hex comes without it
  if (color) settings.color = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ? `#${color}` : color

  const name = params.get('name')
  if (name !== null) settings.name = name

  const version = params.get('v')
  if (version && VERSIONS.includes(version)) settings.version = Number(version) as TailwindVersion

  const format = params.get('format')
  if (format && FORMATS.includes(format)) settings.format = format as ColorFormat

  const output = params.get('output')
  if (output && output in OUTPUTS) settings.output = OUTPUTS[output]

  return settings
}

/** The query string for `settings`, leaving out defaults so links stay short */
export function toSearch(settings: Settings): string {
  const params = new URLSearchParams()
  if (settings.color !== DEFAULTS.color) params.set('color', settings.color.replace(/^#/, ''))
  if (settings.name !== DEFAULTS.name) params.set('name', settings.name)
  if (settings.version !== DEFAULTS.version) params.set('v', String(settings.version))
  if (settings.format !== 'auto') params.set('format', settings.format)
  if (settings.output !== 'auto') {
    params.set('output', Object.keys(OUTPUTS).find((key) => OUTPUTS[key] === settings.output)!)
  }
  const search = params.toString()
  return search ? `?${search}` : ''
}

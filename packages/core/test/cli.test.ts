import { execFileSync } from 'node:child_process'
import packageJson from '../package.json'
import { beforeAll, describe, expect, it } from 'vitest'
import { runCli } from '../src/cli'
import { createPalette } from '../src/create'
import { formatPalette } from '../src/format'
import { generatePalette, parseColor } from '../src/palette'
import { VERSIONS } from '../src/versions'

describe('createPalette', () => {
  it('keeps the input color at its best-fit shade', () => {
    const result = createPalette({ color: '#db4d53', name: 'brand' })
    expect(result).toMatchObject({ version: 4, format: 'oklch', output: 'theme', family: 'red', anchor: 500 })
    expect(result.shades).toHaveLength(11)
  })

  it('writes the same text as the extension at the start of a line', () => {
    const palette = generatePalette(parseColor('#3b82f6')!, VERSIONS[3].reference)
    const extension = formatPalette({
      name: 'brand',
      palette,
      output: 'config',
      colorFormat: 'hex',
      indent: '  ',
      baseIndent: '',
    })
    expect(createPalette({ color: '#3b82f6', name: 'brand', version: 3 }).text).toBe(extension)
  })

  it('uses the closest Tailwind color as the default name', () => {
    expect(createPalette({ color: '#3b82f6' }).name).toBe('blue')
  })

  it('uses hex and a config object for older versions', () => {
    const result = createPalette({ color: '#3b82f6', version: 2 })
    expect(result).toMatchObject({ format: 'hex', output: 'config' })
    expect(result.shades.map(({ shade }) => shade)).not.toContain(950)
  })

  it('throws on an invalid color or name', () => {
    expect(() => createPalette({ color: 'nope' })).toThrow('not a valid CSS color')
    expect(() => createPalette({ color: '#fff', name: '1st' })).toThrow('not a valid name')
  })
})

describe('runCli', () => {
  it('prints the palette to stdout and a summary to stderr', () => {
    const { code, stdout, stderr } = runCli(['#db4d53', '--name', 'brand'])
    expect(code).toBe(0)
    expect(stdout).toBe(`${createPalette({ color: '#db4d53', name: 'brand' }).text}\n`)
    expect(stderr).toBe('brand-50 to brand-950 (Tailwind v4), your color is brand-500\n')
  })

  it('reads the version, format and output options', () => {
    const { stdout } = runCli(['#3b82f6', '-n', 'brand', '-t', '1', '-f', 'rgb', '-o', 'css'])
    const lines = stdout.trimEnd().split('\n')
    expect(lines[0]).toMatch(/^--brand-100: rgb\(\d+, \d+, \d+\);$/)
    expect(lines).toHaveLength(9)
  })

  it('accepts hex without #', () => {
    expect(runCli(['db4d53']).stdout).toBe(runCli(['#db4d53']).stdout)
  })

  it('shows help and its version', () => {
    expect(runCli(['--help']).stdout).toMatch(/^Usage: tailwindshades <color>/)
    expect(runCli(['-v']).stdout).toMatch(/^\d+\.\d+\.\d+/)
  })

  it.each([
    [[], 'give exactly one color'],
    [['#fff', '#000'], 'give exactly one color'],
    [['nope'], 'not a valid CSS color'],
    [['#fff', '-t', '5'], '--tailwind must be one of: 4, 3, 2, 1'],
    [['#fff', '-o', 'scss'], '--output must be one of: theme, config, css'],
    [['#fff', '--nope'], "Unknown option '--nope'"],
  ])('fails on %j', (args, message) => {
    const { code, stdout, stderr } = runCli(args)
    expect(code).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain(message)
  })
})

describe('bin', () => {
  const cwd = new URL('..', import.meta.url)
  // Tests the real bundle: shebang, chunks and the package.json lookup
  beforeAll(() => execFileSync('node', ['scripts/build.mjs'], { cwd, stdio: 'ignore' }))

  it('runs from the command line', () => {
    const run = (args: string[]) =>
      execFileSync('./dist/bin.js', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
    expect(run(['#db4d53', '-n', 'brand'])).toBe(runCli(['#db4d53', '-n', 'brand']).stdout)
    expect(run(['--version'])).toBe(`${packageJson.version}\n`)
  })
})

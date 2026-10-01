import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPalette } from '../../core/src/create'

const root = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const client = new Client({ name: 'test', version: '1.0.0' })

// Runs the real server (built by test/setup.ts) over stdio, the way an AI agent starts it with npx
beforeAll(() => client.connect(new StdioClientTransport({ command: 'node', args: [root('mcp/dist/bin.js')] })))

afterAll(() => client.close())

const call = (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args })

describe('tailwindshades-mcp', () => {
  it('tells agents when to use the tools', () => {
    expect(client.getInstructions()).toContain('call generate_palette')
  })

  it('lists the tools as read-only', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual(['closest_tailwind_color', 'generate_palette'])
    for (const tool of tools) {
      expect(tool.description).toBeTruthy()
      expect(tool.outputSchema).toBeDefined()
      expect(tool.annotations?.readOnlyHint).toBe(true)
    }
  })

  describe('generate_palette', () => {
    it('returns the same code as the CLI and the extension', async () => {
      const result = await call('generate_palette', { color: '#db4d53', name: 'brand' })
      const expected = createPalette({ color: '#db4d53', name: 'brand' })
      expect(result.isError).toBeFalsy()
      expect(result.structuredContent).toMatchObject({
        code: expected.text,
        name: 'brand',
        tailwindVersion: 4,
        format: 'oklch',
        output: 'theme',
        inputShade: 500,
        closestTailwindColor: 'red',
      })
      expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining(expected.text) })
      expect(result.content[0]).toMatchObject({ text: expect.stringContaining('The input color is brand-500.') })
    })

    it('warns when the name replaces a default Tailwind color', async () => {
      const result = await call('generate_palette', { color: '#db4d53' })
      expect(result.structuredContent).toMatchObject({ name: 'red', replacesTailwindColor: true })
      expect(result.content[0]).toMatchObject({ text: expect.stringContaining("replaces Tailwind's own red palette") })

      const named = await call('generate_palette', { color: '#db4d53', name: 'brand' })
      expect(named.structuredContent).toMatchObject({ replacesTailwindColor: false })
      expect(named.content[0]).toMatchObject({ text: expect.not.stringContaining('Warning') })

      const builtIn = await call('generate_palette', { color: '#db4d53', name: 'constructor' })
      expect(builtIn.structuredContent).toMatchObject({ replacesTailwindColor: false })
    })

    it('keeps the input color exactly at its shade', async () => {
      const result = await call('generate_palette', { color: '#db4d53', format: 'hex' })
      const { shades } = result.structuredContent as { shades: { shade: number; value: string }[] }
      expect(shades.find(({ shade }) => shade === 500)?.value).toBe('#db4d53')
    })

    it('reads the version, format and output options', async () => {
      const result = await call('generate_palette', {
        color: '#3b82f6',
        name: 'brand',
        tailwindVersion: 2,
        format: 'rgb',
        output: 'css',
      })
      const { code, shades, output } = result.structuredContent as { code: string; shades: unknown[]; output: string }
      expect(output).toBe('css')
      expect(shades).toHaveLength(10)
      expect(code.split('\n')[0]).toMatch(/^--brand-50: rgb\(\d+, \d+, \d+\);$/)
    })

    it.each([
      [{ color: 'nope' }, 'not a valid CSS color'],
      [{ color: '#fff', name: '1st' }, 'letters, digits and dashes'],
      [{ color: '#fff', tailwindVersion: 5 }, 'tailwindVersion'],
      [{ color: '#fff', output: 'scss' }, 'output'],
    ])('returns an error for %j', async (args, message) => {
      const result = await call('generate_palette', args)
      expect(result.isError).toBe(true)
      expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining(message) })
    })
  })

  describe('closest_tailwind_color', () => {
    it('finds a stock Tailwind color', async () => {
      const result = await call('closest_tailwind_color', { color: 'oklch(62.3% 0.214 259.815)' })
      expect(result.structuredContent).toEqual({
        name: 'blue',
        shade: 500,
        className: 'blue-500',
        tailwindValue: { oklch: 'oklch(62.3% 0.214 259.815)', hex: '#2b7fff' },
        input: { oklch: 'oklch(62.3% 0.214 259.815)', hex: '#2b7fff' },
        distance: 0,
        visiblyDifferent: false,
        tailwindVersion: 4,
      })
      expect(result.content[0]).toMatchObject({ text: expect.stringContaining('good replacement') })
    })

    it('finds the closest shade of a custom color', async () => {
      const result = await call('closest_tailwind_color', { color: '#db4d53' })
      expect(result.structuredContent).toMatchObject({
        className: 'red-500',
        tailwindValue: { hex: '#fb2c36' },
        input: { hex: '#db4d53' },
        visiblyDifferent: true,
      })
      expect(result.content[0]).toMatchObject({ text: expect.stringContaining('use generate_palette') })
    })

    it('matches a tinted gray by its hue', async () => {
      // A warm gray: stone is warm, zinc is cool
      const result = await call('closest_tailwind_color', { color: 'oklch(55% 0.018 60)' })
      expect(result.structuredContent).toMatchObject({ className: 'stone-500', visiblyDifferent: false })
      const cool = await call('closest_tailwind_color', { color: 'oklch(55% 0.018 250)' })
      expect(cool.structuredContent).toMatchObject({ className: 'gray-500' })
    })

    it('uses the older palette for older versions', async () => {
      const result = await call('closest_tailwind_color', { color: '#3b82f6', tailwindVersion: 3 })
      expect(result.structuredContent).toMatchObject({
        className: 'blue-500',
        tailwindValue: { hex: '#3b82f6' },
        tailwindVersion: 3,
      })
    })

    it('returns an error for an invalid color', async () => {
      const result = await call('closest_tailwind_color', { color: 'nope' })
      expect(result.isError).toBe(true)
    })
  })
})

import { McpServer } from '@modelcontextprotocol/server'
import {
  closestTailwindShade,
  createPalette,
  formatColor,
  parseColor,
  VERSIONS,
  type Output,
  type TailwindVersion,
} from 'tailwindshades-cli'
import * as z from 'zod'

// Set from package.json by scripts/build.mjs, so the server also works when
// bundled into another app (like the website's /mcp route)
declare const __VERSION__: string
const version = __VERSION__

const OUTPUTS: Record<'theme' | 'config' | 'css', Output> = {
  theme: 'theme',
  config: 'config',
  css: 'cssVariables',
}

const color = z
  .string()
  .describe('Any CSS color: hex (#db4d53), rgb(), hsl(), oklch() or a named color')

// Smallest color difference most people can see, in OKLab units
const VISIBLE_DIFFERENCE = 0.02

const tailwindVersion = z
  .literal([4, 3, 2, 1])
  .optional()
  .describe("The project's Tailwind CSS major version. Defaults to 4")

/** A color as a Tailwind-style OKLCH string and as hex */
function bothFormats(value: Parameters<typeof formatColor>[0]) {
  return { oklch: formatColor(value, 'oklch'), hex: formatColor(value, 'hex') }
}

/**
 * Tailwind's own value for a shade, exactly as Tailwind writes it (oklch() in
 * v4, hex before), plus the same color in the other format.
 */
function tailwindValue(version: TailwindVersion, name: string, index: number) {
  const { reference } = VERSIONS[version]
  const exact = reference.values[name][index]
  const [l, c, h] = reference.colors[name][index]
  return version === 4
    ? { oklch: exact, hex: formatColor({ l, c, h }, 'hex') }
    : { oklch: formatColor({ l, c, h }, 'oklch'), hex: exact }
}

function parse(input: string) {
  const parsed = parseColor(input)
  if (!parsed) throw new Error(`"${input}" is not a valid CSS color`)
  return parsed
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'tailwindshades', version },
    {
      // Sent to the agent when it connects, so it knows when to use the tools
      instructions:
        'Use these tools whenever you add or change a color in a Tailwind CSS project. ' +
        'Tailwind colors are palettes with shades (50-950), so utilities like bg-brand-500 and ' +
        'hover:bg-brand-600 work. Never write a single --color-* variable or invent shades by hand: ' +
        'call generate_palette and paste its code. Match tailwindVersion to the project ' +
        '(v4: @import "tailwindcss" in CSS; v3 and older: tailwind.config.js). ' +
        'To replace a hard-coded color with an existing Tailwind class, call find_closest_tailwind_color. ' +
        "For Tailwind's own default colors (e.g. the value of slate-500), call get_tailwind_palette " +
        'instead of writing them from memory.',
    },
  )

  server.registerTool(
    'generate_palette',
    {
      title: 'Generate a Tailwind palette',
      description:
        'Generates a full Tailwind CSS palette (50-950) from one color, ready to paste. ' +
        'Call it whenever you add a color to a Tailwind theme (e.g. "add a brand color #db4d53"), ' +
        'instead of writing a single variable or inventing shades. The input color stays exactly ' +
        'at its best-fit shade, and the other shades follow the closest Tailwind color, so they ' +
        "look like Tailwind's own.",
      inputSchema: z.object({
        color,
        name: z
          .string()
          .regex(/^[a-z][a-z0-9-]*$/i, 'Use letters, digits and dashes, starting with a letter')
          .optional()
          .describe(
            'Color name used in the code, e.g. "brand". Defaults to the closest Tailwind color, ' +
              "which replaces Tailwind's own palette of that name (e.g. red), so pass a name " +
              'unless that is what the user wants',
          ),
        tailwindVersion,
        format: z
          .enum(['oklch', 'hex', 'rgb'])
          .optional()
          .describe('Color format. Defaults to oklch for v4 and hex for older versions'),
        output: z
          .enum(['theme', 'config', 'css'])
          .optional()
          .describe(
            'theme: a v4 @theme block for the main CSS file. config: an object for ' +
              'theme.extend.colors in tailwind.config.js. css: plain CSS variables. ' +
              'Defaults to theme for v4 and config for older versions',
          ),
      }),
      outputSchema: z.object({
        code: z.string().describe('The palette as code, ready to paste'),
        name: z.string(),
        tailwindVersion: z.number(),
        format: z.string(),
        output: z.string(),
        inputShade: z.number().describe('Shade that holds the input color unchanged, e.g. 500'),
        closestTailwindColor: z.string().describe('Tailwind color whose curve the palette follows'),
        shades: z.array(z.object({ shade: z.number(), value: z.string() })),
        replacesTailwindColor: z
          .boolean()
          .describe("True when the code replaces a default Tailwind palette (default color name, theme or config output)"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (input) => {
      const result = createPalette({
        color: input.color,
        name: input.name,
        version: input.tailwindVersion as TailwindVersion | undefined,
        format: input.format,
        output: input.output && OUTPUTS[input.output],
      })
      const output = Object.entries(OUTPUTS).find(([, value]) => value === result.output)![0]
      const structured = {
        code: result.text,
        name: result.name,
        tailwindVersion: result.version,
        format: result.format,
        output,
        inputShade: result.anchor,
        closestTailwindColor: result.family,
        shades: result.shades,
        replacesTailwindColor: result.replacesTailwindColor,
      }
      const { name, anchor, shades } = result
      const summary =
        `${name}-${shades[0].shade} to ${name}-${shades.at(-1)!.shade} for Tailwind v${result.version}. ` +
        `The input color is ${name}-${anchor}.` +
        (structured.replacesTailwindColor
          ? ` Warning: this replaces Tailwind's own ${name} palette, so every ${name}-* class ` +
            'in the project changes. Unless the user wants that, call again with a name like "brand".'
          : '')
      return {
        content: [{ type: 'text', text: `${summary}\n\n${result.text}` }],
        structuredContent: structured,
      }
    },
  )

  server.registerTool(
    'find_closest_tailwind_color',
    {
      title: 'Find the closest Tailwind color',
      description:
        "Finds the shade in Tailwind's default palette that looks most like a given color, " +
        'e.g. #db4d53 -> red-500. Use it to pick an existing Tailwind class (bg-red-500) ' +
        'instead of an arbitrary value. If the difference is visible, use generate_palette ' +
        'to add the exact color as a custom palette instead.',
      inputSchema: z.object({ color, tailwindVersion }),
      outputSchema: z.object({
        name: z.string().describe('Tailwind color name, e.g. "red"'),
        shade: z.number().describe('Closest shade, e.g. 500'),
        className: z.string().describe('Color part of a utility class, e.g. "red-400" for bg-red-400'),
        tailwindValue: z.object({ oklch: z.string(), hex: z.string() }).describe("Tailwind's value for that shade"),
        input: z.object({ oklch: z.string(), hex: z.string() }).describe('The input color'),
        distance: z.number().describe('OKLab distance: 0 is identical, under 0.02 is hard to see'),
        visiblyDifferent: z.boolean().describe('True when the Tailwind shade looks different from the input'),
        tailwindVersion: z.number(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (input) => {
      const parsed = parse(input.color)
      const version = (input.tailwindVersion ?? 4) as TailwindVersion
      const { reference } = VERSIONS[version]
      // Full lightness weight: the shade that looks the same, not the best palette curve
      const { family, index, distance } = closestTailwindShade(parsed, reference, { lightnessWeight: 1 })
      const shade = reference.shades[index]
      const structured = {
        name: family,
        shade,
        className: `${family}-${shade}`,
        tailwindValue: tailwindValue(version, family, index),
        input: bothFormats(parsed),
        distance: Number(distance.toFixed(4)),
        visiblyDifferent: distance >= VISIBLE_DIFFERENCE,
        tailwindVersion: version,
      }
      const advice = structured.visiblyDifferent
        ? 'The difference is visible. To keep the exact color, use generate_palette.'
        : 'They look almost the same, so the Tailwind class is a good replacement.'
      return {
        content: [
          {
            type: 'text',
            text:
              `Closest Tailwind v${version} color: ${family}-${shade} ` +
              `(${structured.tailwindValue.hex}, input ${structured.input.hex}). ${advice}`,
          },
        ],
        structuredContent: structured,
      }
    },
  )

  server.registerTool(
    'get_tailwind_palette',
    {
      title: "Get Tailwind's default colors",
      description:
        "Looks up Tailwind's own default colors, exactly as Tailwind defines them: a whole color " +
        '(e.g. "blue", all shades) or one shade (e.g. "slate-500"), for Tailwind v4, v3, v2 or v1. ' +
        'Use it instead of writing default Tailwind color values from memory. Values are oklch() ' +
        'in v4 and hex in older versions.',
      inputSchema: z.object({
        name: z
          .string()
          .describe('A default Tailwind color, like "blue", or one shade of it, like "blue-500"'),
        tailwindVersion,
      }),
      outputSchema: z.object({
        name: z.string().describe('Tailwind color name, e.g. "blue"'),
        tailwindVersion: z.number(),
        shades: z
          .array(
            z.object({
              shade: z.number(),
              className: z.string().describe('Color part of a utility class, e.g. "blue-500" for bg-blue-500'),
              value: z.string().describe("Tailwind's value: oklch() in v4, hex in older versions"),
            }),
          )
          .describe('All shades, or only the one asked for'),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (input) => {
      const version = (input.tailwindVersion ?? 4) as TailwindVersion
      const { reference } = VERSIONS[version]
      const match = input.name.trim().toLowerCase().match(/^([a-z]+)(?:-(\d+))?$/)
      const name = match?.[1] ?? ''
      if (!Object.hasOwn(reference.values, name)) {
        const names = Object.keys(reference.values).join(', ')
        throw new Error(`"${input.name}" is not a default Tailwind v${version} color. Colors: ${names}`)
      }
      const wanted = match?.[2] === undefined ? undefined : Number(match[2])
      if (wanted !== undefined && !reference.shades.includes(wanted)) {
        throw new Error(`Tailwind v${version} has no ${name}-${wanted}. Shades: ${reference.shades.join(', ')}`)
      }

      const shades = reference.shades
        .map((shade, index) => ({ shade, className: `${name}-${shade}`, value: reference.values[name][index] }))
        .filter(({ shade }) => wanted === undefined || shade === wanted)
      const structured = { name, tailwindVersion: version, shades }
      return {
        content: [
          {
            type: 'text',
            text:
              `Tailwind v${version} ${wanted === undefined ? name : `${name}-${wanted}`}:\n` +
              shades.map(({ className, value }) => `${className}: ${value}`).join('\n'),
          },
        ],
        structuredContent: structured,
      }
    },
  )

  return server
}

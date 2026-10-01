import type { ColorFormat } from './palette.js'
import { PALETTE_V1, PALETTE_V3, PALETTE_V4, type ReferencePalette } from './tailwind-palette.js'

export type TailwindVersion = 1 | 2 | 3 | 4

export type Output = 'theme' | 'config' | 'cssVariables'

export type VersionProfile = {
  version: TailwindVersion
  /** Shades and curves the generated palette follows */
  reference: ReferencePalette
  /** Color format used when the `colorFormat` setting is `auto` */
  colorFormat: ColorFormat
  /** Output used in CSS files when the `output` setting is `auto` */
  cssOutput: Output
}

/** Keeps only `shades` from a reference palette (e.g. v2 has no 950) */
function withShades(reference: ReferencePalette, shades: readonly number[]): ReferencePalette {
  const indexes = shades.map((shade) => reference.shades.indexOf(shade))
  const pick = <T,>(byName: Record<string, readonly T[]>) =>
    Object.fromEntries(Object.entries(byName).map(([name, list]) => [name, indexes.map((index) => list[index])]))
  return { shades, colors: pick(reference.colors), values: pick(reference.values) }
}

export const VERSIONS: Record<TailwindVersion, VersionProfile> = {
  // Colors live in CSS: `@theme { --color-brand-500: oklch(...) }`
  4: { version: 4, reference: PALETTE_V4, colorFormat: 'oklch', cssOutput: 'theme' },
  // Colors live in tailwind.config.js; 950 exists since v3.3
  3: { version: 3, reference: PALETTE_V3, colorFormat: 'hex', cssOutput: 'cssVariables' },
  // Same palette style as v3, from 50 to 900
  2: {
    version: 2,
    reference: withShades(PALETTE_V3, [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
    colorFormat: 'hex',
    cssOutput: 'cssVariables',
  },
  // The original palette, from 100 to 900
  1: { version: 1, reference: PALETTE_V1, colorFormat: 'hex', cssOutput: 'cssVariables' },
}

export const LATEST_VERSION: TailwindVersion = 4

/**
 * Reads the major Tailwind version from a package.json's dependencies,
 * e.g. "^3.4.1" -> 3, "4.0.0-beta.1" -> 4. Returns undefined when not found.
 */
export function versionFromPackageJson(text: string): TailwindVersion | undefined {
  let pkg: Record<string, Record<string, string> | undefined>
  try {
    pkg = JSON.parse(text)
  } catch {
    return undefined
  }

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const range = pkg[field]?.tailwindcss
    const major = Number(range?.match(/\d+/)?.[0])
    if (major >= 1 && major <= 4) return major as TailwindVersion
    // Newer than this extension knows: use the latest behavior
    if (major > 4) return LATEST_VERSION
  }

  return undefined
}

// Directives that only exist in Tailwind v4
const V4_CSS = /@import\s+(?:url\()?["']tailwindcss(?:\/[^"']*)?["']|@theme\b|@utility\s|@plugin\s|@custom-variant\s|@source\s/
// `@variants` and `@responsive` were removed in v3
const V2_CSS = /@(?:variants|responsive)\b/
// Tailwind v1 to v3 entry points
const V3_CSS = /@tailwind\s+(?:base|components|utilities|screens|variants)\b/

/**
 * Guesses the Tailwind version from a CSS file's directives, e.g.
 * `@import "tailwindcss"` or `@theme` -> 4, `@tailwind base` -> 3.
 * Returns undefined when the file has no Tailwind directives.
 */
export function versionFromCss(text: string): TailwindVersion | undefined {
  const css = text.replace(/\/\*[\s\S]*?\*\//g, '')
  if (V4_CSS.test(css)) return 4
  if (V2_CSS.test(css)) return 2
  if (V3_CSS.test(css)) return 3
  return undefined
}

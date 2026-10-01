'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  createPalette,
  formatColor,
  parseColor,
  VERSIONS,
  type Color,
  type ColorFormat,
  type Output,
  type TailwindVersion,
} from 'tailwindshades-cli'
import { DEFAULTS, parseSettings, toSearch, type Settings } from '@/lib/settings'
import CodeBlock from './CodeBlock'
import Segmented from './Segmented'

type Swatch = { shade: number; color: Color }

// Shades the page uses outside the generator; every Tailwind version has them
const BRAND_SHADES = [200, 400, 500, 700, 900]

/** One row of shades. The `marked` shade gets a "your color" label. */
function Strip({ label, swatches, marked }: { label: string; swatches: Swatch[]; marked?: number }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-muted">{label}</div>
      <ol
        className="grid gap-1 sm:grid-cols-(--columns)"
        style={{ '--columns': `repeat(${swatches.length}, minmax(0, 1fr))` } as CSSProperties}
      >
        {swatches.map(({ shade, color }) => {
          const isMarked = shade === marked
          // Dark text on light shades, light text on dark ones
          const text = color.l > 0.65 ? 'text-secondary-900/80' : 'text-white/90'
          return (
            <li
              key={shade}
              className={`flex h-10 items-center justify-between rounded-sm px-3 text-xs sm:h-20 sm:flex-col sm:items-start sm:justify-end sm:px-2 sm:py-1.5 ${text} ${
                isMarked ? 'ring-2 ring-ink ring-offset-2 ring-offset-page' : ''
              }`}
              style={{ backgroundColor: formatColor(color, 'oklch') }}
              title={formatColor(color, 'hex')}
            >
              <span className="font-semibold">{shade}</span>
              {isMarked && <span className="text-[0.6875rem]">your color</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const versionOptions = ([4, 3, 2, 1] as const).map((value) => ({ value, label: `v${value}` }))
const formatOptions: { value: ColorFormat | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'oklch', label: 'OKLCH' },
  { value: 'hex', label: 'Hex' },
  { value: 'rgb', label: 'RGB' },
]
const outputOptions: { value: Output | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'theme', label: '@theme' },
  { value: 'config', label: 'Config' },
  { value: 'cssVariables', label: 'CSS vars' },
]

export default function Generator() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const update = (changes: Partial<Settings>) => setSettings((current) => ({ ...current, ...changes }))

  // Settings live in the URL, so a palette can be shared as a link. Read it once
  // after the first render (the page itself is static), then keep it in sync.
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    setSettings(parseSettings(window.location.search))
    setLoaded(true)
  }, [])
  useEffect(() => {
    if (loaded) window.history.replaceState(null, '', toSearch(settings) || window.location.pathname)
  }, [loaded, settings])

  const result = useMemo(() => {
    try {
      const palette = createPalette({
        color: settings.color,
        name: settings.name || undefined,
        version: settings.version,
        format: settings.format === 'auto' ? undefined : settings.format,
        output: settings.output === 'auto' ? undefined : settings.output,
      })
      return { palette }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }, [settings])

  // Share the palette with the rest of the page (the logo and the heading read
  // these variables). An invalid color keeps the last good palette.
  const shades = result.palette?.palette.shades
  useEffect(() => {
    if (!shades) return
    for (const { shade, color } of shades) {
      if (BRAND_SHADES.includes(shade)) {
        document.documentElement.style.setProperty(`--brand-${shade}`, formatColor(color, 'oklch'))
      }
    }
  }, [shades])

  const parsed = parseColor(settings.color)
  const pickerValue = parsed ? formatColor(parsed, 'hex').slice(0, 7) : '#000000'

  const { palette } = result
  const reference = VERSIONS[settings.version].reference
  const tailwindSwatches: Swatch[] = palette
    ? reference.colors[palette.family].map(([l, c, h], index) => ({ shade: reference.shades[index], color: { l, c, h } }))
    : []

  return (
    <div className="shadow-card rounded-sm border bg-page p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Color</span>
          <span className="flex rounded-sm border bg-field focus-within:border-secondary-300">
            <input
              type="color"
              aria-label="Pick a color"
              value={pickerValue}
              onChange={(event) => update({ color: event.target.value })}
              className="m-1 h-8 w-10 cursor-pointer rounded-sm border-0 bg-transparent p-0"
            />
            <input
              type="text"
              value={settings.color}
              onChange={(event) => update({ color: event.target.value })}
              spellCheck={false}
              placeholder="#db4d53, rgb(…), oklch(…), teal"
              className="w-full bg-transparent px-2 font-mono text-sm outline-none"
            />
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Name</span>
          <input
            type="text"
            value={settings.name}
            onChange={(event) => update({ name: event.target.value.trim() })}
            spellCheck={false}
            placeholder={palette?.family ?? 'brand'}
            className="h-10.5 w-full rounded-sm border bg-field px-3 font-mono text-sm outline-none focus:border-secondary-300"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        <Segmented
          label="Tailwind"
          options={versionOptions}
          value={settings.version}
          onChange={(version: TailwindVersion) => update({ version })}
        />
        <Segmented label="Format" options={formatOptions} value={settings.format} onChange={(format) => update({ format })} />
        <Segmented label="Output" options={outputOptions} value={settings.output} onChange={(output) => update({ output })} />
      </div>

      {result.error ? (
        <p role="alert" className="mt-6 rounded-sm bg-primary-100 px-3 py-2 text-sm text-primary-800">
          {result.error}
        </p>
      ) : (
        palette && (
          <>
            <div className="mt-6 space-y-5">
              <Strip label={`Your palette: ${palette.name}`} swatches={palette.palette.shades} marked={palette.anchor} />
              <Strip label={`Tailwind's ${palette.family}, the curve it follows`} swatches={tailwindSwatches} />
            </div>

            {palette.replacesTailwindColor && (
              <p className="mt-4 text-sm text-muted">
                This replaces Tailwind&apos;s own <code>{palette.name}</code> palette. Pick another name, like{' '}
                <code>brand</code>, to keep it.
              </p>
            )}

            <div className="mt-6">
              <CodeBlock code={palette.text} />
            </div>
          </>
        )
      )}
    </div>
  )
}

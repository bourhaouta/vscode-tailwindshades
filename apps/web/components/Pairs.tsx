import { formatColor, type Output, type Palette, type PairColor, type ReadablePair, type ReadablePairs } from 'tailwindshades-cli'

const SAMPLES: Record<ReadablePair['use'], { label: string; text: string }> = {
  button: { label: 'Button', text: 'Sign up' },
  text: { label: 'Text on white', text: 'Read more' },
  badge: { label: 'Badge', text: 'New' },
  dark: { label: 'Dark mode', text: 'Read more' },
}

/** A pair as utility classes, or as variables for plain CSS variables, like the code comment */
function describe(name: string, output: Output, { background, text }: ReadablePair): string {
  const color = (value: PairColor) =>
    value === 'white' ? 'white' : output === 'cssVariables' ? `--${name}-${value}` : `${name}-${value}`
  return output === 'cssVariables'
    ? `${color(text)} on ${color(background)}`
    : `bg-${color(background)} text-${color(text)}`
}

/** One pair: a live sample in the real colors, its classes and its contrast */
function Pair({ pair, label, code, value }: { pair: ReadablePair; label: string; code: string; value: (color: PairColor) => string }) {
  const failed = pair.level === 'fail'
  const sample = { color: value(pair.text) }
  // Buttons and badges carry their own background; text sits on the page behind it
  const filled = pair.use === 'button' || pair.use === 'badge'

  return (
    <li className={`flex flex-col rounded-sm border p-2 ${failed ? 'border-dashed' : ''}`}>
      <div
        className="flex h-16 items-center justify-center rounded-sm border"
        style={{ backgroundColor: filled ? '#ffffff' : value(pair.background) }}
      >
        {filled ? (
          <span
            className={pair.use === 'button' ? 'rounded-sm px-4 py-2 text-sm font-semibold' : 'rounded-full px-2.5 py-0.5 text-xs font-medium'}
            style={{ ...sample, backgroundColor: value(pair.background) }}
          >
            {SAMPLES[pair.use].text}
          </span>
        ) : (
          <span className="text-sm font-medium underline underline-offset-2" style={sample}>
            {SAMPLES[pair.use].text}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-muted">{label}</span>
        <span
          className={`rounded-sm px-1.5 py-0.5 font-semibold whitespace-nowrap ${
            failed ? 'bg-primary-100 text-primary-800' : 'bg-surface text-ink'
          }`}
        >
          {pair.ratio}:1 {failed ? 'fails' : pair.level}
        </span>
      </div>
      <code className={`mt-1 font-mono text-xs ${failed ? 'text-muted line-through' : ''}`}>{code}</code>
    </li>
  )
}

/**
 * Readable text and background pairs from the palette, as live samples: the
 * same pairs the MCP server writes as a comment above the code.
 */
export default function Pairs({
  name,
  output,
  palette,
  pairs,
}: {
  name: string
  output: Output
  palette: Palette
  pairs: ReadablePairs
}) {
  const values = new Map(palette.shades.map(({ shade, color }) => [shade, formatColor(color, 'oklch')]))
  const value = (color: PairColor) => (color === 'white' ? '#ffffff' : values.get(color)!)
  const items = [
    ...pairs.pairs.map((pair) => ({ pair, label: SAMPLES[pair.use].label })),
    ...(pairs.avoid ? [{ pair: pairs.avoid, label: 'Avoid' }] : []),
  ]

  return (
    <div>
      <div className="mb-2 text-sm font-medium text-muted">Readable pairs</div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
        {items.map(({ pair, label }) => (
          <Pair key={label} pair={pair} label={label} code={describe(name, output, pair)} value={value} />
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        WCAG AA needs 4.5:1 for normal text. Checked on white and on your darkest shade, not on the other colors of
        your project.
      </p>
    </div>
  )
}

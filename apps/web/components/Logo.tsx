// The Tailwind Shades logo: the wave mark cut into five stripes, darkest on the
// left. The stripes show the current palette (CSS variables set by the
// generator), with the teal of the extension icon until it runs.
const WAVE =
  'M12 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6 12z'

const STRIPES = [
  'var(--brand-900, #234e52)',
  'var(--brand-800, #285e61)',
  'var(--brand-700, #2c7a7b)',
  'var(--brand-600, #319795)',
  'var(--brand-500, #38b2ac)',
]

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 4.8 24 14.4" aria-hidden className={className}>
      <clipPath id="logo-wave">
        <path d={WAVE} />
      </clipPath>
      <g clipPath="url(#logo-wave)">
        {STRIPES.map((color, index) => (
          <rect
            key={color}
            x={index * 4.8}
            y="4.8"
            width="4.85"
            height="14.4"
            style={{ fill: color }}
            className="transition-[fill] duration-300"
          />
        ))}
      </g>
    </svg>
  )
}

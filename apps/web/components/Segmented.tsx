'use client'

type Option<T> = { value: T; label: string }

/** A row of buttons where one is selected, like a radio group */
export default function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted">{label}</div>
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-sm border bg-field p-0.5">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-sm px-2.5 py-1 text-sm transition-colors ${
                selected ? 'bg-secondary-500 text-white dark:bg-secondary-200 dark:text-secondary-900' : 'text-muted hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

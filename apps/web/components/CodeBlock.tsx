import CopyButton from './CopyButton'

/**
 * Dark code block with a copy button in a bar above it, so it never covers the
 * code. `wrap` breaks long one-line commands; other code scrolls sideways.
 */
export default function CodeBlock({ code, wrap = false }: { code: string; wrap?: boolean }) {
  return (
    <div className="rounded-sm bg-code">
      <div className="flex justify-end px-2 pt-2">
        <CopyButton text={code} />
      </div>
      <pre
        className={`px-4 pt-1 pb-4 font-mono text-[0.8125rem] leading-relaxed text-secondary-100 ${
          wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'overflow-x-auto'
        }`}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

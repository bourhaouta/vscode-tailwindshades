import CopyButton from './CopyButton'

/** Dark code block with a copy button in a bar above it, so it never covers the code */
export default function CodeBlock({ code }: { code: string }) {
  return (
    <div className="rounded-sm bg-code">
      <div className="flex justify-end px-2 pt-2">
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 pt-1 pb-4 font-mono text-[0.8125rem] leading-relaxed text-secondary-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

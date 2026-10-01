'use client'

import { useState } from 'react'

export default function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-sm bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
    >
      {/* Announced to screen readers when it changes */}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  )
}

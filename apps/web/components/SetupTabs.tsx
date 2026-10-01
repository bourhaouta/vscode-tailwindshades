'use client'

import { useState, type ReactNode } from 'react'
import { mcpUrl, site } from '@/lib/site'
import CodeBlock from './CodeBlock'
import Segmented from './Segmented'

const json = (value: unknown) => JSON.stringify(value, null, 2)

const agents = [
  { value: 'claude', label: 'Claude Code', file: '', code: `claude mcp add --transport http --scope user tailwindshades ${mcpUrl}` },
  { value: 'cursor', label: 'Cursor', file: '~/.cursor/mcp.json', code: json({ mcpServers: { tailwindshades: { url: mcpUrl } } }) },
  {
    value: 'vscode',
    label: 'VS Code',
    file: '.vscode/mcp.json',
    code: json({ servers: { tailwindshades: { type: 'http', url: mcpUrl } } }),
  },
]

/** One agent's setup at a time, so the section stays short */
function Agents() {
  const [selected, setSelected] = useState(agents[0].value)
  const agent = agents.find(({ value }) => value === selected)!

  return (
    <div className="space-y-3">
      <Segmented label="Your agent" options={agents} value={selected} onChange={setSelected} />
      {agent.file && (
        <p className="text-sm text-muted">
          In <code>{agent.file}</code>:
        </p>
      )}
      {/* The Claude Code command is one long line */}
      <CodeBlock code={agent.code} wrap={!agent.file} />
    </div>
  )
}

const tabs: { id: string; label: string; content: ReactNode }[] = [
  {
    id: 'agents',
    label: 'AI agents',
    content: (
      <div className="space-y-5">
        <p>
          Agents often guess Tailwind shades, or add one <code>--color-brand</code> line instead of a palette. Connect
          the MCP server and ask: <em>&ldquo;Add a brand color #db4d53 to my theme.&rdquo;</em> Nothing to install:
        </p>
        <Agents />
        <p className="text-sm text-muted">
          Prefer it local? Run <code>npx -y tailwindshades-mcp</code> as a stdio server. It&apos;s also in the{' '}
          <a className="underline hover:text-accent" href="https://registry.modelcontextprotocol.io">
            MCP Registry
          </a>{' '}
          as <code>io.github.bourhaouta/tailwindshades</code>.
        </p>
      </div>
    ),
  },
  {
    id: 'editor',
    label: 'VS Code',
    content: (
      <div className="space-y-3">
        <p>
          Put the cursor on a color in any CSS or JS file and press <kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd>{' '}
          <kbd>Ctrl/Cmd</kbd>+<kbd>G</kbd>. The palette replaces the color, in your project&apos;s Tailwind format.
        </p>
        <p className="flex flex-wrap gap-3">
          <a className="font-medium text-accent underline" href={site.marketplace}>
            VS Code Marketplace
          </a>
          <a className="font-medium text-accent underline" href={site.openVsx}>
            Open VSX
          </a>
          <span className="text-muted">(Cursor, Windsurf, VSCodium)</span>
        </p>
      </div>
    ),
  },
  {
    id: 'cli',
    label: 'Command line',
    content: (
      <div className="space-y-3">
        <p>The same palettes in your terminal. Options for the version, format and output, like on this page.</p>
        <CodeBlock code={'npx tailwindshades-cli "#db4d53" --name brand'} wrap />
        <p className="text-sm text-muted">
          Or as a library: <code>{"import { createPalette } from 'tailwindshades-cli'"}</code>
        </p>
      </div>
    ),
  },
]

export default function SetupTabs() {
  const [active, setActive] = useState(tabs[0].id)

  return (
    <div>
      <div role="tablist" aria-label="Where to use it" className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab.id === active ? 'border-primary-500 text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="pt-5 leading-relaxed"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}

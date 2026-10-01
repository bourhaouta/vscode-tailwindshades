import Generator from '@/components/Generator'
import Logo from '@/components/Logo'
import SetupTabs from '@/components/SetupTabs'
import { site } from '@/lib/site'


export default function Home() {
  return (
    <>
      <header className="site-container flex items-center justify-between py-5">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-7 w-auto" />
          {site.name}
        </a>
        <nav className="flex gap-4 text-sm text-muted">
          <a className="hover:text-ink" href={site.marketplace}>
            VS Code
          </a>
          <a className="hover:text-ink" href={site.openVsx}>
            Open VSX
          </a>
          <a className="hover:text-ink" href={site.github}>
            GitHub
          </a>
        </nav>
      </header>

      <main className="site-container pb-16">
        <section className="pt-6 pb-8 sm:pt-12">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Tailwind palettes from <span className="text-brand transition-colors duration-300">any color</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            Your color stays exactly as it is. The other shades follow Tailwind&apos;s own colors, computed in OKLCH,
            for Tailwind v4, v3, v2 and v1.
          </p>
        </section>

        <Generator />

        <section className="mt-16">
          <h2 className="text-2xl font-semibold">Use it where you work</h2>
          <p className="mt-2 mb-6 text-muted">The same engine in your editor, your terminal and your AI agent.</p>
          <SetupTabs />
        </section>
      </main>

      <footer className="border-t">
        <div className="site-container flex flex-wrap justify-between gap-2 py-6 text-sm text-muted">
          <span>
            Made by{' '}
            <a className="font-medium text-ink hover:text-accent" href={site.author.url}>
              {site.author.name}
            </a>
          </span>
          <a className="hover:text-ink" href={site.github}>
            Source on GitHub (MIT)
          </a>
        </div>
      </footer>
    </>
  )
}

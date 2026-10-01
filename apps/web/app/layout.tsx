import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Rubik } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { site } from '@/lib/site'
import './globals.css'

// Self-hosted at build time; exposed as --font-rubik for Tailwind's font-sans
const rubik = Rubik({ subsets: ['latin'], variable: '--font-rubik', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: `${site.name}: Tailwind CSS palettes from any color`,
  description: site.description,
  authors: [{ name: site.author.name, url: site.author.url }],
  keywords: ['Tailwind CSS', 'palette', 'color', 'shades', 'OKLCH', 'Tailwind v4', 'MCP', 'VS Code'],
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: '/', siteName: site.name, title: site.name, description: site.description },
  twitter: { card: 'summary_large_image', title: site.name, description: site.description },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#021b21' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={rubik.variable}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}

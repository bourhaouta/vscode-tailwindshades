// The link preview for social networks and chats, rendered at build time.
// Same layout as bourhaouta.com's preview images.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { createPalette, formatColor } from 'tailwindshades-cli'
import { DEFAULTS } from '@/lib/settings'
import { site } from '@/lib/site'

export const alt = 'Tailwind Shades: a Tailwind CSS palette from 50 to 950, made from one color'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Same shape and stripes as components/Logo.tsx, in the default teal
const WAVE =
  'M12 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6 12z'
const STRIPES = ['#234e52', '#285e61', '#2c7a7b', '#319795', '#38b2ac']

// Rubik like the site (OFL). The default font has no bold weight.
const font = (file: string) => readFile(join(process.cwd(), 'assets', file))

export default async function Image() {
  const [medium, bold] = await Promise.all([font('Rubik-Medium.ttf'), font('Rubik-Bold.ttf')])
  const palette = createPalette({ color: DEFAULTS.color, name: 'brand' })
  const swatches = palette.palette.shades.map(({ shade, color }) => ({ shade, hex: formatColor(color, 'hex'), light: color.l > 0.65 }))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#ffffff',
          color: '#064453',
          fontFamily: 'Rubik',
          fontWeight: 500,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 36, fontWeight: 700 }}>
          <svg width="96" height="58" viewBox="0 4.8 24 14.4">
            <defs>
              <clipPath id="wave">
                <path d={WAVE} />
              </clipPath>
            </defs>
            <g clipPath="url(#wave)">
              {STRIPES.map((fill, index) => (
                <rect key={fill} x={index * 4.8} y="4.8" width="4.85" height="14.4" fill={fill} />
              ))}
            </g>
          </svg>
          {site.name}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, letterSpacing: -1 }}>
            Tailwind palettes from&nbsp;<span style={{ color: '#2c7a7b' }}>any color</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {swatches.map(({ shade, hex, light }) => (
              <div
                key={shade}
                style={{
                  flex: 1,
                  height: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '0 0 12px 12px',
                  borderRadius: 6,
                  background: hex,
                  color: light ? 'rgba(1, 14, 17, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                  fontSize: 20,
                  fontWeight: 700,
                  // "yours": the shade that holds the input color
                  border: shade === palette.anchor ? '4px solid #064453' : '4px solid transparent',
                }}
              >
                {shade}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, color: '#386975' }}>
          <span>VS Code · CLI · MCP for AI agents</span>
          <span style={{ color: '#2c7a7b' }}>{new URL(site.url).host}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Rubik', data: medium, weight: 500, style: 'normal' },
        { name: 'Rubik', data: bold, weight: 700, style: 'normal' },
      ],
    },
  )
}

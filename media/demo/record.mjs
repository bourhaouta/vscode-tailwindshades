// Records media/demo.gif from demo.html: one screenshot per state, then ffmpeg.
// The palette comes from the core package, so the GIF always matches the engine.
//
//   npm run build -w packages/core
//   PW=<path to playwright-core> CHROME=<path to a Chromium binary> node media/demo/record.mjs
//
// Needs ffmpeg. PW and CHROME can come from any Playwright install, e.g.
//   PW=$(ls -d ~/.npm/_npx/*/node_modules/playwright-core | head -1)
//   CHROME=$(ls -d ~/.cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell | head -1)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPalette, formatColor } from 'tailwindshades-cli'

const dir = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(dir, '..', 'demo.gif')
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tailwindshades-demo-'))
const frames = path.join(work, 'frames')
const { chromium } = createRequire(import.meta.url)(process.env.PW ?? 'playwright-core')

const palette = createPalette({ color: '#db4d53', name: 'brand' })
const data = {
  lines: palette.text.split('\n').slice(1, -1).map((line) => line.trim()),
  swatches: palette.palette.shades.map(({ color }) => formatColor(color, 'hex')),
}
const html = fs.readFileSync(path.join(dir, 'demo.html'), 'utf8').replace('__DATA__', JSON.stringify(data))
fs.writeFileSync(path.join(work, 'demo.html'), html)

const base = { color: 'plain', revealed: 0, quick: null, keys: null, caption: '', status: '' }
const status = `Tailwind Shades: brand-50 to brand-950 (v4), your color is brand-${palette.anchor}`

// [state, seconds on screen]
const timeline = []
const add = (state, seconds) => timeline.push([{ ...base, ...state }, seconds])

const step1 = '1. Put the cursor on a color'
add({ color: 'caret', caption: step1 }, 0.5)
add({ color: 'plain', caption: step1 }, 0.4)
add({ color: 'caret', caption: step1 }, 0.5)
add({ color: 'plain', caption: step1 }, 0.4)

const step2 = '2. Press Ctrl+K Ctrl+G'
add({ color: 'caret', caption: step2, keys: ['Ctrl', 'K'] }, 0.45)
add({ color: 'flash', caption: step2, keys: ['Ctrl', 'K', 'Ctrl', 'G'] }, 0.7)

const step3 = '3. Name it'
add({ color: 'flash', caption: step3, quick: 'red' }, 1.3)
add({ color: 'flash', caption: step3, quick: '' }, 0.25)
for (const typed of ['b', 'br', 'bra', 'bran', 'brand']) {
  add({ color: 'flash', caption: step3, quick: typed }, 0.13)
}
add({ color: 'flash', caption: step3, quick: 'brand' }, 0.6)

const done = 'Your palette: 50 to 950'
for (let revealed = 1; revealed <= 11; revealed++) {
  add({ revealed, caption: done }, 0.06)
}
add({ revealed: 11, caption: done, status }, 4)

fs.mkdirSync(frames)
const browser = await chromium.launch({ executablePath: process.env.CHROME })
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 })
await page.goto('file://' + path.join(work, 'demo.html'))

const list = []
for (const [index, [state, seconds]] of timeline.entries()) {
  await page.evaluate((s) => window.render(s), state)
  const file = path.join(frames, `${String(index).padStart(3, '0')}.png`)
  await page.screenshot({ path: file })
  list.push(`file '${file}'`, `duration ${seconds}`)
}
// The concat demuxer needs the last file listed again (its duration is otherwise ignored)
list.push(list[list.length - 2])
fs.writeFileSync(path.join(work, 'frames.txt'), list.join('\n'))
await browser.close()

// Two passes: build one shared palette for all frames, then encode with it
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'frames.txt'),
  '-vf', 'fps=25,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none',
  '-loop', '0', out,
])
fs.rmSync(work, { recursive: true, force: true })
console.log('frames:', timeline.length, 'gif:', out, fs.statSync(out).size, 'bytes')

import { describe, expect, it } from 'vitest'
import { DEFAULTS, parseSettings, toSearch } from './settings'

describe('URL settings', () => {
  it('uses the defaults for an empty query', () => {
    expect(parseSettings('')).toEqual(DEFAULTS)
    expect(toSearch(DEFAULTS)).toBe('')
  })

  it('round-trips every setting', () => {
    const settings = { color: '#3b82f6', name: 'ocean', version: 3, format: 'hex', output: 'cssVariables' } as const
    const search = toSearch(settings)
    expect(search).toBe('?color=3b82f6&name=ocean&v=3&format=hex&output=css')
    expect(parseSettings(search)).toEqual(settings)
  })

  it('keeps colors that are not hex', () => {
    expect(parseSettings('?color=oklch(62%25%200.2%20250)').color).toBe('oklch(62% 0.2 250)')
  })

  it('ignores values it does not know', () => {
    expect(parseSettings('?v=5&format=hsl&output=scss')).toEqual(DEFAULTS)
  })
})

import { describe, expect, it } from 'vitest'
import { collectUniqueUrls, formatLinkHostname } from './urlDisplay'

describe('formatLinkHostname', () => {
  it('strips www prefix', () => {
    expect(formatLinkHostname('https://www.example.com/menu')).toBe('example.com')
  })
})

describe('collectUniqueUrls', () => {
  it('dedupes and trims', () => {
    expect(
      collectUniqueUrls([' https://a.com ', 'https://a.com', '', null, 'https://b.com']),
    ).toEqual(['https://a.com', 'https://b.com'])
  })
})

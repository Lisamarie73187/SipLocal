import { describe, expect, it } from 'vitest'

import {
  claudeDaysToDayOfWeek,
  extractionToHashPayload,
  hashHappyHourContent,
  isCityCoverageFresh,
  mapGooglePriceLevel,
  meetsMinimumConfidence,
  normalizeHappyHourHashPayload,
  parseClaudeHappyHourJson,
  resolveCityInput,
} from './index'

const BEND_CITIES = [{ slug: 'bend-or', name: 'Bend', state: 'OR' }]

describe('resolveCityInput', () => {
  it('matches city slug', () => {
    expect(resolveCityInput('bend-or', BEND_CITIES)).toEqual({
      citySlug: 'bend-or',
      zip: null,
      matchedBy: 'slug',
    })
  })

  it('matches city name and state', () => {
    expect(resolveCityInput('Bend, OR', BEND_CITIES)).toEqual({
      citySlug: 'bend-or',
      zip: null,
      matchedBy: 'name',
    })
  })

  it('matches Bend ZIP codes', () => {
    expect(resolveCityInput('97701', BEND_CITIES)).toEqual({
      citySlug: 'bend-or',
      zip: '97701',
      matchedBy: 'zip',
    })
  })

  it('returns null for unknown input', () => {
    expect(resolveCityInput('Portland, OR', BEND_CITIES)).toBeNull()
  })
})

describe('isCityCoverageFresh', () => {
  const now = new Date('2026-06-04T12:00:00Z')

  it('is fresh when a job completed within the window', () => {
    expect(
      isCityCoverageFresh(
        [{ status: 'complete', completed_at: '2026-06-01T00:00:00Z' }],
        7,
        now,
      ),
    ).toBe(true)
  })

  it('is stale when last complete job is too old', () => {
    expect(
      isCityCoverageFresh(
        [{ status: 'complete', completed_at: '2026-05-20T00:00:00Z' }],
        7,
        now,
      ),
    ).toBe(false)
  })

  it('ignores non-complete jobs', () => {
    expect(
      isCityCoverageFresh(
        [{ status: 'running', completed_at: '2026-06-03T00:00:00Z' }],
        7,
        now,
      ),
    ).toBe(false)
  })
})

describe('mapGooglePriceLevel', () => {
  it('maps Google tiers to SipLocal price levels', () => {
    expect(mapGooglePriceLevel(0)).toBe('$')
    expect(mapGooglePriceLevel(1)).toBe('$')
    expect(mapGooglePriceLevel(2)).toBe('$$')
    expect(mapGooglePriceLevel(3)).toBe('$$$')
    expect(mapGooglePriceLevel(4)).toBe('$$$')
    expect(mapGooglePriceLevel(null)).toBe('$')
  })
})

describe('happyHourContentHash', () => {
  it('produces the same hash regardless of specials order', () => {
    const a = hashHappyHourContent({
      days: [1, 3, 5],
      start_time: '15:00',
      end_time: '18:00',
      drink_specials: ['$4 drafts', '$6 wine'],
      food_specials: ['Half apps'],
      notes: 'Bar only',
      confidence: 'high',
    })
    const b = hashHappyHourContent({
      days: [5, 1, 3],
      start_time: '15:00:00',
      end_time: '18:00',
      drink_specials: ['$6 wine', '$4 drafts'],
      food_specials: ['Half apps'],
      notes: '  bar only  ',
      confidence: 'high',
    })
    expect(a).toBe(b)
  })

  it('changes hash when times differ', () => {
    const base = normalizeHappyHourHashPayload({
      days: [1],
      start_time: '16:00',
      end_time: '18:00',
      drink_specials: [],
      food_specials: [],
      notes: null,
      confidence: 'medium',
    })
    const changed = normalizeHappyHourHashPayload({
      ...base,
      end_time: '19:00',
    })
    expect(hashHappyHourContent(base)).not.toBe(hashHappyHourContent(changed))
  })
})

describe('parseClaudeHappyHourJson', () => {
  const valid = {
    has_happy_hour: true,
    confidence: 'high',
    days: ['Monday', 'Friday'],
    start_time: '15:00',
    end_time: '18:00',
    drink_specials: ['$4 drafts'],
    food_specials: [],
    notes: null,
    source_urls: ['https://example.com/happy-hour'],
    last_verified: '2026-01-15',
  }

  it('accepts valid extraction JSON', () => {
    const result = parseClaudeHappyHourJson(valid)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.confidence).toBe('high')
    }
  })

  it('rejects invalid times', () => {
    const result = parseClaudeHappyHourJson({ ...valid, start_time: '3pm' })
    expect(result.ok).toBe(false)
  })

  it('maps day names to day_of_week', () => {
    expect(claudeDaysToDayOfWeek(['Monday', 'Friday'])).toEqual([1, 5])
  })

  it('builds hash payload from extraction', () => {
    const parsed = parseClaudeHappyHourJson(valid)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      const hash = hashHappyHourContent(extractionToHashPayload(parsed.data))
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    }
  })
})

describe('meetsMinimumConfidence', () => {
  it('allows high and medium', () => {
    expect(meetsMinimumConfidence('high')).toBe(true)
    expect(meetsMinimumConfidence('medium')).toBe(true)
    expect(meetsMinimumConfidence('low')).toBe(false)
  })
})

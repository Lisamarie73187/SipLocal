import { describe, expect, it } from 'vitest'

import type { HappyHourSlot } from '@/types/venue'
import type { VenueDetail } from '@/types/venue'

import {
  formatSourceCountLabel,
  getConfidenceBadgeLabel,
  getEventTrustMeta,
  getVenueTrustMeta,
  isUnverifiedConfidence,
  shouldShowVenueTrustFooter,
} from './venueTrust'

const slot = (overrides: Partial<HappyHourSlot>): HappyHourSlot => ({
  id: '1',
  venue_id: 'v1',
  day_of_week: 1,
  start_time: '16:00:00',
  end_time: '18:00:00',
  deal_summary: 'Pints',
  categories: ['drinks'],
  is_active: true,
  confidence: null,
  conflicts: null,
  data_status: 'live',
  last_scraped_at: null,
  source_urls: [],
  created_at: '',
  updated_at: '',
  ...overrides,
})

const venue = (overrides: Partial<VenueDetail> = {}): VenueDetail => ({
  id: 'v1',
  slug: 'test-venue',
  name: 'Test Venue',
  address_line1: '123 Main St',
  address_line2: null,
  city_id: 'c1',
  city: { slug: 'bend-or', name: 'Bend', timezone: 'America/Los_Angeles' },
  description: null,
  image_url: null,
  lat: 44.05,
  lng: -121.31,
  phone: null,
  postal_code: null,
  website_url: 'https://example.com',
  is_published: true,
  is_featured: false,
  featured_until: null,
  price_level: '$$',
  data_status: 'live',
  place_id: null,
  yelp_id: null,
  yelp_rating: null,
  yelp_review_count: null,
  last_scraped_at: '2026-03-01T12:00:00.000Z',
  last_verified_at: null,
  scraped_city: null,
  scraped_zip: null,
  scrape_content_hash: null,
  created_at: '',
  updated_at: '',
  happy_hour_slots: [],
  ...overrides,
})

describe('getVenueTrustMeta', () => {
  it('prefers last_verified_at over scraped timestamps', () => {
    const meta = getVenueTrustMeta(
      venue({
        last_verified_at: '2026-03-10T00:00:00.000Z',
        last_scraped_at: '2026-03-01T12:00:00.000Z',
        happy_hour_slots: [
          {
            ...slot({
              id: 'slot-1',
              last_scraped_at: '2026-03-05T12:00:00.000Z',
            }),
            deals: [],
          },
        ],
      }),
    )

    expect(meta.freshnessDate?.toISOString()).toBe('2026-03-10T00:00:00.000Z')
    expect(meta.freshnessKind).toBe('verified')
  })

  it('uses the latest scraped timestamp when last_verified_at is missing', () => {
    const meta = getVenueTrustMeta(
      venue({
        last_verified_at: null,
        last_scraped_at: '2026-03-01T12:00:00.000Z',
        happy_hour_slots: [
          {
            ...slot({
              id: 'slot-1',
              last_scraped_at: '2026-03-08T12:00:00.000Z',
            }),
            deals: [],
          },
        ],
      }),
    )

    expect(meta.freshnessDate?.toISOString()).toBe('2026-03-08T12:00:00.000Z')
    expect(meta.freshnessKind).toBe('updated')
  })

  it('rolls up to the lowest confidence across live slots', () => {
    const meta = getVenueTrustMeta(
      venue({
        happy_hour_slots: [
          { ...slot({ id: 'slot-1', confidence: 'high' }), deals: [] },
          { ...slot({ id: 'slot-2', confidence: 'low' }), deals: [] },
        ],
      }),
    )

    expect(meta.confidence).toBe('low')
  })

  it('uses focus slot confidence and source urls when provided', () => {
    const focusSlot = slot({
      id: 'slot-2',
      confidence: 'high',
      source_urls: ['https://bendsource.com/listing', 'https://example.com/menu'],
    })

    const meta = getVenueTrustMeta(
      venue({
        website_url: 'https://example.com',
        happy_hour_slots: [
          {
            ...slot({
              id: 'slot-1',
              confidence: 'low',
              source_urls: ['https://other.example'],
            }),
            deals: [],
          },
          { ...focusSlot, deals: [] },
        ],
      }),
      focusSlot,
    )

    expect(meta.confidence).toBe('high')
    expect(meta.sourceCount).toBe(2)
  })

  it('dedupes source urls and excludes the venue website from the count', () => {
    const meta = getVenueTrustMeta(
      venue({
        website_url: 'https://example.com',
        happy_hour_slots: [
          {
            ...slot({
              source_urls: [
                'https://example.com',
                'https://bendsource.com/listing',
                'https://bendsource.com/listing',
              ],
            }),
            deals: [],
          },
        ],
      }),
    )

    expect(meta.sourceCount).toBe(1)
  })
})

describe('venue trust labels', () => {
  it('formats source count labels', () => {
    expect(formatSourceCountLabel(1)).toBe('1 source')
    expect(formatSourceCountLabel(3)).toBe('3 sources')
  })

  it('maps confidence to badge labels', () => {
    expect(getConfidenceBadgeLabel('high')).toBe('High confidence')
    expect(getConfidenceBadgeLabel('medium')).toBe('Medium confidence')
    expect(getConfidenceBadgeLabel('low')).toBe('Unverified — check with venue')
    expect(getConfidenceBadgeLabel(null)).toBe('Unverified — check with venue')
  })

  it('detects unverified confidence', () => {
    expect(isUnverifiedConfidence('low')).toBe(true)
    expect(isUnverifiedConfidence(null)).toBe(true)
    expect(isUnverifiedConfidence('high')).toBe(false)
  })

  it('hides footer when there is no trust data', () => {
    expect(
      shouldShowVenueTrustFooter({
        freshnessDate: null,
        freshnessKind: null,
        confidence: null,
        sourceCount: 0,
      }),
    ).toBe(false)
  })
})

describe('getEventTrustMeta', () => {
  const venueTrust = {
    website_url: 'https://example.com',
    last_verified_at: null as string | null,
    last_scraped_at: null as string | null,
  }

  it('uses event-level verified and source counts', () => {
    const meta = getEventTrustMeta({
      confidence: 'high',
      source_urls: ['https://example.com/events', 'https://other.example/list'],
      last_scraped_at: '2026-03-01T12:00:00.000Z',
      last_verified_at: '2026-03-10T00:00:00.000Z',
      venue: venueTrust,
    })

    expect(meta.freshnessKind).toBe('verified')
    expect(meta.freshnessDate?.toISOString()).toBe('2026-03-10T00:00:00.000Z')
    expect(meta.confidence).toBe('high')
    expect(meta.sourceCount).toBe(2)
  })

  it('falls back to venue freshness when event timestamps are missing', () => {
    const meta = getEventTrustMeta({
      confidence: null,
      source_urls: [],
      last_scraped_at: null,
      last_verified_at: null,
      venue: {
        website_url: 'https://example.com',
        last_verified_at: '2026-03-08T00:00:00.000Z',
        last_scraped_at: null,
      },
    })

    expect(meta.freshnessKind).toBe('verified')
    expect(meta.freshnessDate?.toISOString()).toBe('2026-03-08T00:00:00.000Z')
  })

  it('treats admin-verified events without confidence as high confidence', () => {
    const meta = getEventTrustMeta({
      confidence: null,
      source_urls: [],
      last_scraped_at: null,
      last_verified_at: '2026-03-10T00:00:00.000Z',
      venue: venueTrust,
    })

    expect(getConfidenceBadgeLabel(meta.confidence)).toBe('High confidence')
  })
})

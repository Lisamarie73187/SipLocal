import { describe, expect, it } from 'vitest'

import { DEFAULT_FILTERS } from '@/hooks/useDiscoveryFilters'
import type { HappyHourSlot } from '@/types/venue'
import type { VenueDetail } from '@/types/venue'

import { venueMatchesDiscoveryFilters } from './discoveryFilters'
import {
  getVenueTimelinePlacement,
  getVenueTimelinePlacementForTimeAt,
} from '@/utils/happyHour'

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

const venue = (slots: HappyHourSlot[]): VenueDetail => ({
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
  website_url: null,
  is_published: true,
  is_featured: false,
  featured_until: null,
  price_level: '$$',
  data_status: 'live',
  place_id: null,
  yelp_id: null,
  yelp_rating: null,
  yelp_review_count: null,
  last_scraped_at: null,
  last_verified_at: null,
  scraped_city: null,
  scraped_zip: null,
  scrape_content_hash: null,
  created_at: '',
  updated_at: '',
  happy_hour_slots: slots.map((happyHourSlot) => ({ ...happyHourSlot, deals: [] })),
})

describe('discoveryFilters search', () => {
  const now = new Date('2026-06-01T19:00:00-07:00')

  it('includes a name match even when there is no timeline placement', () => {
    const testVenue = venue([
      slot({ day_of_week: 0, start_time: '16:00', end_time: '18:00' }),
    ])
    testVenue.name = 'Riverside Taproom'

    const matches = venueMatchesDiscoveryFilters(
      testVenue,
      { ...DEFAULT_FILTERS, search: 'riverside' },
      now,
    )
    expect(matches).toBe(true)
  })

  it('excludes venues that do not match the search query', () => {
    const testVenue = venue([slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })])

    const matches = venueMatchesDiscoveryFilters(
      testVenue,
      { ...DEFAULT_FILTERS, search: 'nonexistent' },
      now,
    )
    expect(matches).toBe(false)
  })
})

describe('discoveryFilters default visibility', () => {
  const mondaySevenPm = new Date('2026-06-01T19:00:00-07:00')

  it('includes starting-soon venues by default', () => {
    const testVenue = venue([slot({ day_of_week: 1, start_time: '19:30', end_time: '21:00' })])
    const placement = getVenueTimelinePlacement(
      testVenue.happy_hour_slots,
      mondaySevenPm,
      'America/Los_Angeles',
    )
    expect(placement?.sectionId).toBe('starting_soon')

    const matches = venueMatchesDiscoveryFilters(testVenue, DEFAULT_FILTERS, mondaySevenPm)
    expect(matches).toBe(true)
  })

  it('excludes later-tonight venues when only live status filters are on', () => {
    const testVenue = venue([slot({ day_of_week: 1, start_time: '21:30', end_time: '23:00' })])
    const placement = getVenueTimelinePlacement(
      testVenue.happy_hour_slots,
      mondaySevenPm,
      'America/Los_Angeles',
    )
    expect(placement?.sectionId).toBe('later_tonight')

    const matches = venueMatchesDiscoveryFilters(testVenue, DEFAULT_FILTERS, mondaySevenPm)
    expect(matches).toBe(false)
  })

  it('includes starting-soon venues when that status filter is on', () => {
    const testVenue = venue([slot({ day_of_week: 1, start_time: '19:30', end_time: '21:00' })])
    const matches = venueMatchesDiscoveryFilters(
      testVenue,
      { ...DEFAULT_FILTERS, statusFilters: ['starting_soon'] },
      mondaySevenPm,
    )
    expect(matches).toBe(true)
  })
})

describe('discoveryFilters time filter', () => {
  const mondaySevenPm = new Date('2026-06-01T19:00:00-07:00')
  const mondayFivePmMinutes = 17 * 60

  it('includes venues with an active slot at the filtered time', () => {
    const testVenue = venue([slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })])
    const matches = venueMatchesDiscoveryFilters(
      testVenue,
      { ...DEFAULT_FILTERS, timeAtMinutes: mondayFivePmMinutes },
      mondaySevenPm,
    )
    expect(matches).toBe(true)
  })

  it('excludes venues whose happy hour has already ended before the filtered time', () => {
    const testVenue = venue([slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })])
    const matches = venueMatchesDiscoveryFilters(
      testVenue,
      { ...DEFAULT_FILTERS, timeAtMinutes: 15 * 60 },
      mondaySevenPm,
    )
    expect(matches).toBe(false)
  })

  it('includes venues even after happy hour ended when filtering for an earlier time today', () => {
    const testVenue = venue([slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })])
    const matches = venueMatchesDiscoveryFilters(
      testVenue,
      { ...DEFAULT_FILTERS, timeAtMinutes: mondayFivePmMinutes },
      mondaySevenPm,
    )
    expect(matches).toBe(true)
  })

  it('filters by venue price_level', () => {
    const activeSlot = slot({ day_of_week: 1, start_time: '16:00', end_time: '21:00' })
    const budgetVenue = { ...venue([activeSlot]), price_level: '$' as const }
    const upscaleVenue = { ...venue([activeSlot]), price_level: '$$$' as const }
    const filters = {
      ...DEFAULT_FILTERS,
      priceLevels: ['$'] as const,
      timeAtMinutes: mondayFivePmMinutes,
    }

    expect(venueMatchesDiscoveryFilters(budgetVenue, filters, mondaySevenPm)).toBe(true)
    expect(venueMatchesDiscoveryFilters(upscaleVenue, filters, mondaySevenPm)).toBe(false)
  })

  it('uses the slot active at the filtered time for timeline placement', () => {
    const slots = [
      slot({ id: '1', day_of_week: 1, start_time: '12:00', end_time: '14:00' }),
      slot({ id: '2', day_of_week: 1, start_time: '16:00', end_time: '18:00' }),
    ]
    const placement = getVenueTimelinePlacementForTimeAt(
      slots,
      'any',
      mondayFivePmMinutes,
      mondaySevenPm,
      'America/Los_Angeles',
    )
    expect(placement?.focusSlot.id).toBe('2')
    expect(placement?.hhWindow).toContain('4 PM')
  })
})

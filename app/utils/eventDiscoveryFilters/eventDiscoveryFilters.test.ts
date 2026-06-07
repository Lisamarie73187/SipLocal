import { describe, expect, it } from 'vitest'

import { DEFAULT_FILTERS } from '@/hooks/useDiscoveryFilters'
import type { EventDetail } from '@/types/event'
import { eventMatchesDiscoveryFilters } from './eventDiscoveryFilters'

function makeEvent(overrides: Partial<EventDetail> = {}): EventDetail {
  const now = new Date()
  return {
    id: 'event-1',
    city_id: 'city-1',
    venue_id: 'venue-1',
    title: 'Trivia Night',
    description: 'Weekly pub trivia',
    event_type: 'trivia',
    event_date: null,
    day_of_week: 3,
    start_time: '19:00:00',
    end_time: '21:00:00',
    is_published: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    city: { slug: 'bend-or', name: 'Bend', timezone: 'America/Los_Angeles' },
    venue: {
      id: 'venue-1',
      name: 'Deschutes Brewery',
      slug: 'deschutes',
      address_line1: '1044 NW Bond St',
      lat: 44.05,
      lng: -121.31,
      price_level: '$$',
      venue_types: ['brewery'],
      vibes: [],
    },
    ...overrides,
  }
}

describe('eventMatchesDiscoveryFilters', () => {
  it('matches search by event title', () => {
    const event = makeEvent()
    const filters = { ...DEFAULT_FILTERS, contentType: 'events' as const, search: 'trivia' }
    expect(eventMatchesDiscoveryFilters(event, filters, new Date())).toBe(true)
  })

  it('filters out events that do not match search', () => {
    const event = makeEvent()
    const filters = { ...DEFAULT_FILTERS, contentType: 'events' as const, search: 'jazz' }
    expect(eventMatchesDiscoveryFilters(event, filters, new Date())).toBe(false)
  })
})

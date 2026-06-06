import { describe, expect, it } from 'vitest'

import type { VenueDetail } from '@/types/venue'

import { getOwnerPreviewCardSubtitle, getVenueDisplaySubtitle } from './venueDisplay'

const baseVenue = (): VenueDetail => ({
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
  community_verified_at: null,
  scraped_city: null,
  scraped_zip: null,
  scrape_content_hash: null,
  created_at: '',
  updated_at: '',
  happy_hour_slots: [],
})

describe('getVenueDisplaySubtitle', () => {
  it('shows the scraped description when present', () => {
    const subtitle = getVenueDisplaySubtitle({
      ...baseVenue(),
      venue_type: 'restaurant',
      description: 'Downtown brewpub with a sunny patio and local craft beers.',
    })

    expect(subtitle).toBe('Downtown brewpub with a sunny patio and local craft beers.')
  })

  it('falls back to venue type when description is missing', () => {
    expect(
      getVenueDisplaySubtitle({
        ...baseVenue(),
        venue_type: 'bar',
        description: null,
      }),
    ).toBe('Bar')
  })

  it('ignores scrape notes', () => {
    expect(
      getVenueDisplaySubtitle({
        ...baseVenue(),
        description: 'Scrape note: Happy hour mentioned but no savable windows.',
      }),
    ).toBe('Happy hour spot')
  })
})

describe('getOwnerPreviewCardSubtitle', () => {
  it('matches the public map subtitle logic', () => {
    expect(
      getOwnerPreviewCardSubtitle({
        ...baseVenue(),
        venue_type: 'brewery',
        description: 'Iconic Bend brewery with Northwest pub fare and house beers on tap.',
      }),
    ).toBe('Iconic Bend brewery with Northwest pub fare and house beers on tap.')
  })

  it('falls back to venue type when description is missing', () => {
    expect(
      getOwnerPreviewCardSubtitle({
        ...baseVenue(),
        venue_type: 'bar',
        description: null,
      }),
    ).toBe('Bar')
  })

  it('ignores scrape notes like the public map', () => {
    expect(
      getOwnerPreviewCardSubtitle({
        ...baseVenue(),
        description: 'Scrape note: Happy hour mentioned but no savable windows.',
      }),
    ).toBe('Happy hour spot')
  })
})

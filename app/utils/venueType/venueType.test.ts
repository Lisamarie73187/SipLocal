import { describe, expect, it } from 'vitest'

import { getVenueCategoryEmoji, inferVenueType } from './venueType'

describe('venueType', () => {
  it('infers brewery before bar when both keywords appear', () => {
    expect(
      inferVenueType({
        name: 'Deschutes Brewery',
        description: 'Bend brewery and pub',
      }),
    ).toBe('brewery')
  })

  it('returns category emoji for venue type', () => {
    expect(
      getVenueCategoryEmoji({
        name: 'Bar Río',
        description: 'Tequila and tacos',
        venue_types: [],
      }),
    ).toBe('🍸')
  })
})

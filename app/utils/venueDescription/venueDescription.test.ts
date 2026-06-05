import { describe, expect, it } from 'vitest'

import { MAX_VENUE_DESCRIPTION_LENGTH, truncateVenueDescription } from './venueDescription'

describe('truncateVenueDescription', () => {
  it('leaves short text unchanged', () => {
    const text = 'Neighborhood pub with craft beer and pub fare.'
    expect(truncateVenueDescription(text)).toBe(text)
  })

  it('truncates long text with an ellipsis', () => {
    const text =
      'Cozy downtown hangout with craft pours, local favorites, and rotating weekly specials on the board every night of the week in Bend Oregon.'
    const result = truncateVenueDescription(text)

    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(MAX_VENUE_DESCRIPTION_LENGTH + 1)
  })
})

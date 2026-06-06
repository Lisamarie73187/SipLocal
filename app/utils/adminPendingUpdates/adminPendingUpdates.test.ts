import { describe, expect, it } from 'vitest'

import { classifyPendingVenueUpdate } from './adminPendingUpdates'

describe('classifyPendingVenueUpdate', () => {
  it('routes linked-manager venues to the manager queue', () => {
    expect(classifyPendingVenueUpdate(true, 3, 'pending_review')).toBe('manager')
    expect(classifyPendingVenueUpdate(true, 0, 'pending_review')).toBe('manager')
  })

  it('routes discovered and scraped venues without managers to staff review', () => {
    expect(classifyPendingVenueUpdate(false, 5, 'pending_review')).toBe('staff')
    expect(classifyPendingVenueUpdate(false, 0, 'discovered')).toBe('staff')
    expect(classifyPendingVenueUpdate(false, 2, 'no_happy_hour_found')).toBe('staff')
  })
})

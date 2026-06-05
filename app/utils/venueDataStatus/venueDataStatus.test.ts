import { describe, expect, it } from 'vitest'

import {
  reconcileVenueDataStatus,
  validateVenueBeforeSave,
  venueStatusMismatch,
} from './venueDataStatus'

describe('reconcileVenueDataStatus', () => {
  it('promotes no_happy_hour_found when slots exist', () => {
    expect(reconcileVenueDataStatus('no_happy_hour_found', 2)).toBe('pending_review')
  })

  it('promotes discovered when slots exist', () => {
    expect(reconcileVenueDataStatus('discovered', 1)).toBe('pending_review')
  })

  it('keeps live when user requested live', () => {
    expect(reconcileVenueDataStatus('live', 0)).toBe('live')
  })
})

describe('validateVenueBeforeSave', () => {
  it('requires slots for live', () => {
    expect(validateVenueBeforeSave('live', 0, false)).toContain('happy hour slot')
  })
})

describe('venueStatusMismatch', () => {
  it('warns when slots exist but status says none', () => {
    expect(venueStatusMismatch('no_happy_hour_found', 1)).toContain('Has happy hour slots')
  })
})

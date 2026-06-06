import { describe, expect, it } from 'vitest'

import type { HappyHourSlotFormState } from '@/components/HappyHourSlotsEditor/HappyHourSlotsEditor.types'
import { getVenueTimelinePlacement } from '@/utils/happyHour'

import { formSlotsToPreviewSlots, getOwnerPreviewListPlacement } from './ownerPreviewVenue'

const weekdaySlot: HappyHourSlotFormState = {
  key: 'weekday',
  days: [1, 2, 3, 4, 5],
  start_time: '16:00',
  end_time: '18:00',
  deal_summary: '',
  deals: [],
}

describe('getOwnerPreviewListPlacement', () => {
  it('matches live placement when a slot is active or upcoming today', () => {
    const previewSlots = formSlotsToPreviewSlots([weekdaySlot], 'venue-1')
    const mondayFivePm = new Date('2026-06-01T17:00:00-07:00')
    const timeZone = 'America/Los_Angeles'

    const live = getVenueTimelinePlacement(previewSlots, mondayFivePm, timeZone)
    const preview = getOwnerPreviewListPlacement(previewSlots, mondayFivePm, timeZone)

    expect(preview).toEqual(live)
    expect(preview?.hhWindow).toBe('4 PM – 6 PM')
  })

  it('falls back to the first configured slot when today has no live window', () => {
    const previewSlots = formSlotsToPreviewSlots([weekdaySlot], 'venue-1')
    const saturdayNoon = new Date('2026-06-06T12:00:00-07:00')
    const timeZone = 'America/Los_Angeles'

    expect(getVenueTimelinePlacement(previewSlots, saturdayNoon, timeZone)).toBeNull()

    const preview = getOwnerPreviewListPlacement(previewSlots, saturdayNoon, timeZone)

    expect(preview?.hhWindow).toBe('4 PM – 6 PM')
    expect(preview?.focusSlot?.day_of_week).toBe(1)
  })

  it('falls back to today slot after happy hour has ended', () => {
    const previewSlots = formSlotsToPreviewSlots([weekdaySlot], 'venue-1')
    const fridayEvening = new Date('2026-06-05T19:00:00-07:00')
    const timeZone = 'America/Los_Angeles'

    expect(getVenueTimelinePlacement(previewSlots, fridayEvening, timeZone)).toBeNull()

    const preview = getOwnerPreviewListPlacement(previewSlots, fridayEvening, timeZone)

    expect(preview?.hhWindow).toBe('4 PM – 6 PM')
    expect(preview?.focusSlot?.day_of_week).toBe(5)
  })
})

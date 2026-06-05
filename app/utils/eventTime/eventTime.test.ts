import { describe, expect, it } from 'vitest'

import {
  getEventTimelinePlacement,
  isEventOnViewDay,
} from './eventTime'

describe('recurring event timeline', () => {
  const schedule = {
    event_date: null,
    day_of_week: 4,
    start_time: '19:00:00',
    end_time: '21:00:00',
  }

  it('matches a specific weekday filter', () => {
    const thursdayNoon = new Date('2026-06-04T12:00:00-07:00')
    expect(isEventOnViewDay(schedule, 4, thursdayNoon, 'America/Los_Angeles')).toBe(true)
    expect(isEventOnViewDay(schedule, 1, thursdayNoon, 'America/Los_Angeles')).toBe(false)
  })

  it('places a later-today event on the matching weekday', () => {
    const thursdayFourPm = new Date('2026-06-04T16:00:00-07:00')
    const placement = getEventTimelinePlacement(
      schedule,
      'any',
      thursdayFourPm,
      'America/Los_Angeles',
    )

    expect(placement?.sectionId).toBe('later_tonight')
    expect(placement?.timeWindow).toContain('7')
  })
})

describe('dated event timeline', () => {
  const schedule = {
    event_date: '2026-06-06',
    day_of_week: null,
    start_time: '18:00:00',
    end_time: '20:00:00',
  }

  it('shows on the calendar date when viewing that weekday in the future', () => {
    const monday = new Date('2026-06-01T12:00:00-07:00')
    const placement = getEventTimelinePlacement(schedule, 6, monday, 'America/Los_Angeles')

    expect(placement?.sectionId).toBe('upcoming')
    expect(placement?.badgeLabel).toContain('Jun')
  })

  it('only appears on its date when browsing any day', () => {
    const friday = new Date('2026-06-06T12:00:00-07:00')
    expect(isEventOnViewDay(schedule, 'any', friday, 'America/Los_Angeles')).toBe(true)

    const thursday = new Date('2026-06-05T12:00:00-07:00')
    expect(isEventOnViewDay(schedule, 'any', thursday, 'America/Los_Angeles')).toBe(false)
  })
})

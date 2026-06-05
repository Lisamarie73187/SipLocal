import { describe, expect, it } from 'vitest'

import {
  buildHappyHourScheduleKey,
  formatHappyHourDayLabel,
  groupHappyHourSlotsForDisplay,
} from './happyHourSchedule'

describe('formatHappyHourDayLabel', () => {
  it('formats Monday through Friday as a range', () => {
    expect(formatHappyHourDayLabel([1, 2, 3, 4, 5])).toBe('Monday–Friday')
  })

  it('formats weekend days', () => {
    expect(formatHappyHourDayLabel([0, 6])).toBe('Saturday–Sunday')
  })

  it('formats non-consecutive days separately', () => {
    expect(formatHappyHourDayLabel([1, 3, 5])).toBe('Monday, Wednesday, Friday')
  })
})

describe('groupHappyHourSlotsForDisplay', () => {
  it('merges duplicate schedules across days', () => {
    const groups = groupHappyHourSlotsForDisplay(
      [
        { day_of_week: 1, start_time: '16:00:00', end_time: '18:00:00', deal_summary: 'Pints' },
        { day_of_week: 2, start_time: '16:00:00', end_time: '18:00:00', deal_summary: 'Pints' },
        { day_of_week: 3, start_time: '16:00:00', end_time: '18:00:00', deal_summary: 'Pints' },
      ],
      { activeOnly: false },
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]?.dayLabel).toBe('Monday–Wednesday')
    expect(groups[0]?.days).toEqual([1, 2, 3])
  })

  it('keeps different time windows separate', () => {
    const groups = groupHappyHourSlotsForDisplay(
      [
        { day_of_week: 1, start_time: '16:00:00', end_time: '18:00:00', deal_summary: null },
        { day_of_week: 1, start_time: '21:00:00', end_time: '23:00:00', deal_summary: null },
      ],
      { activeOnly: false },
    )

    expect(groups).toHaveLength(2)
  })

  it('dedupes the same day and schedule twice', () => {
    const key = buildHappyHourScheduleKey({
      start_time: '16:00:00',
      end_time: '18:00:00',
      deal_summary: 'Same',
    })
    const groups = groupHappyHourSlotsForDisplay(
      [
        { day_of_week: 4, start_time: '16:00:00', end_time: '18:00:00', deal_summary: 'Same' },
        { day_of_week: 4, start_time: '16:00:00', end_time: '18:00:00', deal_summary: 'Same' },
      ],
      { activeOnly: false },
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]?.key).toBe(key)
    expect(groups[0]?.days).toEqual([4])
  })
})

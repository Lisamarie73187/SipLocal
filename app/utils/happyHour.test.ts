import { describe, expect, it } from 'vitest'

import {
  getHappyHourStatus,
  getVenueMapPinStatus,
  getVenueTimelinePlacement,
  getVenueTimelinePlacementForViewDay,
  resolveDisplayStatusBadgeLabel,
  highestMapPinStatus,
  isSlotActiveNow,
  slotMatchesTimeRange,
  timeToMinutes,
} from './happyHour'
import type { HappyHourSlot } from '@/types/venue'

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

describe('happyHour utils', () => {
  it('converts time strings to minutes', () => {
    expect(timeToMinutes('16:30')).toBe(990)
  })

  it('detects an active slot in timezone', () => {
    const mondayFivePm = new Date('2026-06-01T17:00:00-07:00')
    expect(
      isSlotActiveNow(slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' }), mondayFivePm, 'America/Los_Angeles'),
    ).toBe(true)
  })

  it('returns active status label', () => {
    const mondayFivePm = new Date('2026-06-01T17:00:00-07:00')
    const status = getHappyHourStatus(
      [slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })],
      mondayFivePm,
      'America/Los_Angeles',
    )
    expect(status.kind).toBe('active')
    expect(status.label).toContain('Happy hour now')
  })

  it('places active venues in happening now', () => {
    const mondayFivePm = new Date('2026-06-01T17:00:00-07:00')
    const placement = getVenueTimelinePlacement(
      [slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })],
      mondayFivePm,
      'America/Los_Angeles',
    )
    expect(placement?.sectionId).toBe('happening_now')
    expect(placement?.badgeLabel).toBe('Open now')
  })

  it('places upcoming venues in starting soon within 60 minutes', () => {
    const mondayFourPm = new Date('2026-06-01T16:00:00-07:00')
    const placement = getVenueTimelinePlacement(
      [slot({ day_of_week: 1, start_time: '16:30', end_time: '18:00' })],
      mondayFourPm,
      'America/Los_Angeles',
    )
    expect(placement?.sectionId).toBe('starting_soon')
    expect(placement?.badgeLabel).toContain('Starts in')
  })

  it('hides starts-in badge copy when not viewing today', () => {
    expect(resolveDisplayStatusBadgeLabel('Starts in 30 min', false)).toBeNull()
    expect(resolveDisplayStatusBadgeLabel('Starts in 30 min', true)).toBe('Starts in 30 min')
    expect(resolveDisplayStatusBadgeLabel('Wednesday', false)).toBe('Wednesday')
  })

  it('places venues on another weekday by start time', () => {
    const mondayFivePm = new Date('2026-06-01T17:00:00-07:00')
    const placement = getVenueTimelinePlacementForViewDay(
      [slot({ day_of_week: 3, start_time: '16:00', end_time: '18:00' })],
      3,
      mondayFivePm,
      'America/Los_Angeles',
    )
    expect(placement?.sectionTitle).toBe('4 PM')
    expect(placement?.badgeLabel).toBe('Wednesday')
  })

  it('filters slots by time range overlap', () => {
    const afternoon = slot({ start_time: '16:00', end_time: '18:00' })
    const evening = slot({ start_time: '17:30', end_time: '19:00' })
    expect(
      slotMatchesTimeRange(afternoon, { startMinutes: 15 * 60, endMinutes: 18 * 60 }),
    ).toBe(true)
    expect(
      slotMatchesTimeRange(afternoon, { startMinutes: 12 * 60, endMinutes: 15 * 60 }),
    ).toBe(false)
    expect(
      slotMatchesTimeRange(evening, { startMinutes: 17 * 60, endMinutes: 19 * 60 }),
    ).toBe(true)
  })

  it('maps timeline placement to map pin status', () => {
    const mondayFivePm = new Date('2026-06-01T17:00:00-07:00')
    expect(
      getVenueMapPinStatus(
        [slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })],
        mondayFivePm,
        'America/Los_Angeles',
      ),
    ).toBe('happening_now')

    const mondayFourPm = new Date('2026-06-01T16:00:00-07:00')
    expect(
      getVenueMapPinStatus(
        [slot({ day_of_week: 1, start_time: '16:30', end_time: '18:00' })],
        mondayFourPm,
        'America/Los_Angeles',
      ),
    ).toBe('starting_soon')

    const mondayOnePm = new Date('2026-06-01T13:00:00-07:00')
    expect(
      getVenueMapPinStatus(
        [slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })],
        mondayOnePm,
        'America/Los_Angeles',
      ),
    ).toBe('later_tonight')
  })

  it('picks highest-priority pin status for clusters', () => {
    expect(
      highestMapPinStatus(['later_tonight', 'starting_soon', 'happening_now']),
    ).toBe('happening_now')
    expect(highestMapPinStatus(['later_tonight', 'starting_soon'])).toBe('starting_soon')
  })

  it('uses other_day pin status when viewing a different weekday', () => {
    const wednesdayNoon = new Date('2026-06-04T12:00:00-07:00')
    expect(
      getVenueMapPinStatus(
        [slot({ day_of_week: 1, start_time: '16:00', end_time: '18:00' })],
        wednesdayNoon,
        'America/Los_Angeles',
        1,
      ),
    ).toBe('other_day')
  })
})

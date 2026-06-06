import { describe, expect, it } from 'vitest'

import type { HappyHourSlotWithDeals } from '@/types/venue'

import {
  formatDealDisplayText,
  getDealChipsForSlot,
  getDealChipsForVenuePanel,
  getDealScheduleDescription,
  getTodayDealChips,
} from './dealChips'

const previewSlot = (
  overrides: Partial<HappyHourSlotWithDeals> & Pick<HappyHourSlotWithDeals, 'id'>,
): HappyHourSlotWithDeals => ({
  venue_id: 'venue-1',
  day_of_week: 1,
  start_time: '16:00:00',
  end_time: '18:00:00',
  deal_summary: null,
  categories: ['drinks'],
  is_active: true,
  confidence: null,
  conflicts: null,
  data_status: 'live',
  last_scraped_at: null,
  source_urls: [],
  created_at: '',
  updated_at: '',
  deals: [],
  ...overrides,
})

describe('formatDealDisplayText', () => {
  it('puts price with $ before the label', () => {
    expect(formatDealDisplayText('draft pints', '5')).toBe('$5 draft pints')
    expect(formatDealDisplayText('apps', '$7')).toBe('$7 apps')
  })

  it('returns label only when price is missing', () => {
    expect(formatDealDisplayText('half-off wine', null)).toBe('half-off wine')
  })

  it('keeps non-numeric price text without forcing $', () => {
    expect(formatDealDisplayText('house wine', 'half off')).toBe('half off house wine')
  })
})

describe('getDealChipsForSlot', () => {
  it('returns empty when only empty deal rows and a summary exist', () => {
    const slot = previewSlot({
      id: 'slot-1',
      deal_summary: '$5 pints, half-off apps',
      deals: [{ id: 'd1', slot_id: 'slot-1', label: '', category: 'drinks', price_text: null, sort_order: 0, created_at: '' }],
    })

    expect(getDealChipsForSlot([slot], slot, 4)).toEqual([])
  })

  it('returns chips from labeled deal rows only', () => {
    const slot = previewSlot({
      id: 'slot-1',
      deal_summary: 'Old summary',
      deals: [
        {
          id: 'd1',
          slot_id: 'slot-1',
          label: 'draft pints',
          category: 'drinks',
          price_text: '5',
          sort_order: 0,
          created_at: '',
        },
      ],
    })

    expect(getDealChipsForSlot([slot], slot, 4)).toEqual(['$5 draft pints'])
  })
})

describe('getTodayDealChips', () => {
  it('falls back to weekday slots when today has no happy hour', () => {
    const mondaySlot = previewSlot({
      id: 'slot-mon',
      day_of_week: 1,
      deals: [
        {
          id: 'd1',
          slot_id: 'slot-mon',
          label: 'wine',
          category: 'drinks',
          price_text: '6',
          sort_order: 0,
          created_at: '',
        },
      ],
    })
    const saturdayNoon = new Date('2026-06-06T12:00:00-07:00')

    expect(getTodayDealChips([mondaySlot], saturdayNoon, 'America/Los_Angeles', 4)).toEqual([
      '$6 wine',
    ])
  })
})

describe('getDealScheduleDescription', () => {
  it('returns deal summary only', () => {
    const slot = previewSlot({
      id: 'slot-1',
      deal_summary: 'Weekday happy hour',
      deals: [
        {
          id: 'd1',
          slot_id: 'slot-1',
          label: 'draft pints',
          category: 'drinks',
          price_text: '5',
          sort_order: 0,
          created_at: '',
        },
      ],
    })

    expect(getDealScheduleDescription(slot)).toBe('Weekday happy hour')
  })

  it('returns null when summary is empty', () => {
    const slot = previewSlot({
      id: 'slot-1',
      deals: [
        {
          id: 'd1',
          slot_id: 'slot-1',
          label: 'draft pints',
          category: 'drinks',
          price_text: '5',
          sort_order: 0,
          created_at: '',
        },
      ],
    })

    expect(getDealScheduleDescription(slot)).toBeNull()
  })
})

describe('getDealChipsForVenuePanel', () => {
  it('uses focus slot deals when available', () => {
    const slot = previewSlot({
      id: 'slot-1',
      deals: [
        {
          id: 'd1',
          slot_id: 'slot-1',
          label: 'apps',
          category: 'food',
          price_text: '7',
          sort_order: 0,
          created_at: '',
        },
      ],
    })
    const now = new Date('2026-06-01T17:00:00-07:00')

    expect(
      getDealChipsForVenuePanel([slot], slot, now, 'America/Los_Angeles', 6),
    ).toEqual(['$7 apps'])
  })
})

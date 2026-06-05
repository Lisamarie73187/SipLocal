import { describe, expect, it } from 'vitest'

import { expandGroupedSlotsForSave, groupSlotsForEditor } from './happyHourEditorSlots'

const baseSlot = {
  start_time: '16:00',
  end_time: '18:00',
  deal_summary: null,
  data_status: 'pending_review' as const,
  is_active: true,
  confidence: null,
  source_urls: [] as string[],
  deals: [{ label: '$5 drafts', category: 'drinks', price_text: null }],
}

describe('happyHourEditorSlots', () => {
  it('groups identical weekday slots into one editor row', () => {
    const grouped = groupSlotsForEditor([
      { ...baseSlot, day_of_week: 1 },
      { ...baseSlot, day_of_week: 2 },
      { ...baseSlot, day_of_week: 3 },
    ])

    expect(grouped).toHaveLength(1)
    expect(grouped[0]?.days).toEqual([1, 2, 3])
  })

  it('expands grouped slots back to one row per day', () => {
    const grouped = groupSlotsForEditor([
      { ...baseSlot, day_of_week: 1 },
      { ...baseSlot, day_of_week: 2 },
    ])

    const expanded = expandGroupedSlotsForSave(grouped)
    expect(expanded).toHaveLength(2)
    expect(expanded.map((slot) => slot.day_of_week)).toEqual([1, 2])
  })
})

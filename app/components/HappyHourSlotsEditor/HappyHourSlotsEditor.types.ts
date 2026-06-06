import type { DayOfWeek } from '@/types/venue'
import type { Database } from '@/types/database'

export interface HappyHourSlotFormState {
  key: string
  days: DayOfWeek[]
  start_time: string
  end_time: string
  deal_summary: string | null
  deals: Array<{
    label: string
    category: Database['public']['Enums']['deal_category']
    price_text: string | null
  }>
}

export function newEmptyHappyHourSlot(): HappyHourSlotFormState {
  return {
    key: `slot-${crypto.randomUUID()}`,
    days: [1],
    start_time: '16:00',
    end_time: '18:00',
    deal_summary: null,
    deals: [{ label: '', category: 'drinks', price_text: null }],
  }
}

export function duplicateHappyHourSlot(slot: HappyHourSlotFormState): HappyHourSlotFormState {
  return {
    ...slot,
    key: `slot-${crypto.randomUUID()}`,
    deals: slot.deals.map((deal) => ({ ...deal })),
  }
}

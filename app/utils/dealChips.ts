import type { HappyHourSlot, HappyHourSlotWithDeals } from '@/types/venue'

import {
  getDayOfWeekInTimezone,
  getHappyHourStatus,
  getMinutesInTimezone,
  getSlotsForDay,
  timeToMinutes,
} from './happyHour'

export function getDealChipsForSlot(
  slots: HappyHourSlotWithDeals[],
  focusSlot: Pick<HappyHourSlot, 'id'> | null | undefined,
  limit = 4,
): string[] {
  if (!focusSlot) {
    return []
  }

  const slotWithDeals = slots.find((slot) => slot.id === focusSlot.id)
  if (!slotWithDeals) {
    return []
  }

  if (slotWithDeals.deals?.length) {
    return slotWithDeals.deals.slice(0, limit).map((deal) =>
      deal.price_text ? `${deal.label} ${deal.price_text}` : deal.label,
    )
  }

  if (slotWithDeals.deal_summary?.trim()) {
    return [slotWithDeals.deal_summary.trim()]
  }

  return []
}

export function getTodayDealChips(
  slots: HappyHourSlotWithDeals[],
  now: Date,
  timeZone: string,
  limit = 4,
): string[] {
  const status = getHappyHourStatus(slots, now, timeZone)
  const today = getDayOfWeekInTimezone(now, timeZone)
  const todaySlots = getSlotsForDay(slots, today).sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
  )

  const focusSlot =
    status.activeSlot ??
    todaySlots.find(
      (slot) => timeToMinutes(slot.start_time) > getMinutesInTimezone(now, timeZone),
    ) ??
    todaySlots[0]

  return getDealChipsForSlot(slots, focusSlot, limit)
}

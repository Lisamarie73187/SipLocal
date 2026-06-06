import type { HappyHourSlot, HappyHourSlotWithDeals } from '@/types/venue'

import {
  getDayOfWeekInTimezone,
  getHappyHourStatus,
  getMinutesInTimezone,
  getSlotsForDay,
  timeToMinutes,
} from '@/utils/happyHour'

/** Side panel / map overlay: price first, with $ on numeric amounts. */
export function formatDealDisplayText(
  label: string,
  priceText: string | null | undefined,
): string {
  const trimmedLabel = label.trim()
  const trimmedPrice = priceText?.trim()

  if (!trimmedPrice) {
    return trimmedLabel
  }

  const displayPrice = trimmedPrice.startsWith('$') || !/^\d/.test(trimmedPrice)
    ? trimmedPrice
    : `$${trimmedPrice}`

  return `${displayPrice} ${trimmedLabel}`
}

function collectDealChipsFromSlot(
  slotWithDeals: HappyHourSlotWithDeals,
  limit: number,
): string[] {
  return (slotWithDeals.deals ?? [])
    .filter((deal) => deal.label.trim())
    .slice(0, limit)
    .map((deal) => formatDealDisplayText(deal.label, deal.price_text))
}

/** Plain-text deal summary for the schedule section (not chips). */
export function getDealScheduleDescription(slot: HappyHourSlotWithDeals): string | null {
  return slot.deal_summary?.trim() || null
}

function resolveSlotWithDeals(
  slots: HappyHourSlotWithDeals[],
  focusSlot: Pick<HappyHourSlot, 'id' | 'day_of_week' | 'start_time' | 'end_time'>,
): HappyHourSlotWithDeals | undefined {
  const byId = slots.find((slot) => slot.id === focusSlot.id)
  if (byId) {
    return byId
  }

  return slots.find(
    (slot) =>
      slot.day_of_week === focusSlot.day_of_week &&
      slot.start_time === focusSlot.start_time &&
      slot.end_time === focusSlot.end_time,
  )
}

export function getDealChipsForSlot(
  slots: HappyHourSlotWithDeals[],
  focusSlot: Pick<HappyHourSlot, 'id'> | null | undefined,
  limit = 4,
): string[] {
  if (!focusSlot) {
    return []
  }

  const slotWithDeals = resolveSlotWithDeals(
    slots,
    focusSlot as Pick<HappyHourSlot, 'id' | 'day_of_week' | 'start_time' | 'end_time'>,
  )
  if (!slotWithDeals) {
    return []
  }

  return collectDealChipsFromSlot(slotWithDeals, limit)
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

  if (focusSlot) {
    const chips = getDealChipsForSlot(slots, focusSlot, limit)
    if (chips.length > 0) {
      return chips
    }
  }

  for (const slot of slots) {
    const chips = getDealChipsForSlot(slots, slot, limit)
    if (chips.length > 0) {
      return chips
    }
  }

  return []
}

/** Resolve specials for the map slide-out, with fallbacks when focus/today have none. */
export function getDealChipsForVenuePanel(
  slots: HappyHourSlotWithDeals[],
  focusSlot: Pick<HappyHourSlot, 'id'> | null | undefined,
  now: Date,
  timeZone: string,
  limit = 6,
): string[] {
  if (focusSlot) {
    const fromFocus = getDealChipsForSlot(slots, focusSlot, limit)
    if (fromFocus.length > 0) {
      return fromFocus
    }
  }

  return getTodayDealChips(slots, now, timeZone, limit)
}

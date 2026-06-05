import type { DayOfWeek } from '@/types/venue'

import { getDayName } from '@/utils/happyHour'

export interface HappyHourScheduleSlotLike {
  day_of_week: number
  start_time: string
  end_time: string
  deal_summary?: string | null
  is_active?: boolean
}

export interface HappyHourScheduleGroup<T extends HappyHourScheduleSlotLike> {
  key: string
  days: DayOfWeek[]
  dayLabel: string
  start_time: string
  end_time: string
  deal_summary: string | null
  slots: T[]
}

/** Groups slots that share the same time window and deal summary (dedupes per day). */
export function buildHappyHourScheduleKey(
  slot: Pick<HappyHourScheduleSlotLike, 'start_time' | 'end_time' | 'deal_summary'>,
): string {
  const start = slot.start_time.slice(0, 5)
  const end = slot.end_time.slice(0, 5)
  const summary = (slot.deal_summary ?? '').trim()
  return `${start}|${end}|${summary}`
}

/**
 * Formats day lists for display, e.g. "Monday–Friday" or "Saturday, Sunday".
 */
export function formatHappyHourDayLabel(days: DayOfWeek[]): string {
  const unique = [...new Set(days)].sort((a, b) => a - b) as DayOfWeek[]
  if (unique.length === 0) {
    return ''
  }
  if (unique.length === 7) {
    return 'Every day'
  }

  if (unique.length === 2 && unique.includes(0) && unique.includes(6)) {
    return 'Saturday–Sunday'
  }

  const runs: DayOfWeek[][] = []
  for (const day of unique) {
    const lastRun = runs[runs.length - 1]
    if (lastRun && day === lastRun[lastRun.length - 1] + 1) {
      lastRun.push(day)
    } else {
      runs.push([day])
    }
  }

  return runs.map(formatConsecutiveDayRun).join(', ')
}

function formatConsecutiveDayRun(run: DayOfWeek[]): string {
  if (run.length === 1) {
    return getDayName(run[0])
  }
  return `${getDayName(run[0])}–${getDayName(run[run.length - 1])}`
}

export function groupHappyHourSlotsForDisplay<T extends HappyHourScheduleSlotLike>(
  slots: T[],
  options?: { activeOnly?: boolean },
): HappyHourScheduleGroup<T>[] {
  const activeOnly = options?.activeOnly ?? true
  const map = new Map<string, HappyHourScheduleGroup<T>>()

  for (const slot of slots) {
    if (activeOnly && slot.is_active === false) {
      continue
    }

    const key = buildHappyHourScheduleKey(slot)
    const day = slot.day_of_week as DayOfWeek
    const existing = map.get(key)

    if (existing) {
      if (!existing.days.includes(day)) {
        existing.days.push(day)
        existing.days.sort((a, b) => a - b)
        existing.dayLabel = formatHappyHourDayLabel(existing.days)
      }
      existing.slots.push(slot)
      continue
    }

    map.set(key, {
      key,
      days: [day],
      dayLabel: formatHappyHourDayLabel([day]),
      start_time: slot.start_time,
      end_time: slot.end_time,
      deal_summary: slot.deal_summary ?? null,
      slots: [slot],
    })
  }

  return [...map.values()].sort((a, b) => {
    const dayDiff = a.days[0] - b.days[0]
    if (dayDiff !== 0) {
      return dayDiff
    }
    return a.start_time.localeCompare(b.start_time)
  })
}

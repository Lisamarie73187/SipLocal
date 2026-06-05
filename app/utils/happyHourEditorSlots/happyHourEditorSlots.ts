import type { DayOfWeek } from '@/types/venue'

export interface EditorSlotLike {
  day_of_week: number
  start_time: string
  end_time: string
  deal_summary: string | null
  data_status: string
  is_active: boolean
  confidence: string | null
  source_urls: string[]
  deals: Array<{
    label: string
    category: string
    price_text: string | null
  }>
}

export type GroupedEditorSlot<T extends EditorSlotLike> = Omit<T, 'day_of_week'> & {
  days: DayOfWeek[]
}

function slotFingerprint(slot: EditorSlotLike): string {
  const dealsKey = slot.deals
    .map((deal) => `${deal.category}:${deal.label}:${deal.price_text ?? ''}`)
    .join('\n')

  return [
    slot.start_time,
    slot.end_time,
    (slot.deal_summary ?? '').trim(),
    dealsKey,
    slot.data_status,
    String(slot.is_active),
    slot.confidence ?? '',
    slot.source_urls.join(','),
  ].join('|')
}

/** Collapse identical Mon–Fri rows into one editor slot with multiple days. */
export function groupSlotsForEditor<T extends EditorSlotLike>(
  slots: T[],
): Array<GroupedEditorSlot<T>> {
  const groups = new Map<string, GroupedEditorSlot<T>>()

  for (const slot of slots) {
    const key = slotFingerprint(slot)
    const day = slot.day_of_week as DayOfWeek
    const existing = groups.get(key)

    if (existing) {
      if (!existing.days.includes(day)) {
        existing.days.push(day)
        existing.days.sort((a, b) => a - b)
      }
      continue
    }

    const { day_of_week: _day, ...rest } = slot
    groups.set(key, { ...rest, days: [day] })
  }

  return [...groups.values()].sort((a, b) => {
    const dayDiff = a.days[0] - b.days[0]
    if (dayDiff !== 0) {
      return dayDiff
    }
    return a.start_time.localeCompare(b.start_time)
  })
}

/** Expand grouped editor slots back to one DB row per day on save. */
export function expandGroupedSlotsForSave<T extends GroupedEditorSlot<EditorSlotLike>>(
  slots: T[],
): Array<Omit<T, 'days'> & { day_of_week: DayOfWeek }> {
  return slots.flatMap((slot) => {
    const uniqueDays = [...new Set(slot.days)].sort((a, b) => a - b) as DayOfWeek[]
    const { days: _days, ...rest } = slot

    return uniqueDays.map((day_of_week) => ({
      ...rest,
      day_of_week,
    }))
  })
}

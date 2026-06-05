import type { EventType } from '@/types/event'

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  trivia: 'Trivia',
  live_music: 'Live music',
  special: 'Special',
  other: 'Event',
}

export function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type] ?? 'Event'
}

export const EVENT_TYPE_ADMIN_OPTIONS: Array<{ value: EventType; label: string }> = (
  Object.entries(EVENT_TYPE_LABELS) as Array<[EventType, string]>
).map(([value, label]) => ({ value, label }))

import { createHash } from 'node:crypto'

import type { ScrapeConfidence } from '@/types/scrape'

export interface HappyHourHashPayload {
  days: number[]
  start_time: string
  end_time: string
  drink_specials: string[]
  food_specials: string[]
  notes: string | null
  confidence: ScrapeConfidence | null
}

function normalizeTime(value: string): string {
  const trimmed = value.trim()
  const match = /^(\d{1,2}):(\d{2})/.exec(trimmed)
  if (!match) {
    return trimmed
  }
  const hours = match[1].padStart(2, '0')
  const minutes = match[2]
  return `${hours}:${minutes}`
}

function normalizeSpecials(values: string[]): string[] {
  return [...values]
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
    .sort()
}

function normalizeNotes(notes: string | null): string | null {
  if (!notes) {
    return null
  }
  const trimmed = notes.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

/** Stable object used before hashing — safe to log (no secrets). */
export function normalizeHappyHourHashPayload(
  payload: HappyHourHashPayload,
): HappyHourHashPayload {
  return {
    days: [...payload.days].sort((a, b) => a - b),
    start_time: normalizeTime(payload.start_time),
    end_time: normalizeTime(payload.end_time),
    drink_specials: normalizeSpecials(payload.drink_specials),
    food_specials: normalizeSpecials(payload.food_specials),
    notes: normalizeNotes(payload.notes),
    confidence: payload.confidence,
  }
}

export function hashHappyHourContent(payload: HappyHourHashPayload): string {
  const normalized = normalizeHappyHourHashPayload(payload)
  const canonical = JSON.stringify(normalized)
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

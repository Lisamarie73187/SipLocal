import { z } from 'zod'

import type { ClaudeHappyHourExtraction } from '@/types/scrape'
import type { DayOfWeek } from '@/types/venue'

const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/

export const claudeHappyHourExtractionSchema = z.object({
  has_happy_hour: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
  days: z.array(z.string().min(1)),
  start_time: z.string().regex(TIME_PATTERN, 'Expected HH:MM (24h)'),
  end_time: z.string().regex(TIME_PATTERN, 'Expected HH:MM (24h)'),
  drink_specials: z.array(z.string()),
  food_specials: z.array(z.string()),
  notes: z.string().nullable(),
  source_urls: z.array(z.string().url()),
  last_verified: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .nullable(),
  conflicts: z.record(z.string(), z.unknown()).nullable().optional(),
})

const DAY_NAME_TO_DOW: Record<string, DayOfWeek> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

export interface ParseClaudeHappyHourResult {
  ok: true
  data: ClaudeHappyHourExtraction
}

export interface ParseClaudeHappyHourError {
  ok: false
  message: string
  issues?: string[]
}

export type ParseClaudeHappyHourOutcome =
  | ParseClaudeHappyHourResult
  | ParseClaudeHappyHourError

export function parseClaudeHappyHourJson(raw: unknown): ParseClaudeHappyHourOutcome {
  const parsed = claudeHappyHourExtractionSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Claude happy hour JSON failed validation',
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    }
  }

  return { ok: true, data: parsed.data }
}

/**
 * Converts Claude day names to JS day_of_week (0 = Sunday … 6 = Saturday).
 * Unknown names are dropped.
 */
export function claudeDaysToDayOfWeek(days: string[]): DayOfWeek[] {
  const result = new Set<DayOfWeek>()
  for (const day of days) {
    const key = day.trim().toLowerCase()
    const dow = DAY_NAME_TO_DOW[key]
    if (dow !== undefined) {
      result.add(dow)
    }
  }
  return [...result].sort((a, b) => a - b)
}

export function extractionToHashPayload(
  extraction: ClaudeHappyHourExtraction,
): import('./happyHourContentHash').HappyHourHashPayload {
  return {
    days: claudeDaysToDayOfWeek(extraction.days),
    start_time: extraction.start_time,
    end_time: extraction.end_time,
    drink_specials: extraction.drink_specials,
    food_specials: extraction.food_specials,
    notes: extraction.notes,
    confidence: extraction.confidence,
  }
}

export function meetsMinimumConfidence(
  confidence: ClaudeHappyHourExtraction['confidence'],
): boolean {
  return confidence === 'high' || confidence === 'medium'
}

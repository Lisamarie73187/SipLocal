import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import {
  parseHappyHourPasteSmart,
  parseHappyHourWithAnthropic,
} from '@/lib/scrape/parseHappyHourWithAnthropic'
import { parseHappyHourPaste, type ParseHappyHourPasteResult } from '@/utils/parseHappyHourPaste'

function toAuthError(error: unknown): Error {
  if (error instanceof AdminAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

export const parseHappyHourPasteAdmin = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      pasteText: z.string().min(1),
      forceAi: z.boolean().optional(),
    }),
  )
  .handler(async ({
    data,
  }): Promise<ParseHappyHourPasteResult & { parser: 'rules' | 'ai' }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    if (data.forceAi) {
      const ai = await parseHappyHourWithAnthropic(data.pasteText)
      return { ...ai, parser: 'ai' }
    }

    return parseHappyHourPasteSmart(data.pasteText)
  })

export const parsedHappyHourSlotSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1),
  start_time: z
    .string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Use HH:MM'),
  end_time: z
    .string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Use HH:MM'),
  deal_summary: z.string().nullable(),
})

export function slotsFromPasteResult(result: ParseHappyHourPasteResult): ParseHappyHourPasteResult {
  if (result.slots.length === 0) {
    throw new Error(result.warnings[0] ?? 'No happy hour slots found in paste.')
  }
  return result
}

export function parsePasteTextOrThrow(pasteText: string): ParseHappyHourPasteResult {
  return slotsFromPasteResult(parseHappyHourPaste(pasteText))
}

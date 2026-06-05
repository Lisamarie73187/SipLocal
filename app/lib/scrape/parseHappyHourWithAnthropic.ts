import { z } from 'zod'

import type { DayOfWeek } from '@/types/venue'
import {
  parseDayExpression,
  parseHappyHourPaste,
  parseTimeToken,
  isRulesParseComplete,
  type ParseHappyHourPasteResult,
  type ParsedHappyHourSlot,
} from '@/utils/parseHappyHourPaste'

import { getAnthropicApiKey, getAnthropicHappyHourModel } from './anthropicConfig'
import { ScrapeApiError } from './errors'

const aiResponseSchema = z.object({
  slots: z.array(
    z.object({
      days: z.array(z.union([z.number(), z.string()])).min(1),
      start_time: z.string(),
      end_time: z.string(),
      deal_summary: z.string().nullable().optional(),
    }),
  ),
  warnings: z.array(z.string()).optional(),
})

function normalizeDayValue(value: number | string): DayOfWeek[] | null {
  if (typeof value === 'number') {
    if (value >= 0 && value <= 6) {
      return [value as DayOfWeek]
    }
    return null
  }

  const trimmed = value.trim()
  if (/^\d$/.test(trimmed)) {
    const day = Number(trimmed)
    if (day >= 0 && day <= 6) {
      return [day as DayOfWeek]
    }
  }

  return parseDayExpression(trimmed)
}

function normalizeTimeValue(value: string, meridiemHint?: 'am' | 'pm'): string | null {
  const trimmed = value.trim()
  const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (twentyFourHour) {
    const hours = Number(twentyFourHour[1])
    const minutes = Number(twentyFourHour[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  return parseTimeToken(trimmed, meridiemHint)
}

export function normalizeAnthropicHappyHourResponse(raw: unknown): ParseHappyHourPasteResult {
  const parsed = aiResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      slots: [],
      warnings: ['AI response did not match the expected schedule format.'],
      unparsedBlocks: [],
    }
  }

  const slots: ParsedHappyHourSlot[] = []
  const warnings = [...(parsed.data.warnings ?? [])]

  for (const slot of parsed.data.slots) {
    const days: DayOfWeek[] = []
    for (const dayValue of slot.days) {
      const resolved = normalizeDayValue(dayValue)
      if (!resolved) {
        warnings.push(`Skipped slot with unrecognized day: ${String(dayValue)}`)
        continue
      }
      days.push(...resolved)
    }

    const uniqueDays = [...new Set(days)].sort((a, b) => a - b) as DayOfWeek[]
    if (uniqueDays.length === 0) {
      continue
    }

    const endMeridiem = slot.end_time.match(/(am|pm)/i)?.[1]?.toLowerCase() as
      | 'am'
      | 'pm'
      | undefined
    const start_time = normalizeTimeValue(slot.start_time, endMeridiem)
    const end_time = normalizeTimeValue(slot.end_time, endMeridiem)
    if (!start_time || !end_time || start_time >= end_time) {
      warnings.push(`Skipped slot with invalid times: ${slot.start_time} – ${slot.end_time}`)
      continue
    }

    slots.push({
      days: uniqueDays,
      start_time,
      end_time,
      deal_summary: slot.deal_summary?.trim() || null,
    })
  }

  if (slots.length === 0 && warnings.length === 0) {
    warnings.push('No happy hour windows found in the pasted text.')
  }

  return { slots, warnings, unparsedBlocks: [] }
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] ?? text).trim()

  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end <= start) {
      throw new ScrapeApiError('AI response did not include JSON.', {
        code: 'parse_error',
        provider: 'anthropic',
      })
    }
    return JSON.parse(candidate.slice(start, end + 1))
  }
}

const SYSTEM_PROMPT = `You extract recurring weekly happy hour schedules from pasted venue text.

Return ONLY valid JSON (no markdown) with this shape:
{
  "slots": [
    {
      "days": [1, 2, 3, 4, 5],
      "start_time": "16:00",
      "end_time": "18:00",
      "deal_summary": "Optional short summary of specials"
    }
  ],
  "warnings": ["Optional notes about ambiguity"]
}

Rules:
- days use integers 0=Sunday through 6=Saturday. Group days that share the same window and deals into one slot.
- start_time and end_time use 24-hour HH:MM (e.g. 16:00). end_time must be after start_time.
- deal_summary is a concise plain-text summary of drink/food specials for that window.
- Ignore unrelated info (address, parking, brunch, etc.).
- If no happy hour is mentioned, return {"slots":[],"warnings":["No happy hour found"]}.`

export async function parseHappyHourWithAnthropic(pasteText: string): Promise<ParseHappyHourPasteResult> {
  const apiKey = getAnthropicApiKey()
  const model = getAnthropicHappyHourModel()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract happy hour slots from this pasted text:\n\n${pasteText.trim()}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new ScrapeApiError(`Anthropic API error (${response.status}): ${body.slice(0, 300)}`, {
      code: 'api_error',
      provider: 'anthropic',
      statusCode: response.status,
    })
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>
  }

  const text = payload.content
    ?.filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n')
    .trim()

  if (!text) {
    throw new ScrapeApiError('Anthropic returned an empty response.', {
      code: 'parse_error',
      provider: 'anthropic',
    })
  }

  return normalizeAnthropicHappyHourResponse(extractJsonObject(text))
}

export async function parseHappyHourPasteSmart(
  pasteText: string,
  options?: { forceAi?: boolean },
): Promise<ParseHappyHourPasteResult & { parser: 'rules' | 'ai' }> {
  const rules = parseHappyHourPaste(pasteText)

  if (!options?.forceAi && isRulesParseComplete(rules)) {
    return { ...rules, parser: 'rules' }
  }

  try {
    const ai = await parseHappyHourWithAnthropic(pasteText)
    if (ai.slots.length > 0) {
      return { ...ai, parser: 'ai' }
    }
    if (rules.slots.length > 0) {
      return { ...rules, parser: 'rules' }
    }
    return { ...ai, parser: 'ai' }
  } catch (error) {
    if (rules.slots.length > 0) {
      return {
        ...rules,
        parser: 'rules',
        warnings: [
          ...rules.warnings,
          error instanceof Error ? error.message : 'AI parsing failed; showing rule-based results.',
        ],
      }
    }
    throw error
  }
}

import { z } from 'zod'

import type { EventType } from '@/types/event'
import { EVENT_TYPE_LABELS } from '@/utils/eventType'

import { getAnthropicApiKey, getAnthropicHappyHourModel } from './anthropicConfig'
import { ScrapeApiError } from './errors'

const EVENT_TYPE_VALUES = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export interface ParsedEvent {
  title: string
  description: string | null
  event_type: EventType
  schedule_mode: 'dated' | 'recurring'
  event_date: string | null
  day_of_week: number | null
  start_time: string
  end_time: string | null
}

export interface ParseEventsResult {
  events: ParsedEvent[]
  warnings: string[]
}

const aiResponseSchema = z.object({
  events: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable().optional(),
      event_type: z.string(),
      event_date: z.string().nullable().optional(),
      day_of_week: z.number().int().min(0).max(6).nullable().optional(),
      start_time: z.string(),
      end_time: z.string().nullable().optional(),
    }),
  ),
  warnings: z.array(z.string()).optional(),
})

function normalizeEventType(value: string): EventType {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if ((EVENT_TYPE_VALUES as string[]).includes(normalized)) {
    return normalized as EventType
  }
  return 'other'
}

function normalizeTime(value: string): string | null {
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)/)
  if (!match) {
    return null
  }
  return `${match[1]?.padStart(2, '0')}:${match[2]}`
}

function normalizeDate(value: string): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) {
    return null
  }
  return `${match[1]}-${match[2]}-${match[3]}`
}

export function normalizeAnthropicEventsResponse(raw: unknown): ParseEventsResult {
  const parsed = aiResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return { events: [], warnings: ['AI response did not match the expected event format.'] }
  }

  const events: ParsedEvent[] = []
  const warnings = [...(parsed.data.warnings ?? [])]

  for (const event of parsed.data.events) {
    const title = event.title.trim()
    if (!title) {
      continue
    }

    const start_time = normalizeTime(event.start_time)
    if (!start_time) {
      warnings.push(`Skipped “${title}” — could not read a start time.`)
      continue
    }

    const end_time = event.end_time ? normalizeTime(event.end_time) : null
    if (end_time && end_time <= start_time) {
      warnings.push(`Skipped end time for “${title}” — it wasn't after the start time.`)
    }

    const event_date = event.event_date ? normalizeDate(event.event_date) : null
    const day_of_week =
      typeof event.day_of_week === 'number' && event.day_of_week >= 0 && event.day_of_week <= 6
        ? event.day_of_week
        : null

    if (!event_date && day_of_week == null) {
      warnings.push(`Skipped “${title}” — no date or day of week found.`)
      continue
    }

    events.push({
      title,
      description: event.description?.trim() || null,
      event_type: normalizeEventType(event.event_type),
      schedule_mode: event_date ? 'dated' : 'recurring',
      event_date,
      day_of_week: event_date ? null : day_of_week,
      start_time,
      end_time: end_time && end_time > start_time ? end_time : null,
    })
  }

  if (events.length === 0 && warnings.length === 0) {
    warnings.push('No events found.')
  }

  return { events, warnings }
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

const EVENT_TYPE_LIST = EVENT_TYPE_VALUES.join(', ')

const SYSTEM_PROMPT = `You extract a list of upcoming venue events (live music, trivia, comedy, sports watch parties, game nights, night life, specials, etc.) from venue web pages or event calendars.

Return ONLY valid JSON (no markdown) with this shape:
{
  "events": [
    {
      "title": "Trivia Night",
      "description": "Weekly pub trivia with prizes",
      "event_type": "trivia",
      "event_date": "2026-06-10",
      "day_of_week": null,
      "start_time": "19:00",
      "end_time": "21:00"
    }
  ],
  "warnings": ["Optional notes about ambiguity"]
}

Rules:
- event_type must be one of: ${EVENT_TYPE_LIST}.
- If the event has a specific calendar date, set "event_date" to YYYY-MM-DD and leave "day_of_week" null.
- If the event repeats weekly without a specific date (e.g. "Trivia every Tuesday"), set "day_of_week" to an integer 0=Sunday..6=Saturday and leave "event_date" null.
- start_time and end_time use 24-hour HH:MM. end_time is optional — omit or null if unknown.
- Keep descriptions short (one sentence) and based only on what's stated.
- Ignore unrelated info (menus, hours, address, jobs, etc.).
- If no events are found, return {"events":[],"warnings":["No events found"]}.`

const URL_USER_PROMPT_PREFIX = `Extract every upcoming event from this venue page text:\n\n`

const IMAGE_USER_PROMPT = `Extract every event listed in this photo (flyer, poster, calendar, or board). Read all text carefully — titles, dates or days of week, and times.`

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image'
      source: {
        type: 'base64'
        media_type: 'image/jpeg' | 'image/png' | 'image/webp'
        data: string
      }
    }

async function callAnthropic(content: AnthropicContentBlock[]): Promise<ParseEventsResult> {
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
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
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

  return normalizeAnthropicEventsResponse(extractJsonObject(text))
}

export async function parseEventsFromPageText(pageText: string): Promise<ParseEventsResult> {
  return callAnthropic([{ type: 'text', text: `${URL_USER_PROMPT_PREFIX}${pageText.trim()}` }])
}

export async function parseEventsFromPhoto(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ParseEventsResult> {
  return callAnthropic([
    {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: imageBase64 },
    },
    { type: 'text', text: IMAGE_USER_PROMPT },
  ])
}

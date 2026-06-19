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
import { finalizeParsedSlotDeals } from '@/utils/ownerDealRows'

import { getAnthropicApiKey, getAnthropicHappyHourModel } from './anthropicConfig'
import { ScrapeApiError } from './errors'

const aiResponseSchema = z.object({
  slots: z.array(
    z.object({
      days: z.array(z.union([z.number(), z.string()])).min(1),
      start_time: z.string(),
      end_time: z.string(),
      deal_summary: z.string().nullable().optional(),
      deals: z
        .array(
          z.object({
            label: z.string(),
            category: z.enum(['drinks', 'food', 'both', 'other']).optional(),
            price_text: z.string().nullable().optional(),
          }),
        )
        .optional(),
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

    if (!start_time || !end_time || start_time === end_time) {
      warnings.push(`Skipped slot with invalid times: ${slot.start_time} – ${slot.end_time}`)
      continue
    }

    const { deals: finalizedDeals, deal_summary } = finalizeParsedSlotDeals(
      slot.deals,
      slot.deal_summary,
    )

    slots.push({
      days: uniqueDays,
      start_time,
      end_time,
      deal_summary,
      deals: finalizedDeals,
    })
  }

  if (slots.length === 0 && warnings.length === 0) {
    warnings.push('No happy hour windows found in the pasted text.')
  }

  for (const slot of slots) {
    if (!slot.deals?.length && !slot.deal_summary?.trim()) {
      warnings.push(
        `Schedule ${slot.start_time}–${slot.end_time} has no specials — check that menu items were captured.`,
      )
    }
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
      "deals": [
        { "label": "Draft pints", "category": "drinks", "price_text": "$5" },
        { "label": "Appetizers", "category": "food", "price_text": "half off" }
      ]
    }
  ],
  "warnings": ["Optional notes about ambiguity"]
}

Rules:
- days use integers 0=Sunday through 6=Saturday. Group days that share the same window and deals into one slot.
- start_time and end_time use 24-hour HH:MM (e.g. 16:00). For overnight slots (e.g. 10pm–2am) use the actual times: start_time "22:00", end_time "02:00".
- Put each special in the deals array (label, category, optional price_text). category is drinks, food, both, or other.
- When pasted text lists multiple specials separated by commas, create one deal row per item. Example: "$5 draft pints, $7 apps, half-off wine" becomes three deal rows — never a single comma-separated string in deal_summary.
- Do not use deal_summary for specials. Leave deal_summary null whenever deals are present or comma-separated specials appear in the paste.
- Ignore unrelated info (address, parking, brunch, etc.).
- If no happy hour is mentioned, return {"slots":[],"warnings":["No happy hour found"]}.`

const MENU_IMAGE_SYSTEM_PROMPT = `You extract recurring weekly happy hour schedules from PHOTOS of printed or digital happy hour menus.

Return ONLY valid JSON (no markdown) with this shape:
{
  "slots": [
    {
      "days": [0, 1, 2, 3, 4, 5, 6],
      "start_time": "15:00",
      "end_time": "17:00",
      "deals": [
        { "label": "3 Schnitzel Sliders", "category": "food", "price_text": "$15" },
        { "label": "Kartoffelpuffer", "category": "food", "price_text": "$6" }
      ]
    }
  ],
  "warnings": ["Optional notes about ambiguity"]
}

Rules:
- Read the FULL menu in the image — days, times, AND every special line item.
- days use integers 0=Sunday through 6=Saturday. "Every day" or "Daily" = [0,1,2,3,4,5,6].
- start_time and end_time use 24-hour HH:MM. Convert 3pm-5pm to 15:00–17:00. Overnight slots (e.g. 10pm–2am) use the actual times: start_time "22:00", end_time "02:00".
- CRITICAL: Every menu item with a price MUST become its own object in the deals array.
- For lines like "3 SCHNITZEL SLIDERS - $15" or "KARTOFFELPUFFER - $6": label = item name, price_text = "$15" / "$6".
- Do NOT skip food items. Sliders, apps, pizza, frites, wings, etc. are all deals with category "food".
- Drinks (beer, wine, cocktails, wells) use category "drinks".
- Put the price in price_text only — not in the label. Keep labels concise (item name, not the full description paragraph).
- Never return a slot with only times and zero deals when the image lists priced specials.
- Do not use deal_summary for priced items. Leave deal_summary null when deals are present.
- If the image has one time window and multiple items, use ONE slot with all items in deals.
- If no happy hour is visible, return {"slots":[],"warnings":["No happy hour found"]}.`

const MENU_IMAGE_USER_PROMPT = `Extract the complete happy hour schedule from this menu photo.

You MUST include:
1. Days of week (e.g. every day = all seven days)
2. Start and end time in 24-hour HH:MM
3. EVERY visible special with its price as a separate deal row (label + price_text)

Do not return times only — capture all menu items and prices you can read.`

export async function parseHappyHourWithAnthropic(pasteText: string): Promise<ParseHappyHourPasteResult> {
  return parseHappyHourWithAnthropicContent(
    [
      {
        type: 'text',
        text: `Extract happy hour slots from this pasted text:\n\n${pasteText.trim()}`,
      },
    ],
    { systemPrompt: SYSTEM_PROMPT },
  )
}

export async function parseHappyHourFromMenuImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ParseHappyHourPasteResult> {
  return parseHappyHourWithAnthropicContent(
    [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: imageBase64,
        },
      },
      {
        type: 'text',
        text: MENU_IMAGE_USER_PROMPT,
      },
    ],
    { systemPrompt: MENU_IMAGE_SYSTEM_PROMPT, maxTokens: 4096 },
  )
}

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

async function parseHappyHourWithAnthropicContent(
  content: AnthropicContentBlock[],
  options?: { systemPrompt?: string; maxTokens?: number },
): Promise<ParseHappyHourPasteResult> {
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
      max_tokens: options?.maxTokens ?? 2048,
      system: options?.systemPrompt ?? SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content,
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

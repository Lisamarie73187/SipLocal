type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

type DealCategory = 'drinks' | 'food' | 'both' | 'other'

type ParsedHappyHourDeal = {
  label: string
  category?: DealCategory
  price_text?: string | null
}

export interface ParsedHappyHourSlot {
  days: DayOfWeek[]
  start_time: string
  end_time: string
  deal_summary: string | null
  deals?: ParsedHappyHourDeal[]
}

export interface ParseHappyHourPasteResult {
  slots: ParsedHappyHourSlot[]
  warnings: string[]
  unparsedBlocks: string[]
}

const DAY_TOKEN_TO_NUMBER: Record<string, DayOfWeek> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
}

function dayFromToken(token: string): DayOfWeek | null {
  return DAY_TOKEN_TO_NUMBER[token.trim().toLowerCase().replace(/\./g, '')] ?? null
}

function uniqueSortedDays(days: DayOfWeek[]): DayOfWeek[] {
  return [...new Set(days)].sort((a, b) => a - b) as DayOfWeek[]
}

function expandDayRange(start: DayOfWeek, end: DayOfWeek): DayOfWeek[] {
  if (start <= end) {
    return Array.from({ length: end - start + 1 }, (_, index) => (start + index) as DayOfWeek)
  }
  return [
    ...Array.from({ length: 7 - start }, (_, index) => (start + index) as DayOfWeek),
    ...Array.from({ length: end + 1 }, (_, index) => index as DayOfWeek),
  ]
}

function parseDayExpression(expression: string): DayOfWeek[] | null {
  const normalized = expression.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  if (normalized === 'daily' || normalized === 'every day' || normalized === 'everyday') {
    return [0, 1, 2, 3, 4, 5, 6]
  }

  if (normalized === 'weekdays' || normalized === 'weekday') {
    return [1, 2, 3, 4, 5]
  }

  if (normalized === 'weekends' || normalized === 'weekend') {
    return [0, 6]
  }

  const rangeMatch = normalized.match(/^([a-z]+)\s*[-–—/]\s*([a-z]+)$/i)
  if (rangeMatch) {
    const start = dayFromToken(rangeMatch[1] ?? '')
    const end = dayFromToken(rangeMatch[2] ?? '')
    if (start != null && end != null) {
      return uniqueSortedDays(expandDayRange(start, end))
    }
  }

  const tokens = normalized
    .split(/[,/&+]+|\band\b|\s+/i)
    .map((token) => token.trim())
    .filter(Boolean)

  const days: DayOfWeek[] = []
  for (const token of tokens) {
    const day = dayFromToken(token)
    if (day == null) {
      return null
    }
    days.push(day)
  }

  return days.length > 0 ? uniqueSortedDays(days) : null
}

function parseTimeToken(token: string, meridiemHint?: 'am' | 'pm'): string | null {
  const trimmed = token.trim().toLowerCase()
  if (!trimmed) {
    return null
  }

  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) {
    return null
  }

  let hours = Number(match[1])
  const minutes = Number(match[2] ?? '0')
  const meridiem = (match[3] as 'am' | 'pm' | undefined) ?? meridiemHint

  if (minutes < 0 || minutes > 59) {
    return null
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null
    }
    if (meridiem === 'pm' && hours !== 12) {
      hours += 12
    }
    if (meridiem === 'am' && hours === 12) {
      hours = 0
    }
  } else if (hours > 23) {
    return null
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function inferDealCategory(text: string): DealCategory {
  const lower = text.toLowerCase()
  if (/(appetizer|app|burger|pizza|food|wing|taco|bite|entree|slider)/.test(lower)) {
    return 'food'
  }
  if (/(beer|wine|cocktail|drink|pint|draft|margarita|well|shot|seltzer)/.test(lower)) {
    return 'drinks'
  }
  if (/\bboth\b/.test(lower)) {
    return 'both'
  }
  return 'other'
}

function dealSummaryToDealRows(summary: string | null): ParsedHappyHourDeal[] {
  if (!summary?.trim()) {
    return []
  }

  const parts = summary
    .split(/\n|[;|]/)
    .flatMap((part) => part.split(/,(?![^$]*\d)/))
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.map((part) => {
    const priceMatch = part.match(
      /(\$[\d.]+(?:\.\d{2})?(?:\s*[-–]\s*\$[\d.]+(?:\.\d{2})?)?|\d+\s*%?\s*off)/i,
    )
    const price_text = priceMatch?.[1]?.trim() ?? null
    let label = part
    if (price_text && label.includes(price_text)) {
      label = label.replace(price_text, '').replace(/\s*[-–:]\s*$/, '').trim()
    }
    if (!label) {
      label = part
    }
    return {
      label,
      category: inferDealCategory(part),
      price_text,
    }
  })
}

function finalizeParsedSlotDeals(
  deals: ParsedHappyHourDeal[] | undefined,
  dealSummary: string | null | undefined,
): { deals: ParsedHappyHourDeal[] | undefined; deal_summary: string | null } {
  const normalized = (deals ?? [])
    .map((deal) => {
      const label = deal.label.trim()
      if (!label) {
        return null
      }
      return {
        label,
        category: deal.category ?? inferDealCategory(label),
        price_text: deal.price_text?.trim() || null,
      }
    })
    .filter((deal): deal is ParsedHappyHourDeal => deal !== null)

  if (normalized.length > 0) {
    return { deals: normalized, deal_summary: null }
  }

  const summary = dealSummary?.trim() || null
  if (!summary) {
    return { deals: undefined, deal_summary: null }
  }

  const fromSummary = dealSummaryToDealRows(summary).filter((row) => row.label.trim())
  if (fromSummary.length === 0) {
    return { deals: undefined, deal_summary: null }
  }

  return { deals: fromSummary, deal_summary: null }
}

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

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] ?? text).trim()

  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end <= start) {
      throw new Error('AI response did not include JSON.')
    }
    return JSON.parse(candidate.slice(start, end + 1))
  }
}

function normalizeAnthropicHappyHourResponse(raw: unknown): ParseHappyHourPasteResult {
  if (!raw || typeof raw !== 'object') {
    return {
      slots: [],
      warnings: ['AI response did not match the expected schedule format.'],
      unparsedBlocks: [],
    }
  }

  const record = raw as {
    slots?: Array<{
      days?: Array<number | string>
      start_time?: string
      end_time?: string
      deal_summary?: string | null
      deals?: ParsedHappyHourDeal[]
    }>
    warnings?: string[]
  }

  if (!Array.isArray(record.slots)) {
    return {
      slots: [],
      warnings: ['AI response did not match the expected schedule format.'],
      unparsedBlocks: [],
    }
  }

  const slots: ParsedHappyHourSlot[] = []
  const warnings = [...(record.warnings ?? [])]

  for (const slot of record.slots) {
    const days: DayOfWeek[] = []
    for (const dayValue of slot.days ?? []) {
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

    const endMeridiem = slot.end_time?.match(/(am|pm)/i)?.[1]?.toLowerCase() as
      | 'am'
      | 'pm'
      | undefined
    const start_time = normalizeTimeValue(slot.start_time ?? '', endMeridiem)
    const end_time = normalizeTimeValue(slot.end_time ?? '', endMeridiem)
    if (!start_time || !end_time || start_time >= end_time) {
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

  return { slots, warnings, unparsedBlocks: [] }
}

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
- start_time and end_time use 24-hour HH:MM. Convert 3pm-5pm to 15:00–17:00.
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

export async function parseHappyHourFromMenuImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ParseHappyHourPasteResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')?.trim()
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }

  const model = Deno.env.get('ANTHROPIC_HAPPY_HOUR_MODEL')?.trim() || 'claude-haiku-4-5-20251001'

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
      system: MENU_IMAGE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
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
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${body.slice(0, 300)}`)
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
    throw new Error('Anthropic returned an empty response.')
  }

  return normalizeAnthropicHappyHourResponse(extractJsonObject(text))
}

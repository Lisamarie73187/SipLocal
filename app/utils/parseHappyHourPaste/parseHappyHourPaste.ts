import type { DayOfWeek } from '@/types/venue'

export interface ParsedHappyHourSlot {
  days: DayOfWeek[]
  start_time: string
  end_time: string
  deal_summary: string | null
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

const SCHEDULE_LINE_PATTERN =
  /^(.+?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})\s*(?:[-–—]|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})(?:\s*[:\-–—]\s*(.+))?$/i

function normalizeDayToken(token: string): string {
  return token.trim().toLowerCase().replace(/\./g, '')
}

function dayFromToken(token: string): DayOfWeek | null {
  const normalized = normalizeDayToken(token)
  return DAY_TOKEN_TO_NUMBER[normalized] ?? null
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

function uniqueSortedDays(days: DayOfWeek[]): DayOfWeek[] {
  return [...new Set(days)].sort((a, b) => a - b) as DayOfWeek[]
}

export function parseDayExpression(expression: string): DayOfWeek[] | null {
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

  const rangeMatch = normalized.match(
    /^([a-z]+)\s*[-–—/]\s*([a-z]+)$/i,
  )
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

export function parseTimeToken(token: string, meridiemHint?: 'am' | 'pm'): string | null {
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

function inferMeridiemForHappyHour(hours: number, minutes: number): 'am' | 'pm' {
  const total = hours * 60 + minutes
  if (total >= 8 * 60) {
    return 'pm'
  }
  return 'am'
}

function parseTimeRange(startToken: string, endToken: string): { start: string; end: string } | null {
  const endMeridiemMatch = endToken.match(/(am|pm)$/i)
  const endMeridiem = endMeridiemMatch?.[1]?.toLowerCase() as 'am' | 'pm' | undefined

  const startMeridiemMatch = startToken.match(/(am|pm)$/i)
  let startMeridiem = startMeridiemMatch?.[1]?.toLowerCase() as 'am' | 'pm' | undefined

  if (!startMeridiem && endMeridiem) {
    const startHours = Number(startToken.match(/^(\d{1,2})/)?.[1] ?? NaN)
    const startMinutes = Number(startToken.match(/:(\d{2})/)?.[1] ?? '0')
    if (Number.isFinite(startHours)) {
      startMeridiem =
        startHours >= 1 && startHours <= 11
          ? endMeridiem
          : inferMeridiemForHappyHour(startHours, startMinutes)
    }
  }

  const start = parseTimeToken(startToken, startMeridiem)
  const end = parseTimeToken(endToken, endMeridiem ?? startMeridiem)
  if (!start || !end) {
    return null
  }

  if (start >= end) {
    return null
  }

  return { start, end }
}

function looksLikeScheduleLine(line: string): boolean {
  return SCHEDULE_LINE_PATTERN.test(line.trim())
}

function splitPasteBlocks(text: string): string[] {
  const lines = text.split(/\r?\n/)
  const blocks: string[] = []
  let current: string[] = []

  const flush = (): void => {
    if (current.length > 0) {
      blocks.push(current.join('\n'))
      current = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flush()
      continue
    }

    if (current.length > 0 && looksLikeScheduleLine(trimmed)) {
      flush()
    }

    current.push(trimmed)
  }

  flush()
  return blocks
}

function parseScheduleBlock(block: string): ParsedHappyHourSlot | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return null
  }

  const scheduleLine = lines[0] ?? ''
  const match = scheduleLine.match(SCHEDULE_LINE_PATTERN)
  if (!match) {
    return null
  }

  const days = parseDayExpression(match[1] ?? '')
  const timeRange = parseTimeRange(match[2] ?? '', match[3] ?? '')
  if (!days || !timeRange) {
    return null
  }

  const inlineDeal = match[4]?.trim() || null
  const trailingDeal = lines.slice(1).join('\n').trim() || null
  const deal_summary = inlineDeal ?? trailingDeal

  return {
    days,
    start_time: timeRange.start,
    end_time: timeRange.end,
    deal_summary,
  }
}

export function parseHappyHourPaste(text: string): ParseHappyHourPasteResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { slots: [], warnings: ['Paste is empty.'], unparsedBlocks: [] }
  }

  const blocks = splitPasteBlocks(trimmed)
  const slots: ParsedHappyHourSlot[] = []
  const warnings: string[] = []
  const unparsedBlocks: string[] = []

  for (const block of blocks) {
    const slot = parseScheduleBlock(block)
    if (slot) {
      slots.push(slot)
      continue
    }
    unparsedBlocks.push(block)
  }

  if (unparsedBlocks.length > 0) {
    warnings.push(
      `${unparsedBlocks.length} block${unparsedBlocks.length === 1 ? '' : 's'} could not be parsed. Check day and time format.`,
    )
  }

  if (slots.length === 0 && unparsedBlocks.length > 0) {
    warnings.push('Example: Mon–Fri 4:00–6:00 PM then deal details on the next line.')
  }

  return { slots, warnings, unparsedBlocks }
}

export function isRulesParseComplete(result: ParseHappyHourPasteResult): boolean {
  return result.slots.length > 0 && result.unparsedBlocks.length === 0
}

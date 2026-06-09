export interface ParsedHoursEntry {
  day: number
  open: string
  close: string
}

// Day name → 0=Sun, 1=Mon … 6=Sat
const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3, weds: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

function parseDay(token: string): number | null {
  return DAY_MAP[token.toLowerCase().replace(/[^a-z]/g, '')] ?? null
}

// Expand a day range like "Mon-Fri" → [1,2,3,4,5]
function expandDayRange(from: number, to: number): number[] {
  const days: number[] = []
  let d = from
  // handle wrap-around like Sun-Sat (unlikely but safe)
  while (d !== to) {
    days.push(d)
    d = (d + 1) % 7
  }
  days.push(to)
  return days
}

// Parse time strings like "11am", "11:30am", "11:00", "23:00", "11 AM"
function parseTime(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s/g, '')
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?([ap]m?)?$/)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const period = match[3]

  if (period?.startsWith('p') && hours !== 12) hours += 12
  if (period?.startsWith('a') && hours === 12) hours = 0
  if (!period && hours < 7) hours += 12 // treat ambiguous low hours as PM

  if (hours > 23 || minutes > 59) return null

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// Parse "11am-10pm", "11:00-22:00", "11 AM to 10 PM"
function parseTimeRange(raw: string): { open: string; close: string } | null {
  const normalized = raw.replace(/\bto\b/gi, '-').replace(/\s*–\s*|\s*—\s*/g, '-')
  const parts = normalized.split('-')
  if (parts.length < 2) return null

  // Handle cases like "11am - 10pm" or "11:00-10:00 pm" where period is at end
  let openStr = parts[0].trim()
  let closeStr = parts.slice(1).join('-').trim()

  // If closeStr ends with am/pm but openStr has none, and they share the same period
  const periodMatch = closeStr.match(/([ap]m?)$/i)
  if (periodMatch && !/[ap]m/i.test(openStr)) {
    // don't auto-apply period to open — let parseTime handle ambiguity
  }

  const open = parseTime(openStr)
  const close = parseTime(closeStr)
  if (!open || !close) return null
  return { open, close }
}

// Split a line into its day-group part and time-range part
// e.g. "Monday - Friday: 11am - 10pm" or "Mon, Wed, Fri 11:00-23:00"
function parseLine(line: string): ParsedHoursEntry[] {
  const trimmed = line.trim()
  if (!trimmed) return []

  // Split on colon or last occurrence of time-like pattern
  // Strategy: find where the time range starts
  const colonIdx = trimmed.search(/:\s*\d{1,2}(?::\d{2})?(?:\s*[ap]m)?/i)
  let dayPart: string
  let timePart: string

  if (colonIdx !== -1 && trimmed[colonIdx] === ':') {
    dayPart = trimmed.slice(0, colonIdx)
    timePart = trimmed.slice(colonIdx + 1)
  } else {
    // Try to split on whitespace before a time-looking token
    const timeMatch = trimmed.match(/^(.*?)\s+(\d{1,2}(?::\d{2})?\s*[ap]m\s*[-–—to]+\s*\d{1,2}(?::\d{2})?\s*[ap]m.*)$/i)
    if (timeMatch) {
      dayPart = timeMatch[1]
      timePart = timeMatch[2]
    } else {
      // Last resort: split on first digit that looks like a time
      const idx = trimmed.search(/\d{1,2}(?::\d{2})?\s*[ap]m/i)
      if (idx === -1) return []
      dayPart = trimmed.slice(0, idx)
      timePart = trimmed.slice(idx)
    }
  }

  const timeRange = parseTimeRange(timePart)
  if (!timeRange) return []

  // Parse days from dayPart
  // Split on commas, "and", spaces — then look for ranges with "-"
  const days: number[] = []
  const dayTokens = dayPart.split(/,|\band\b/i).map((t) => t.trim()).filter(Boolean)

  for (const token of dayTokens) {
    const rangeParts = token.split(/\s*[-–—]\s*/)
    if (rangeParts.length === 2) {
      const from = parseDay(rangeParts[0])
      const to = parseDay(rangeParts[1])
      if (from !== null && to !== null) {
        expandDayRange(from, to).forEach((d) => {
          if (!days.includes(d)) days.push(d)
        })
        continue
      }
    }
    const d = parseDay(token)
    if (d !== null && !days.includes(d)) days.push(d)
  }

  if (days.length === 0) return []

  return days.map((day) => ({ day, ...timeRange }))
}

export function parseHoursOfOperation(text: string): ParsedHoursEntry[] {
  const lines = text
    .split(/\n|;/)
    .flatMap((line) => line.split(/(?<=(?:am|pm))\s*,\s*/i)) // split "Mon-Fri 11am-10pm, Sat 12pm-8pm"
    .map((l) => l.trim())
    .filter(Boolean)

  const result: ParsedHoursEntry[] = []
  const seen = new Set<number>()

  for (const line of lines) {
    const entries = parseLine(line)
    for (const entry of entries) {
      if (!seen.has(entry.day)) {
        seen.add(entry.day)
        result.push(entry)
      }
    }
  }

  return result.sort((a, b) => a.day - b.day)
}

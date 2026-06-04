import type { VenueDetail } from '@/types/venue'

export interface VenueMenuLine {
  id: string
  label: string
  priceText: string | null
}

export function getVenueMenuLines(venue: VenueDetail): VenueMenuLine[] {
  const seen = new Set<string>()
  const lines: VenueMenuLine[] = []

  for (const slot of venue.happy_hour_slots) {
    for (const deal of slot.deals) {
      if (seen.has(deal.id)) {
        continue
      }
      seen.add(deal.id)
      lines.push({
        id: deal.id,
        label: deal.label,
        priceText: deal.price_text,
      })
    }
  }

  if (lines.length > 0) {
    return lines.sort((a, b) => a.label.localeCompare(b.label))
  }

  const summarySeen = new Set<string>()
  for (const slot of venue.happy_hour_slots) {
    const summary = slot.deal_summary?.trim()
    if (!summary || summarySeen.has(summary)) {
      continue
    }
    summarySeen.add(summary)
    lines.push({
      id: `summary-${slot.id}`,
      label: summary,
      priceText: null,
    })
  }

  return lines
}

export function venueHasMenu(venue: VenueDetail): boolean {
  return getVenueMenuLines(venue).length > 0
}

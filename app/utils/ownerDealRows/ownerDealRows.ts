import type { Database } from '@/types/database'
import type { ParsedHappyHourDeal, ParsedHappyHourSlot } from '@/utils/parseHappyHourPaste'

export type OwnerDealRow = {
  label: string
  category: Database['public']['Enums']['deal_category']
  price_text: string | null
}

export function inferDealCategory(text: string): Database['public']['Enums']['deal_category'] {
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

export function dealSummaryToDealRows(summary: string | null): OwnerDealRow[] {
  if (!summary?.trim()) {
    return [{ label: '', category: 'drinks', price_text: null }]
  }

  const parts = summary
    .split(/\n|[;|]/)
    .flatMap((part) => part.split(/,(?![^$]*\d)/))
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return [{ label: '', category: 'drinks', price_text: null }]
  }

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

export function normalizeParsedDeal(deal: ParsedHappyHourDeal): OwnerDealRow | null {
  const label = deal.label.trim()
  if (!label) {
    return null
  }

  return {
    label,
    category: deal.category ?? inferDealCategory(label),
    price_text: deal.price_text?.trim() || null,
  }
}

export function dealsFromParsedSlot(slot: ParsedHappyHourSlot): OwnerDealRow[] {
  const { deals } = finalizeParsedSlotDeals(slot.deals, slot.deal_summary)
  const rows = (deals ?? [])
    .map(normalizeParsedDeal)
    .filter((deal): deal is OwnerDealRow => deal !== null)

  if (rows.length > 0) {
    return rows
  }

  return [emptyOwnerDealRow()]
}

export function emptyOwnerDealRow(): OwnerDealRow {
  return { label: '', category: 'drinks', price_text: null }
}

function expandCommaSeparatedDealLabel(deal: ParsedHappyHourDeal): ParsedHappyHourDeal[] {
  const label = deal.label.trim()
  if (!label) {
    return []
  }
  if (!label.includes(',')) {
    return [deal]
  }

  return dealSummaryToDealRows(label).map((row) => ({
    label: row.label,
    category: row.category,
    price_text: row.price_text,
  }))
}

/** Turn comma-separated specials into deal rows; never keep them in deal_summary. */
export function finalizeParsedSlotDeals(
  deals: ParsedHappyHourDeal[] | undefined,
  dealSummary: string | null | undefined,
): { deals: ParsedHappyHourDeal[] | undefined; deal_summary: string | null } {
  const expanded = (deals ?? []).flatMap(expandCommaSeparatedDealLabel)
  const normalized = expanded
    .map((deal) => normalizeParsedDeal(deal))
    .filter((deal): deal is OwnerDealRow => deal !== null)

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

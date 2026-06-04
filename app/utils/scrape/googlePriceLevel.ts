import type { VenuePriceLevel } from '@/types/venue'

/**
 * Maps Google Places price_level (0–4) to SipLocal venue_price_level.
 * 0 / missing → budget default.
 */
export function mapGooglePriceLevel(level: number | null | undefined): VenuePriceLevel {
  if (level == null || !Number.isFinite(level)) {
    return '$'
  }

  const rounded = Math.round(level)
  if (rounded <= 1) {
    return '$'
  }
  if (rounded === 2) {
    return '$$'
  }
  return '$$$'
}

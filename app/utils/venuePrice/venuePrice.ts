import type { VenuePriceLevel } from '@/types/venue'

const PRICE_LEVEL_LABELS: Record<VenuePriceLevel, string> = {
  $: 'Budget-friendly',
  $$: 'Moderate',
  $$$: 'Upscale',
}

export function getVenuePriceLevelAriaLabel(level: VenuePriceLevel): string {
  return `Price level: ${PRICE_LEVEL_LABELS[level]} (${level})`
}

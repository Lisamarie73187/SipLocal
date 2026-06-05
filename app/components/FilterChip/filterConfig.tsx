import type { DealFilter, PriceFilter } from '@/hooks/useDiscoveryFilters'
import type { VenueTypeFilter } from '@/utils/venueType'
import { VENUE_TYPE_EMOJI, VENUE_TYPE_LABELS } from '@/utils/venueType'

export interface FilterOption<T extends string = string> {
  id: T
  label: string
  emoji?: string
}

export const DEAL_FILTER_OPTIONS: FilterOption<DealFilter>[] = [
  { id: 'drinks', label: 'Drinks', emoji: '🍹' },
  { id: 'food', label: 'Food', emoji: '🌮' },
]

export const VENUE_TYPE_FILTER_OPTIONS: FilterOption<VenueTypeFilter>[] = (
  Object.keys(VENUE_TYPE_LABELS) as VenueTypeFilter[]
).map((id) => ({
  id,
  label: VENUE_TYPE_LABELS[id],
  emoji: VENUE_TYPE_EMOJI[id],
}))

export const PRICE_FILTER_OPTIONS: FilterOption<PriceFilter>[] = [
  { id: '$', label: '$' },
  { id: '$$', label: '$$' },
  { id: '$$$', label: '$$$' },
]

export const STATUS_FILTER_OPTIONS = [
  { id: 'happening_now' as const, label: 'Happening now', emoji: '✨' },
  { id: 'starting_soon' as const, label: 'Starting soon', emoji: '⏱' },
]

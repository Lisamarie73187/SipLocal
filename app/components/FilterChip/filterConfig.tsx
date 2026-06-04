import type { DealFilter, PriceFilter } from '@/hooks/useDiscoveryFilters'
import type { VenueTypeFilter } from '@/utils/venueType'

export interface FilterOption<T extends string = string> {
  id: T
  label: string
  emoji?: string
}

export const DEAL_FILTER_OPTIONS: FilterOption<DealFilter>[] = [
  { id: 'drinks', label: 'Drinks', emoji: '🍹' },
  { id: 'food', label: 'Food', emoji: '🌮' },
]

export const VENUE_TYPE_FILTER_OPTIONS: FilterOption<VenueTypeFilter>[] = [
  { id: 'bar', label: 'Bars', emoji: '🍸' },
  { id: 'brewery', label: 'Breweries', emoji: '🍺' },
  { id: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
  { id: 'wine_bar', label: 'Wine Bars', emoji: '🍷' },
  { id: 'taproom', label: 'Taprooms', emoji: '🍻' },
]

export const PRICE_FILTER_OPTIONS: FilterOption<PriceFilter>[] = [
  { id: '$', label: '$' },
  { id: '$$', label: '$$' },
  { id: '$$$', label: '$$$' },
]

export const STATUS_FILTER_OPTIONS = [
  { id: 'happening_now' as const, label: 'Happening now', emoji: '✨' },
  { id: 'starting_soon' as const, label: 'Starting soon', emoji: '⏱' },
]

import { useCallback, useMemo, useState } from 'react'

import type { DayOfWeek } from '@/types/venue'
import type { VenueTypeFilter } from '@/utils/venueType'
import type { VibeFilter } from '@/utils/vibe'

export type ViewDayFilter = 'any' | DayOfWeek
export type DealFilter = 'drinks' | 'food'
export type PriceFilter = '$' | '$$' | '$$$'
export type DiscoveryContentType = 'happy_hours' | 'events'

export const TIME_FILTER_MIN_MINUTES = 10 * 60
export const TIME_FILTER_MAX_MINUTES = 23 * 60

export interface DiscoveryFiltersState {
  contentType: DiscoveryContentType
  search: string
  viewDay: ViewDayFilter
  timeAtMinutes: number | null
  deals: DealFilter[]
  venueTypes: VenueTypeFilter[]
  vibes: VibeFilter[]
  priceLevels: PriceFilter[]
}

export interface UseDiscoveryFiltersResult {
  applied: DiscoveryFiltersState
  isFiltersExpanded: boolean
  toggleFiltersExpanded: () => void
  closeFiltersExpanded: () => void
  setSearch: (search: string) => void
  setContentType: (contentType: DiscoveryContentType) => void
  setAppliedViewDay: (viewDay: ViewDayFilter) => void
  setAppliedTimeAt: (timeAtMinutes: number | null) => void
  clearAppliedTime: () => void
  toggleAppliedDeal: (deal: DealFilter) => void
  toggleAppliedVenueType: (type: VenueTypeFilter) => void
  toggleAppliedVibe: (vibe: VibeFilter) => void
  toggleAppliedPriceLevel: (priceLevel: PriceFilter) => void
  clearAllFilters: () => void
  chipFilterCount: number
  hasActiveFilters: boolean
}

export const DEFAULT_FILTERS: DiscoveryFiltersState = {
  contentType: 'happy_hours',
  search: '',
  viewDay: 'any',
  timeAtMinutes: null,
  deals: [],
  venueTypes: [],
  vibes: [],
  priceLevels: [],
}

function cloneFilters(filters: DiscoveryFiltersState): DiscoveryFiltersState {
  return {
    ...filters,
    deals: [...filters.deals],
    venueTypes: [...filters.venueTypes],
    vibes: [...filters.vibes],
    priceLevels: [...filters.priceLevels],
  }
}

function countChipFilters(filters: DiscoveryFiltersState): number {
  return (
    filters.deals.length +
    filters.venueTypes.length +
    filters.vibes.length +
    filters.priceLevels.length
  )
}

function hasAnyActiveFilters(filters: DiscoveryFiltersState): boolean {
  return (
    filters.contentType !== 'happy_hours' ||
    filters.search.trim().length > 0 ||
    filters.viewDay !== 'any' ||
    filters.timeAtMinutes !== null ||
    filters.deals.length > 0 ||
    filters.venueTypes.length > 0 ||
    filters.vibes.length > 0 ||
    filters.priceLevels.length > 0
  )
}

export function useDiscoveryFilters(): UseDiscoveryFiltersResult {
  const [applied, setApplied] = useState<DiscoveryFiltersState>(() =>
    cloneFilters(DEFAULT_FILTERS),
  )
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  const toggleFiltersExpanded = useCallback((): void => {
    setIsFiltersExpanded((open) => !open)
  }, [])

  const closeFiltersExpanded = useCallback((): void => {
    setIsFiltersExpanded(false)
  }, [])

  const setSearch = useCallback((search: string): void => {
    setApplied((current) => ({ ...current, search }))
  }, [])

  const setContentType = useCallback((contentType: DiscoveryContentType): void => {
    setApplied((current) => {
      if (current.contentType === contentType) {
        return current
      }

      const next: DiscoveryFiltersState = {
        ...current,
        contentType,
      }

      if (contentType === 'events') {
        next.deals = []
      }

      if (contentType === 'happy_hours') {
        // keep existing happy-hour filters
      }

      return next
    })
  }, [])

  const setAppliedViewDay = useCallback((viewDay: ViewDayFilter): void => {
    setApplied((current) => ({ ...current, viewDay }))
  }, [])

  const setAppliedTimeAt = useCallback((timeAtMinutes: number | null): void => {
    setApplied((current) => ({ ...current, timeAtMinutes }))
  }, [])

  const clearAppliedTime = useCallback((): void => {
    setAppliedTimeAt(null)
  }, [setAppliedTimeAt])

  const toggleAppliedDeal = useCallback((deal: DealFilter): void => {
    setApplied((current) => {
      const deals = current.deals.includes(deal)
        ? current.deals.filter((item) => item !== deal)
        : [...current.deals, deal]
      return { ...current, deals }
    })
  }, [])

  const toggleAppliedVenueType = useCallback((type: VenueTypeFilter): void => {
    setApplied((current) => {
      const venueTypes = current.venueTypes.includes(type)
        ? current.venueTypes.filter((item) => item !== type)
        : [...current.venueTypes, type]
      return { ...current, venueTypes }
    })
  }, [])

  const toggleAppliedVibe = useCallback((vibe: VibeFilter): void => {
    setApplied((current) => {
      const vibes = current.vibes.includes(vibe)
        ? current.vibes.filter((item) => item !== vibe)
        : [...current.vibes, vibe]
      return { ...current, vibes }
    })
  }, [])

  const toggleAppliedPriceLevel = useCallback((priceLevel: PriceFilter): void => {
    setApplied((current) => {
      const priceLevels = current.priceLevels.includes(priceLevel)
        ? current.priceLevels.filter((item) => item !== priceLevel)
        : [...current.priceLevels, priceLevel]
      return { ...current, priceLevels }
    })
  }, [])

  const clearAllFilters = useCallback((): void => {
    setApplied(cloneFilters(DEFAULT_FILTERS))
    setIsFiltersExpanded(false)
  }, [])

  const chipFilterCount = useMemo(() => countChipFilters(applied), [applied])

  const hasActiveFilters = useMemo(() => hasAnyActiveFilters(applied), [applied])

  return {
    applied,
    isFiltersExpanded,
    toggleFiltersExpanded,
    closeFiltersExpanded,
    setSearch,
    setContentType,
    setAppliedViewDay,
    setAppliedTimeAt,
    clearAppliedTime,
    toggleAppliedDeal,
    toggleAppliedVenueType,
    toggleAppliedVibe,
    toggleAppliedPriceLevel,
    clearAllFilters,
    chipFilterCount,
    hasActiveFilters,
  }
}

import { useCallback, useMemo, useState } from 'react'

import type { DayOfWeek } from '@/types/venue'
import type { VenueTypeFilter } from '@/utils/venueType'

export type ViewDayFilter = 'any' | DayOfWeek
export type DealFilter = 'drinks' | 'food'
export type PriceFilter = '$' | '$$' | '$$$'
export type StatusFilter = 'happening_now' | 'starting_soon'
export type DiscoveryContentType = 'happy_hours' | 'events'

export const TIME_FILTER_MIN_MINUTES = 10 * 60
export const TIME_FILTER_MAX_MINUTES = 23 * 60

export interface DiscoveryFiltersState {
  contentType: DiscoveryContentType
  search: string
  viewDay: ViewDayFilter
  timeAtMinutes: number | null
  statusFilters: StatusFilter[]
  deals: DealFilter[]
  venueTypes: VenueTypeFilter[]
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
  toggleAppliedStatus: (status: StatusFilter) => void
  toggleAppliedDeal: (deal: DealFilter) => void
  toggleAppliedVenueType: (type: VenueTypeFilter) => void
  toggleAppliedPriceLevel: (priceLevel: PriceFilter) => void
  clearAllFilters: () => void
  chipFilterCount: number
  hasActiveFilters: boolean
}

export const DEFAULT_STATUS_FILTERS: StatusFilter[] = ['happening_now', 'starting_soon']

export const DEFAULT_FILTERS: DiscoveryFiltersState = {
  contentType: 'happy_hours',
  search: '',
  viewDay: 'any',
  timeAtMinutes: null,
  statusFilters: [...DEFAULT_STATUS_FILTERS],
  deals: [],
  venueTypes: [],
  priceLevels: [],
}

function statusFiltersMatchDefault(statusFilters: StatusFilter[]): boolean {
  if (statusFilters.length !== DEFAULT_STATUS_FILTERS.length) {
    return false
  }
  return DEFAULT_STATUS_FILTERS.every((status) => statusFilters.includes(status))
}

function withoutLiveStatusFilters(statusFilters: StatusFilter[]): StatusFilter[] {
  return statusFilters.filter(
    (item) => item !== 'happening_now' && item !== 'starting_soon',
  )
}

function cloneFilters(filters: DiscoveryFiltersState): DiscoveryFiltersState {
  return {
    ...filters,
    statusFilters: [...filters.statusFilters],
    deals: [...filters.deals],
    venueTypes: [...filters.venueTypes],
    priceLevels: [...filters.priceLevels],
  }
}

function countChipFilters(filters: DiscoveryFiltersState): number {
  return filters.deals.length + filters.venueTypes.length + filters.priceLevels.length
}

function hasAnyActiveFilters(filters: DiscoveryFiltersState): boolean {
  return (
    filters.contentType !== 'happy_hours' ||
    filters.search.trim().length > 0 ||
    filters.viewDay !== 'any' ||
    filters.timeAtMinutes !== null ||
    !statusFiltersMatchDefault(filters.statusFilters) ||
    filters.deals.length > 0 ||
    filters.venueTypes.length > 0 ||
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
    setApplied((current) => ({
      ...current,
      viewDay,
      statusFilters: withoutLiveStatusFilters(current.statusFilters),
    }))
  }, [])

  const setAppliedTimeAt = useCallback((timeAtMinutes: number | null): void => {
    setApplied((current) => ({
      ...current,
      timeAtMinutes,
      statusFilters: withoutLiveStatusFilters(current.statusFilters),
    }))
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

  const toggleAppliedPriceLevel = useCallback((priceLevel: PriceFilter): void => {
    setApplied((current) => {
      const priceLevels = current.priceLevels.includes(priceLevel)
        ? current.priceLevels.filter((item) => item !== priceLevel)
        : [...current.priceLevels, priceLevel]
      return { ...current, priceLevels }
    })
  }, [])

  const toggleAppliedStatus = useCallback((status: StatusFilter): void => {
    setApplied((current) => {
      const isOn = current.statusFilters.includes(status)
      const statusFilters = isOn
        ? current.statusFilters.filter((item) => item !== status)
        : [...current.statusFilters, status]

      if (status === 'happening_now' && !isOn) {
        return {
          ...current,
          statusFilters,
          viewDay: 'any',
          timeAtMinutes: null,
        }
      }

      return { ...current, statusFilters }
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
    toggleAppliedStatus,
    toggleAppliedDeal,
    toggleAppliedVenueType,
    toggleAppliedPriceLevel,
    clearAllFilters,
    chipFilterCount,
    hasActiveFilters,
  }
}

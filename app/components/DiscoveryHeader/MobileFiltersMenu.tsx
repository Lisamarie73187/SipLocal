import { useRef } from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { ContentTypeToggle } from '@/components/ContentTypeToggle/ContentTypeToggle'
import { FilterChip } from '@/components/FilterChip/FilterChip'
import {
  DEAL_FILTER_OPTIONS,
  PRICE_FILTER_OPTIONS,
  VENUE_TYPE_FILTER_OPTIONS,
  VIBE_FILTER_OPTIONS,
} from '@/components/FilterChip/filterConfig'
import { TimePointSlider } from '@/components/TimelineFilters/TimePointSlider'
import {
  TIME_FILTER_MIN_MINUTES,
  type UseDiscoveryFiltersResult,
  type ViewDayFilter,
} from '@/hooks/useDiscoveryFilters'
import { getTimeFilterButtonLabel } from '@/utils/discoveryFilters'
import {
  isViewDayOptionActive,
  WEEKDAY_PICKER_OPTIONS,
} from '@/utils/viewDayPicker'

import { DiscoveryFilterButton } from './DiscoveryFilterButton'
import { FilterPopoverPanel } from './FilterPopover'

export interface MobileFiltersMenuProps {
  filters: UseDiscoveryFiltersResult
  resultCount: number
}

export function MobileFiltersMenu({ filters, resultCount }: MobileFiltersMenuProps) {
  const {
    applied,
    isFiltersExpanded,
    toggleFiltersExpanded,
    closeFiltersExpanded,
    clearAllFilters,
    hasActiveFilters,
    chipFilterCount,
    setAppliedViewDay,
    setAppliedTimeAt,
    clearAppliedTime,
    toggleAppliedDeal,
    toggleAppliedVenueType,
    toggleAppliedVibe,
    toggleAppliedPriceLevel,
    setContentType,
  } = filters

  const anchorRef = useRef<HTMLDivElement>(null)
  const showHappyHourFilters = applied.contentType === 'happy_hours'

  const timeLabel = getTimeFilterButtonLabel(applied.timeAtMinutes)
  const timeActive = applied.timeAtMinutes !== null

  const selectViewDay = (viewDay: ViewDayFilter): void => {
    setAppliedViewDay(viewDay)
  }

  const activeFilterCount =
    chipFilterCount + (applied.viewDay !== 'any' ? 1 : 0) + (timeActive ? 1 : 0)

  const resultLabel =
    applied.contentType === 'events'
      ? resultCount === 1
        ? 'event'
        : 'events'
      : resultCount === 1
        ? 'venue'
        : 'venues'

  return (
    <div ref={anchorRef} className="relative">
      <DiscoveryFilterButton
        label="Filters"
        icon={SlidersHorizontal}
        variant="filters"
        active={isFiltersExpanded}
        onClick={toggleFiltersExpanded}
        aria-expanded={isFiltersExpanded}
        aria-haspopup="dialog"
        badge={
          activeFilterCount > 0 && !isFiltersExpanded ? (
            <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
              {activeFilterCount}
            </span>
          ) : null
        }
      />

      <FilterPopoverPanel open={isFiltersExpanded} onClose={closeFiltersExpanded} anchorRef={anchorRef}>
        <div className="max-h-[70dvh] w-[min(22rem,80vw)] space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <ContentTypeToggle value={applied.contentType} onChange={setContentType} />
            <p className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
              {resultCount} {resultLabel}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Day
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                variant="day"
                label="Any day"
                active={isViewDayOptionActive(applied.viewDay, 'any')}
                onClick={() => selectViewDay('any')}
              />
              {WEEKDAY_PICKER_OPTIONS.map((option) => (
                <FilterChip
                  key={String(option.id)}
                  variant="day"
                  label={option.label}
                  active={isViewDayOptionActive(applied.viewDay, option.id)}
                  onClick={() => selectViewDay(option.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                Time — {timeLabel}
              </p>
              {timeActive ? (
                <button
                  type="button"
                  onClick={clearAppliedTime}
                  className="text-xs font-semibold text-primary"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <TimePointSlider
              value={applied.timeAtMinutes ?? TIME_FILTER_MIN_MINUTES}
              onChange={setAppliedTimeAt}
            />
          </div>

          {showHappyHourFilters ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                Deal type
              </p>
              <div className="flex flex-wrap gap-2">
                {DEAL_FILTER_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.id}
                    variant="pill"
                    label={option.label}
                    emoji={option.emoji}
                    active={applied.deals.includes(option.id)}
                    onClick={() => toggleAppliedDeal(option.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Venue type
            </p>
            <div className="flex flex-wrap gap-2">
              {VENUE_TYPE_FILTER_OPTIONS.map((option) => (
                <FilterChip
                  key={option.id}
                  variant="pill"
                  label={option.label}
                  emoji={option.emoji}
                  active={applied.venueTypes.includes(option.id)}
                  onClick={() => toggleAppliedVenueType(option.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Vibes
            </p>
            <div className="flex flex-wrap gap-2">
              {VIBE_FILTER_OPTIONS.map((option) => (
                <FilterChip
                  key={option.id}
                  variant="pill"
                  label={option.label}
                  emoji={option.emoji}
                  active={applied.vibes.includes(option.id)}
                  onClick={() => toggleAppliedVibe(option.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Price
            </p>
            <div className="flex flex-wrap gap-2">
              {PRICE_FILTER_OPTIONS.map((option) => (
                <FilterChip
                  key={option.id}
                  variant="pill"
                  label={option.label}
                  active={applied.priceLevels.includes(option.id)}
                  onClick={() => toggleAppliedPriceLevel(option.id)}
                />
              ))}
            </div>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAllFilters}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent"
            >
              Clear all filters
            </button>
          ) : null}
        </div>
      </FilterPopoverPanel>
    </div>
  )
}

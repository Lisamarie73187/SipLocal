import { useRef, useState } from 'react'
import { Calendar, Clock, SlidersHorizontal, Sparkles, Timer, X } from 'lucide-react'

import { ContentTypeToggle } from '@/components/ContentTypeToggle/ContentTypeToggle'
import { FilterChip } from '@/components/FilterChip/FilterChip'
import {
  DEAL_FILTER_OPTIONS,
  PRICE_FILTER_OPTIONS,
  VENUE_TYPE_FILTER_OPTIONS,
} from '@/components/FilterChip/filterConfig'
import { TimePointSlider } from '@/components/TimelineFilters/TimePointSlider'
import {
  TIME_FILTER_MIN_MINUTES,
  type UseDiscoveryFiltersResult,
  type ViewDayFilter,
} from '@/hooks/useDiscoveryFilters'
import { getTimeFilterButtonLabel } from '@/utils/discoveryFilters'
import {
  getViewDayButtonLabel,
  isViewDayOptionActive,
  WEEKDAY_PICKER_OPTIONS,
} from '@/utils/viewDayPicker'
import { cn } from '@/utils'

import { DiscoveryFilterButton } from './DiscoveryFilterButton'
import { FilterPopoverPanel } from './FilterPopover'

export interface DiscoveryFilterBarProps {
  filters: UseDiscoveryFiltersResult
  happeningNowCount: number
  startingSoonCount?: number
  resultCount: number
  isLiveDay: boolean
}

export function DiscoveryFilterBar({
  filters,
  happeningNowCount,
  startingSoonCount = 0,
  resultCount,
  isLiveDay,
}: DiscoveryFilterBarProps) {
  const {
    applied,
    isFiltersExpanded,
    toggleFiltersExpanded,
    clearAllFilters,
    hasActiveFilters,
    chipFilterCount,
    setAppliedViewDay,
    setAppliedTimeAt,
    clearAppliedTime,
    toggleAppliedStatus,
    toggleAppliedDeal,
    toggleAppliedVenueType,
    toggleAppliedPriceLevel,
    setContentType,
  } = filters

  const [dayPopoverOpen, setDayPopoverOpen] = useState(false)
  const [timePopoverOpen, setTimePopoverOpen] = useState(false)
  const [draftTimeAtMinutes, setDraftTimeAtMinutes] = useState(TIME_FILTER_MIN_MINUTES)
  const [timeDraftDirty, setTimeDraftDirty] = useState(false)
  const dayAnchorRef = useRef<HTMLDivElement>(null)
  const timeAnchorRef = useRef<HTMLDivElement>(null)

  const showHappyHourFilters = applied.contentType === 'happy_hours'
  const happeningNowActive = applied.statusFilters.includes('happening_now')
  const startingSoonActive = applied.statusFilters.includes('starting_soon')

  const dayLabel = getViewDayButtonLabel(applied.viewDay)
  const timeLabel = getTimeFilterButtonLabel(applied.timeAtMinutes)
  const dayActive = applied.viewDay !== 'any'
  const timeActive = applied.timeAtMinutes !== null

  const closeDayPopover = (): void => setDayPopoverOpen(false)

  const openTimePopover = (): void => {
    setDraftTimeAtMinutes(applied.timeAtMinutes ?? TIME_FILTER_MIN_MINUTES)
    setTimeDraftDirty(false)
    setTimePopoverOpen(true)
  }

  const handleDraftTimeChange = (minutes: number): void => {
    setDraftTimeAtMinutes(minutes)
    setTimeDraftDirty(true)
    setAppliedTimeAt(minutes)
  }

  const commitAndCloseTimePopover = (): void => {
    if (timeDraftDirty) {
      setAppliedTimeAt(draftTimeAtMinutes)
    }
    setTimePopoverOpen(false)
  }

  const selectViewDay = (viewDay: ViewDayFilter): void => {
    setAppliedViewDay(viewDay)
    closeDayPopover()
  }

  const clearTimeAndClose = (): void => {
    clearAppliedTime()
    setTimeDraftDirty(false)
    setTimePopoverOpen(false)
  }

  const toggleTimePopover = (): void => {
    if (timePopoverOpen) {
      commitAndCloseTimePopover()
      return
    }
    setDayPopoverOpen(false)
    openTimePopover()
  }

  const resultLabel =
    applied.contentType === 'events'
      ? resultCount === 1
        ? 'event'
        : 'events'
      : resultCount === 1
        ? 'venue'
        : 'venues'

  return (
    <div className="discovery-filter-bar space-y-3">
      <ContentTypeToggle value={applied.contentType} onChange={setContentType} />

      <div className="discovery-filter-bar__primary">
        <div className="discovery-filter-bar__quick flex min-w-0 flex-wrap items-center gap-2">
          {isLiveDay ? (
            <>
              <DiscoveryFilterButton
                label="Happening now"
                icon={Sparkles}
                active={happeningNowActive}
                onClick={() => toggleAppliedStatus('happening_now')}
                badge={
                  happeningNowCount > 0 ? (
                    <span
                      className={cn(
                        'ml-0.5 text-sm font-bold tabular-nums',
                        happeningNowActive ? 'text-white/95' : 'text-muted-foreground',
                      )}
                    >
                      {happeningNowCount}
                    </span>
                  ) : null
                }
              />
              <DiscoveryFilterButton
                label="Starting soon"
                icon={Timer}
                active={startingSoonActive}
                onClick={() => toggleAppliedStatus('starting_soon')}
                badge={
                  startingSoonCount > 0 ? (
                    <span
                      className={cn(
                        'ml-0.5 text-sm font-bold tabular-nums',
                        startingSoonActive ? 'text-white/95' : 'text-muted-foreground',
                      )}
                    >
                      {startingSoonCount}
                    </span>
                  ) : null
                }
              />
            </>
          ) : null}

          <DiscoveryFilterButton
            label="Filters"
            icon={SlidersHorizontal}
            variant="filters"
            active={isFiltersExpanded}
            onClick={toggleFiltersExpanded}
            aria-expanded={isFiltersExpanded}
            badge={
              chipFilterCount > 0 && !isFiltersExpanded ? (
                <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
                  {chipFilterCount}
                </span>
              ) : null
            }
          />

          <div ref={dayAnchorRef} className="relative">
            <DiscoveryFilterButton
              label={dayLabel}
              icon={Calendar}
              active={dayActive}
              aria-expanded={dayPopoverOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setTimePopoverOpen(false)
                setDayPopoverOpen((open) => !open)
              }}
            />
            <FilterPopoverPanel
              open={dayPopoverOpen}
              onClose={closeDayPopover}
              anchorRef={dayAnchorRef}
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => selectViewDay('any')}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent',
                    isViewDayOptionActive(applied.viewDay, 'any') && 'bg-primary/10 text-primary',
                  )}
                >
                  Any day
                </button>
                {WEEKDAY_PICKER_OPTIONS.map((option) => (
                  <button
                    key={String(option.id)}
                    type="button"
                    onClick={() => selectViewDay(option.id)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent',
                      isViewDayOptionActive(applied.viewDay, option.id) &&
                        'bg-primary/10 text-primary',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FilterPopoverPanel>
          </div>

          <div ref={timeAnchorRef} className="relative">
            <DiscoveryFilterButton
              label={timeLabel}
              icon={Clock}
              active={timeActive}
              aria-expanded={timePopoverOpen}
              aria-haspopup="dialog"
              onClick={() => toggleTimePopover()}
            />
            <FilterPopoverPanel
              open={timePopoverOpen}
              onClose={commitAndCloseTimePopover}
              anchorRef={timeAnchorRef}
              align="end"
            >
              <TimePointSlider value={draftTimeAtMinutes} onChange={handleDraftTimeChange} />
              {timeActive || timeDraftDirty ? (
                <button
                  type="button"
                  onClick={clearTimeAndClose}
                  className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent"
                >
                  Clear time
                </button>
              ) : null}
            </FilterPopoverPanel>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              aria-label="Clear all filters"
            >
              <X className="size-4" aria-hidden />
              <span className="hidden sm:inline">Clear all</span>
            </button>
          ) : null}
        </div>

        <p className="discovery-filter-bar__count shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
          {resultCount} {resultLabel}
        </p>
      </div>

      {isFiltersExpanded ? (
        <div className="discovery-filter-bar__expanded mt-3 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:gap-x-10">
            {showHappyHourFilters ? (
              <div className="text-left">
                <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  Deal type
                </p>
                <div className="mt-3 flex flex-wrap justify-start gap-2">
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
            <div className="text-left">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                Venue type
              </p>
              <div className="mt-3 flex flex-wrap justify-start gap-2">
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
            <div className="text-left">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                Price
              </p>
              <div className="mt-3 flex flex-wrap justify-start gap-2">
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
          </div>
        </div>
      ) : null}
    </div>
  )
}

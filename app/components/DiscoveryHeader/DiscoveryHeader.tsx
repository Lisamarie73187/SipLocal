import { useState } from 'react'
import { MapPin, Navigation, Search, X } from 'lucide-react'

import { AccountMenu } from '@/components/AccountMenu/AccountMenu'

import type { UseDiscoveryFiltersResult } from '@/hooks/useDiscoveryFilters'
import { cn } from '@/utils'

import { SipSocialLogo } from '@/components/SipSocialLogo/SipSocialLogo'

import { DiscoveryFilterBar } from './DiscoveryFilterBar'

export interface DiscoveryHeaderProps {
  cityName: string
  filters: UseDiscoveryFiltersResult
  resultCount: number
  onUseMyLocation?: () => void
  useMyLocationLoading?: boolean
  useMyLocationActive?: boolean
  locationError?: string | null
}

export function DiscoveryHeader({
  cityName,
  filters,
  resultCount,
  onUseMyLocation,
  useMyLocationLoading = false,
  useMyLocationActive = false,
  locationError = null,
}: DiscoveryHeaderProps) {
  const { applied, setSearch } = filters
  const searchPlaceholder =
    applied.contentType === 'events'
      ? 'Search events, venues, or trivia…'
      : 'Search venues, vibes, or deals…'
  const [cityQuery, setCityQuery] = useState(cityName)
  const hasSearch = applied.search.trim().length > 0

  return (
    <header className="discovery-header shrink-0">
      <div className="discovery-content-inset pb-5">
        <div className="discovery-header__brand relative pt-6 pb-5">
          <div className="absolute top-6 right-0">
            <AccountMenu />
          </div>
          <SipSocialLogo variant="full" />
        </div>

        <div className="discovery-header__search">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={applied.search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="discovery-header__input h-11 w-full rounded-xl border border-border/70 bg-card pr-9 pl-10 text-sm text-dark shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {hasSearch ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-dark"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </label>

            <label className="relative w-full md:w-44">
              <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={cityQuery}
                onChange={(event) => setCityQuery(event.target.value)}
                placeholder="City or ZIP"
                className="discovery-header__input h-11 w-full rounded-xl border border-border/70 bg-card pr-3 pl-10 text-sm text-dark shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <button
              type="button"
              onClick={onUseMyLocation}
              disabled={!onUseMyLocation || useMyLocationLoading}
              aria-pressed={useMyLocationActive}
              className={cn(
                'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60',
                useMyLocationActive
                  ? 'border-primary/40 bg-primary/10 text-dark'
                  : 'border-border/70 bg-card text-dark hover:border-primary/25 hover:bg-card',
              )}
            >
              <Navigation className="size-4 text-primary" aria-hidden />
              <span className="whitespace-nowrap">
                {useMyLocationLoading
                  ? 'Locating…'
                  : useMyLocationActive
                    ? 'My location'
                    : 'Use my location'}
              </span>
            </button>
          </div>
          {locationError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {locationError}
            </p>
          ) : null}
        </div>

        <div className="discovery-header__filters pt-3">
          <DiscoveryFilterBar filters={filters} resultCount={resultCount} />
        </div>
      </div>
    </header>
  )
}

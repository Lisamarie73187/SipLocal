import { useRef, useState } from 'react'
import { ChevronDown, Loader2, MapPin, Navigation, Search } from 'lucide-react'

import { FilterPopoverPanel } from '@/components/DiscoveryHeader/FilterPopover'
import { useLocationSearch } from '@/hooks/useLocationSearch'
import type { GeocodeResult } from '@/utils/mapboxGeocoding'
import { cn } from '@/utils'

export interface LocationDropdownProps {
  label: string
  onLabelChange: (label: string) => void
  onFlyToLocation: (latitude: number, longitude: number, zoom?: number) => void
  onUseMyLocation?: () => void
  useMyLocationLoading?: boolean
  useMyLocationActive?: boolean
  locationError?: string | null
  className?: string
  variant?: 'label' | 'icon'
  align?: 'start' | 'end'
}

const GEOCODE_ZOOM = 11.5

export function LocationDropdown({
  label,
  onLabelChange,
  onFlyToLocation,
  onUseMyLocation,
  useMyLocationLoading = false,
  useMyLocationActive = false,
  locationError = null,
  className,
  variant = 'label',
  align = 'start',
}: LocationDropdownProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  const handleSelect = (result: GeocodeResult): void => {
    onFlyToLocation(result.latitude, result.longitude, GEOCODE_ZOOM)
    onLabelChange(result.label)
    setOpen(false)
  }

  const { query, setQuery, results, loading, error, selectResult } = useLocationSearch({
    onSelect: handleSelect,
  })

  const handleUseMyLocation = (): void => {
    onUseMyLocation?.()
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className={cn('relative', className)}>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`Location: ${label}`}
          title={label}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card text-dark shadow-sm"
        >
          <MapPin className="size-4 text-primary" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 text-xs font-semibold text-dark shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown
            className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      )}

      <FilterPopoverPanel open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} align={align}>
        <div className="w-[min(20rem,80vw)] space-y-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={!onUseMyLocation || useMyLocationLoading}
            aria-pressed={useMyLocationActive}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60',
              useMyLocationActive && 'bg-primary/10 text-primary',
            )}
          >
            {useMyLocationLoading ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
            ) : (
              <Navigation className="size-4 shrink-0 text-primary" aria-hidden />
            )}
            {useMyLocationLoading
              ? 'Locating…'
              : useMyLocationActive
                ? 'My location'
                : 'Use my location'}
          </button>

          {locationError ? (
            <p className="px-3 text-xs text-destructive" role="alert">
              {locationError}
            </p>
          ) : null}

          <div className="border-t border-border/60 pt-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a city or ZIP"
                className="h-10 w-full rounded-lg border border-border/70 bg-card pr-3 pl-9 text-sm text-dark shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            {loading ? (
              <p className="mt-2 px-1 text-xs text-muted-foreground">Searching…</p>
            ) : error ? (
              <p className="mt-2 px-1 text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : results.length > 0 ? (
              <ul className="mt-1 max-h-48 overflow-y-auto">
                {results.map((result) => (
                  <li key={`${result.latitude},${result.longitude}`}>
                    <button
                      type="button"
                      onClick={() => selectResult(result)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium text-dark">
                        {result.label}
                      </span>
                      {result.context ? (
                        <span className="shrink-0 truncate text-xs text-muted-foreground">
                          {result.context}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </FilterPopoverPanel>
    </div>
  )
}

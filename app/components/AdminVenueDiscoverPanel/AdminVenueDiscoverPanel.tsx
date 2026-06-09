import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  discoverSelectedVenues,
  searchGoogleVenuesInCity,
  type GoogleVenueSearchResult,
} from '@/server/adminDiscover'
import {
  scrubVenueAll,
  scrubVenueEvents,
  scrubVenueHappyHours,
  scrubVenueInfo,
} from '@/server/adminVenueRescrub'
import { cn } from '@/utils'

export interface AdminVenueDiscoverPanelProps {
  citySlug: string
  onVenuesAdded: () => void
}

type ScrubType = 'venue' | 'happyhour' | 'events' | 'all'

interface ScrubProgress {
  venueId: string
  venueName: string
  status: 'pending' | 'running' | 'done' | 'error'
  message: string | null
}

export function AdminVenueDiscoverPanel({ citySlug, onVenuesAdded }: AdminVenueDiscoverPanelProps) {
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<GoogleVenueSearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addedVenueIds, setAddedVenueIds] = useState<string[]>([])
  const [scrubProgress, setScrubProgress] = useState<ScrubProgress[]>([])
  const [scrubbing, setScrubbing] = useState(false)

  const handleSearch = (): void => {
    if (!citySlug.trim()) {
      setSearchError('Set a city slug above first.')
      return
    }
    setSearching(true)
    setSearchError(null)
    setResults([])
    setSelectedPlaceIds(new Set())
    setAddedVenueIds([])
    setScrubProgress([])

    void searchGoogleVenuesInCity({ data: { citySlug, maxResults: 20 } })
      .then((rows) => setResults(rows))
      .catch((err) => setSearchError(err instanceof Error ? err.message : 'Search failed.'))
      .finally(() => setSearching(false))
  }

  const togglePlace = (placeId: string): void => {
    setSelectedPlaceIds((current) => {
      const next = new Set(current)
      if (next.has(placeId)) {
        next.delete(placeId)
      } else {
        next.add(placeId)
      }
      return next
    })
  }

  const handleAddSelected = (): void => {
    if (selectedPlaceIds.size === 0) return
    setAdding(true)
    setAddError(null)

    void discoverSelectedVenues({
      data: { citySlug, placeIds: [...selectedPlaceIds] },
    })
      .then((result) => {
        setAddedVenueIds(result.venueIds)
        onVenuesAdded()
      })
      .catch((err) => setAddError(err instanceof Error ? err.message : 'Failed to add venues.'))
      .finally(() => setAdding(false))
  }

  const handleScrub = (type: ScrubType): void => {
    if (addedVenueIds.length === 0) return

    const initial: ScrubProgress[] = addedVenueIds.map((id, i) => ({
      venueId: id,
      venueName: results[i]?.name ?? `Venue ${i + 1}`,
      status: 'pending',
      message: null,
    }))
    setScrubProgress(initial)
    setScrubbing(true)

    void (async () => {
      for (let i = 0; i < addedVenueIds.length; i++) {
        const venueId = addedVenueIds[i]

        setScrubProgress((current) =>
          current.map((p) => (p.venueId === venueId ? { ...p, status: 'running' } : p)),
        )

        try {
          let message = ''
          if (type === 'venue') {
            const r = await scrubVenueInfo({ data: { venueId } })
            message = `Updated from ${r.source}: ${r.fieldsUpdated.join(', ') || 'no fields changed'}`
          } else if (type === 'happyhour') {
            const r = await scrubVenueHappyHours({ data: { venueId } })
            message = `Found ${r.slots.length} slot${r.slots.length === 1 ? '' : 's'}${r.warnings.length > 0 ? ` (${r.warnings[0]})` : ''}`
          } else if (type === 'events') {
            const r = await scrubVenueEvents({ data: { venueId } })
            message = `Found ${r.events.length} event${r.events.length === 1 ? '' : 's'}${r.warnings.length > 0 ? ` (${r.warnings[0]})` : ''}`
          } else {
            const r = await scrubVenueAll({ data: { venueId } })
            message = `Venue: ${r.venueInfo.fieldsUpdated.join(', ') || 'no changes'} · ${r.slots.length} HH slot${r.slots.length === 1 ? '' : 's'} · ${r.events.length} event${r.events.length === 1 ? '' : 's'}`
          }
          setScrubProgress((current) =>
            current.map((p) =>
              p.venueId === venueId ? { ...p, status: 'done', message } : p,
            ),
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Scrub failed.'
          setScrubProgress((current) =>
            current.map((p) =>
              p.venueId === venueId ? { ...p, status: 'error', message } : p,
            ),
          )
        }
      }
      setScrubbing(false)
    })()
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-heading text-base font-semibold text-dark">
          Discover new venues from Google
        </span>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border/70 px-5 pb-5 pt-4">
          <p className="text-sm text-muted-foreground">
            Search Google Places for bars and restaurants near the city center. Select the ones you
            want to add, then scrub them for venue info, happy hours, or events.
          </p>

          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2"
            disabled={searching}
            onClick={handleSearch}
          >
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {searching ? 'Searching…' : 'Search Google'}
          </Button>

          {searchError ? (
            <p className="text-sm text-destructive" role="alert">{searchError}</p>
          ) : null}

          {results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                {results.length} results — select venues to add
              </p>
              <ul className="space-y-2">
                {results.map((result) => {
                  const checked = selectedPlaceIds.has(result.placeId)
                  return (
                    <li key={result.placeId}>
                      <label className={cn(
                        'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3',
                        checked
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/70 bg-background',
                      )}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlace(result.placeId)}
                          className="mt-0.5 size-4 shrink-0 rounded border-border"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-dark">{result.name}</span>
                            {result.existingVenueId ? (
                              <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary">
                                Already in DB
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{result.formattedAddress}</p>
                          {result.websiteUrl ? (
                            <p className="mt-0.5 truncate text-xs text-primary">{result.websiteUrl}</p>
                          ) : null}
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>

              {selectedPlaceIds.size > 0 && addedVenueIds.length === 0 ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={adding}
                    onClick={handleAddSelected}
                  >
                    {adding ? <Loader2 className="size-4 animate-spin" /> : null}
                    {adding
                      ? 'Adding…'
                      : `Add ${selectedPlaceIds.size} selected to DB`}
                  </Button>
                  {addError ? (
                    <p className="text-sm text-destructive" role="alert">{addError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {addedVenueIds.length > 0 && scrubProgress.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4">
              <p className="text-sm font-medium text-dark">
                Added {addedVenueIds.length} venue{addedVenueIds.length === 1 ? '' : 's'}. Now scrub them:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="min-h-9" onClick={() => handleScrub('venue')}>
                  Venue info only
                </Button>
                <Button type="button" size="sm" variant="outline" className="min-h-9" onClick={() => handleScrub('happyhour')}>
                  Happy hours only
                </Button>
                <Button type="button" size="sm" variant="outline" className="min-h-9" onClick={() => handleScrub('events')}>
                  Events only
                </Button>
                <Button type="button" size="sm" className="min-h-9" onClick={() => handleScrub('all')}>
                  All three
                </Button>
              </div>
            </div>
          ) : null}

          {scrubProgress.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Scrub progress</p>
              <ul className="space-y-1.5">
                {scrubProgress.map((p) => (
                  <li key={p.venueId} className="flex items-start gap-2 text-sm">
                    {p.status === 'running' ? (
                      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                    ) : p.status === 'done' ? (
                      <span className="mt-0.5 size-4 shrink-0 text-center text-xs text-open">✓</span>
                    ) : p.status === 'error' ? (
                      <span className="mt-0.5 size-4 shrink-0 text-center text-xs text-destructive">✗</span>
                    ) : (
                      <span className="mt-0.5 size-4 shrink-0 text-center text-xs text-muted-foreground">·</span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-dark">{p.venueName}</span>
                      {p.message ? (
                        <span className={cn(
                          'ml-2 text-xs',
                          p.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
                        )}>
                          {p.message}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {!scrubbing ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-9 mt-2"
                  onClick={() => {
                    setResults([])
                    setSelectedPlaceIds(new Set())
                    setAddedVenueIds([])
                    setScrubProgress([])
                  }}
                >
                  Done — search again
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

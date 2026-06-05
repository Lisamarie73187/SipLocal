import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Pencil, Plus } from 'lucide-react'

import { AdminArchiveVenues } from '@/components/AdminArchiveVenues/AdminArchiveVenues'
import { AdminUnpublishVenues } from '@/components/AdminUnpublishVenues/AdminUnpublishVenues'
import { Button } from '@/components/ui/button'
import { VenueSourceLinks } from '@/components/VenueSourceLinks/VenueSourceLinks'
import { listAdminVenues, type AdminVenueListItem } from '@/server/adminVenues'
import type { ScrapeConfidence } from '@/types/venue'
import { venueStatusMismatch } from '@/utils/venueDataStatus'
import { isUnverifiedConfidence } from '@/utils/venueTrust'
import { cn } from '@/utils'

const inputClassName =
  'h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

type VenueArchiveTab = 'active' | 'archived'

type VenueDataStatusFilter = 'all' | 'pending_review' | 'live' | 'no_happy_hour'

const VENUE_DATA_STATUS_FILTERS: Array<{ id: VenueDataStatusFilter; label: string }> = [
  { id: 'all', label: 'All statuses' },
  { id: 'pending_review', label: 'Needs review' },
  { id: 'live', label: 'Live' },
  { id: 'no_happy_hour', label: 'No happy hour found' },
]

function archiveTabToFilters(tab: VenueArchiveTab): { archivedOnly: boolean } {
  return { archivedOnly: tab === 'archived' }
}

function dataStatusFilterToApi(status: VenueDataStatusFilter): {
  liveOnly: boolean
  pendingReviewOnly: boolean
  noHappyHourOnly: boolean
} {
  return {
    liveOnly: status === 'live',
    pendingReviewOnly: status === 'pending_review',
    noHappyHourOnly: status === 'no_happy_hour',
  }
}

function dataStatusFilterLabel(status: VenueDataStatusFilter): string | null {
  switch (status) {
    case 'pending_review':
      return 'needs review'
    case 'live':
      return 'live'
    case 'no_happy_hour':
      return 'no happy hour found'
    default:
      return null
  }
}

const primaryTabClassName = (selected: boolean): string =>
  cn(
    'min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors',
    selected
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-accent hover:text-dark',
  )

const filterChipClassName = (active: boolean): string =>
  cn(
    'min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors',
    active
      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
      : 'border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-dark',
  )

export interface AdminVenuesListProps {
  initialCitySlug?: string
  savedVenueId?: string
  savedNotice?: string
}

export function AdminVenuesList({
  initialCitySlug,
  savedVenueId,
  savedNotice: savedNoticeFromUrl,
}: AdminVenuesListProps) {
  const [citySlug, setCitySlug] = useState(initialCitySlug ?? 'bend-or')
  const [search, setSearch] = useState('')
  const [archiveTab, setArchiveTab] = useState<VenueArchiveTab>('active')
  const [dataStatusFilter, setDataStatusFilter] = useState<VenueDataStatusFilter>('all')
  const [publishedFilter, setPublishedFilter] = useState(false)
  const [hasEventsFilter, setHasEventsFilter] = useState(false)
  const { archivedOnly } = archiveTabToFilters(archiveTab)
  const { liveOnly, pendingReviewOnly, noHappyHourOnly } =
    dataStatusFilterToApi(dataStatusFilter)
  const [venues, setVenues] = useState<AdminVenueListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<string | null>(savedNoticeFromUrl ?? null)
  const [selectedVenueIds, setSelectedVenueIds] = useState<Set<string>>(new Set())

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listAdminVenues({
        data: {
          citySlug: citySlug.trim() || undefined,
          search: search.trim() || undefined,
          liveOnly,
          pendingReviewOnly,
          noHappyHourOnly,
          publishedOnly: publishedFilter,
          archivedOnly,
          withEventsOnly: hasEventsFilter,
        },
      })
      setVenues(rows)
      setSelectedVenueIds((current) => {
        const next = new Set<string>()
        for (const id of current) {
          if (rows.some((row) => row.id === id)) {
            next.add(id)
          }
        }
        return next
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load venues')
      setVenues([])
    } finally {
      setLoading(false)
    }
  }, [
    citySlug,
    search,
    archiveTab,
    dataStatusFilter,
    liveOnly,
    pendingReviewOnly,
    noHappyHourOnly,
    archivedOnly,
    publishedFilter,
    hasEventsFilter,
  ])

  useEffect(() => {
    void load()
  }, [load])

  const clearFilters = (): void => {
    setArchiveTab('active')
    setDataStatusFilter('all')
    setSearch('')
    setPublishedFilter(false)
    setHasEventsFilter(false)
  }

  const filtersActive =
    archiveTab !== 'active' ||
    dataStatusFilter !== 'all' ||
    publishedFilter ||
    hasEventsFilter ||
    search.trim().length > 0

  const activeFilterLabels = [
    archiveTab === 'archived' ? 'archived' : null,
    dataStatusFilterLabel(dataStatusFilter),
    publishedFilter ? 'published' : null,
    hasEventsFilter ? 'has events' : null,
  ].filter((label): label is string => label !== null)

  const toggleVenueSelected = (venueId: string): void => {
    setSelectedVenueIds((current) => {
      const next = new Set(current)
      if (next.has(venueId)) {
        next.delete(venueId)
      } else {
        next.add(venueId)
      }
      return next
    })
  }

  const allVenuesSelected = venues.length > 0 && selectedVenueIds.size === venues.length
  const selectedVenueIdList = [...selectedVenueIds]
  const selectedPublishedVenueIds = venues
    .filter((venue) => selectedVenueIds.has(venue.id) && venue.is_published)
    .map((venue) => venue.id)

  const handleArchiveComplete = (result: {
    count: number
    venueNames: string[]
  }): void => {
    if (result.count === 0) {
      setSavedNotice(
        archivedOnly
          ? 'No venues were restored.'
          : 'No venues were archived (they may already be archived).',
      )
      return
    }

    const names =
      result.venueNames.length === 1
        ? `“${result.venueNames[0]}”`
        : `${result.count} venues`
    setSavedNotice(
      archivedOnly
        ? `Restored ${names} from the archive.`
        : `Archived ${names}. They are hidden from default lists and unpublished.`,
    )
    setSelectedVenueIds(new Set())
    void load()
  }

  const handleUnpublishComplete = (result: {
    unpublishedCount: number
    venueNames: string[]
  }): void => {
    if (result.unpublishedCount === 0) {
      setSavedNotice('No published venues were selected to unpublish.')
      return
    }

    const names =
      result.venueNames.length === 1
        ? `“${result.venueNames[0]}”`
        : `${result.unpublishedCount} venues`
    setSavedNotice(`Unpublished ${names}. They are no longer on the public map.`)
    void load()
  }

  useEffect(() => {
    if (!savedVenueId) {
      return
    }
    if (loading) {
      return
    }

    const savedVenue = venues.find((venue) => venue.id === savedVenueId)
    if (savedVenue) {
      setSavedNotice(
        savedNoticeFromUrl ?? `Saved “${savedVenue.name}”. It appears below.`,
      )
      document.getElementById(`venue-row-${savedVenueId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      return
    }

    setSavedNotice(
      filtersActive
        ? 'Venue saved, but filters are hiding it. Click “Show all venues”, then Refresh.'
        : 'Venue saved. If it still does not appear, confirm the city slug matches the venue’s city and click Refresh.',
    )
  }, [savedVenueId, venues, loading, filtersActive])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          to="/admin/venues/new"
          search={{ city: citySlug }}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="size-4" />
          Add venue
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-dark">City slug</span>
          <input
            value={citySlug}
            onChange={(event) => setCitySlug(event.target.value)}
            className={inputClassName}
            placeholder="bend-or"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-dark">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClassName}
            placeholder="Name or address"
          />
        </label>
      </div>

      <VenueFilterLegend />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Archive
        </p>
        <div
          className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-sm"
          role="tablist"
          aria-label="Filter by archive"
        >
          <button
            type="button"
            role="tab"
            aria-selected={archiveTab === 'active'}
            onClick={() => setArchiveTab('active')}
            className={primaryTabClassName(archiveTab === 'active')}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={archiveTab === 'archived'}
            onClick={() => setArchiveTab('archived')}
            className={primaryTabClassName(archiveTab === 'archived')}
          >
            Archived
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Data status
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by data status"
        >
          {VENUE_DATA_STATUS_FILTERS.map((option) => {
            const selected = dataStatusFilter === option.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setDataStatusFilter(option.id)}
                className={filterChipClassName(selected)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          More filters
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPublishedFilter((current) => !current)}
            aria-pressed={publishedFilter}
            className={filterChipClassName(publishedFilter)}
          >
            Published
          </button>
          <button
            type="button"
            onClick={() => setHasEventsFilter((current) => !current)}
            aria-pressed={hasEventsFilter}
            className={filterChipClassName(hasEventsFilter)}
          >
            Has events
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Filters stack — e.g. <span className="font-medium text-dark">Active</span> +{' '}
          <span className="font-medium text-dark">Live</span> +{' '}
          <span className="font-medium text-dark">Published</span> +{' '}
          <span className="font-medium text-dark">Has events</span>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : 'Refresh'}
        </Button>
        {filtersActive ? (
          <button
            type="button"
            onClick={() => {
              clearFilters()
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Show all venues
          </button>
        ) : null}
      </div>

      {!loading && venues.length > 0 ? (
        <div className="sticky top-0 z-10 space-y-2 rounded-xl border border-border/70 bg-card/95 p-4 shadow-sm backdrop-blur-sm">
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-dark">
            <input
              type="checkbox"
              checked={allVenuesSelected}
              onChange={(event) => {
                if (event.target.checked) {
                  setSelectedVenueIds(new Set(venues.map((venue) => venue.id)))
                } else {
                  setSelectedVenueIds(new Set())
                }
              }}
              className="size-5 shrink-0 rounded border-border"
            />
            Select all ({venues.length})
          </label>
          <div className="flex flex-wrap gap-3">
            {archivedOnly ? (
              <AdminArchiveVenues
                venueIds={selectedVenueIdList}
                mode="unarchive"
                onComplete={handleArchiveComplete}
                disabled={selectedVenueIdList.length === 0}
              />
            ) : (
              <>
                <AdminArchiveVenues
                  venueIds={selectedVenueIdList}
                  mode="archive"
                  onComplete={handleArchiveComplete}
                  disabled={selectedVenueIdList.length === 0}
                />
                <AdminUnpublishVenues
                  venueIds={selectedPublishedVenueIds}
                  onComplete={handleUnpublishComplete}
                  disabled={selectedPublishedVenueIds.length === 0}
                />
              </>
            )}
          </div>
          {selectedVenueIdList.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Check one or more venues above, then archive or unpublish published venues.
            </p>
          ) : null}
        </div>
      ) : null}

      {savedNotice ? (
        <p className="rounded-xl border border-open/40 bg-open/10 px-4 py-3 text-sm text-dark" role="status">
          {savedNotice}
        </p>
      ) : null}

      {!loading && venues.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Showing {venues.length} venue{venues.length === 1 ? '' : 's'}
          {activeFilterLabels.length > 0
            ? ` (${activeFilterLabels.join(', ')})`
            : ''}
          {citySlug.trim() ? ` in ${citySlug.trim()}` : ''}.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading venues…</p>
      ) : venues.length === 0 ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>No venues match these filters.</p>
          {filtersActive ? (
            <p>
              Your edit may be saved as <span className="font-medium text-dark">needs review</span>{' '}
              — try the <span className="font-medium text-dark">Needs review</span> filter, or click{' '}
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-primary hover:underline"
              >
                Show all venues
              </button>
              .
            </p>
          ) : (
            <p>
              Confirm city slug is <span className="font-medium text-dark">bend-or</span> (or your
              market) and click Refresh.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {venues.map((venue) => (
            <li
              key={venue.id}
              id={venue.id === savedVenueId ? `venue-row-${venue.id}` : undefined}
              className={cn(venue.id === savedVenueId && 'rounded-xl ring-2 ring-primary/40')}
            >
              <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedVenueIds.has(venue.id)}
                    onChange={() => toggleVenueSelected(venue.id)}
                    className="mt-2 size-5 shrink-0 rounded border-border"
                    aria-label={`Select ${venue.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        to="/admin/venues/$venueId"
                        params={{ venueId: venue.id }}
                        className="font-medium text-dark hover:text-primary hover:underline"
                      >
                        {venue.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill
                          status={venue.data_status}
                          published={venue.is_published}
                          mapVisible={venue.map_visible}
                        />
                        <ConfidencePill
                          confidence={venue.confidence}
                          hasSlots={venue.happy_hour_slot_count > 0}
                        />
                        {archivedOnly ? (
                          <AdminArchiveVenues
                            venueIds={[venue.id]}
                            mode="unarchive"
                            size="sm"
                            onComplete={handleArchiveComplete}
                          />
                        ) : (
                          <>
                            <AdminArchiveVenues
                              venueIds={[venue.id]}
                              mode="archive"
                              size="sm"
                              onComplete={handleArchiveComplete}
                            />
                            {venue.is_published ? (
                              <AdminUnpublishVenues
                                venueIds={[venue.id]}
                                size="sm"
                                onComplete={handleUnpublishComplete}
                              />
                            ) : null}
                          </>
                        )}
                        <Button variant="outline" size="sm" className="min-h-9 gap-1.5" asChild>
                          <Link to="/admin/venues/$venueId" params={{ venueId: venue.id }}>
                            <Pencil className="size-3.5" aria-hidden />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-muted-foreground">{venue.address_line1}</p>
                    {venue.phone ? (
                      <p className="mt-1 text-muted-foreground">{venue.phone}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {venue.happy_hour_slot_count} happy hour slot
                      {venue.happy_hour_slot_count === 1 ? '' : 's'}
                      {venue.live_slot_count > 0
                        ? ` · ${venue.live_slot_count} live on map`
                        : ''}
                      {venue.event_count > 0
                        ? ` · ${venue.event_count} event${venue.event_count === 1 ? '' : 's'}`
                        : ''}
                      {venue.published_event_count > 0
                        ? ` (${venue.published_event_count} published)`
                        : venue.event_count > 0
                          ? ' (none published)'
                          : ''}
                      {venue.map_visible ? ' · visible on map' : ''}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {venue.city_name} · /{venue.slug}
                      {venue.place_id ? ` · place ${venue.place_id.slice(0, 12)}…` : ''}
                    </p>

                    <VenueSourceLinks
                      websiteUrl={venue.website_url}
                      sourceUrls={venue.source_urls}
                      className="mt-2 space-y-1.5"
                    />

                    {venueStatusMismatch(venue.data_status, venue.happy_hour_slot_count) ? (
                      <p className="mt-2 text-xs text-secondary">
                        {venueStatusMismatch(venue.data_status, venue.happy_hour_slot_count)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function VenueFilterLegend() {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-sm">
      <p className="font-semibold text-dark">Live vs Published</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-4">
        <li>
          <span className="font-medium text-dark">Live</span> is <em>data status</em> — you reviewed
          and approved the venue info in the editor.
        </li>
        <li>
          <span className="font-medium text-dark">Published</span> is the{' '}
          <em>Published on discovery map</em> switch (requires Live status).
        </li>
      </ul>
    </div>
  )
}

function listConfidenceLabel(confidence: ScrapeConfidence | null): string {
  if (confidence === 'high') {
    return 'High'
  }
  if (confidence === 'medium') {
    return 'Medium'
  }
  if (confidence === 'low') {
    return 'Low'
  }
  return 'Not set'
}

function ConfidencePill({
  confidence,
  hasSlots,
}: {
  confidence: ScrapeConfidence | null
  hasSlots: boolean
}) {
  if (!hasSlots) {
    return null
  }

  const unverified = isUnverifiedConfidence(confidence)

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-semibold',
        unverified
          ? 'bg-urgency/15 text-urgency'
          : confidence === 'high'
            ? 'bg-open/15 text-open'
            : 'bg-secondary/20 text-dark',
      )}
      title={
        confidence === 'low'
          ? 'Low confidence — lowest across happy hour slots'
          : 'Lowest confidence across live happy hour slots'
      }
    >
      {listConfidenceLabel(confidence)}
    </span>
  )
}

function StatusPill({
  status,
  published,
  mapVisible,
}: {
  status: string
  published: boolean
  mapVisible: boolean
}) {
  return (
    <span className="flex flex-wrap gap-1">
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
          status === 'live' && 'bg-open/15 text-open',
          status === 'discovered' && 'bg-primary/15 text-primary',
          status === 'pending_review' && 'bg-secondary/20 text-dark',
          status === 'no_happy_hour_found' && 'bg-muted text-muted-foreground',
          status === 'flagged' && 'bg-destructive/15 text-destructive',
        )}
        title="Data status in the venue editor"
      >
        {status === 'live' ? 'Live data' : status.replace(/_/g, ' ')}
      </span>
      {published ? (
        <span
          className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
          title="Published on discovery map switch is on"
        >
          Published
        </span>
      ) : null}
      {mapVisible ? (
        <span
          className="rounded-full bg-open/15 px-2 py-0.5 text-xs font-semibold text-open"
          title="Visible on the public discovery map"
        >
          On map
        </span>
      ) : null}
    </span>
  )
}

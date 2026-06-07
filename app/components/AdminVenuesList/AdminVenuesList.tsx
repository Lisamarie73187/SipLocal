import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Archive, Loader2, Pencil, Plus } from 'lucide-react'

import { AdminArchiveVenues } from '@/components/AdminArchiveVenues/AdminArchiveVenues'
import { AdminUnpublishVenues } from '@/components/AdminUnpublishVenues/AdminUnpublishVenues'
import { Button } from '@/components/ui/button'
import { VenueSourceLinks } from '@/components/VenueSourceLinks/VenueSourceLinks'
import { listAdminVenues, type AdminVenueListItem } from '@/server/adminVenues'
import type { ScrapeConfidence } from '@/types/venue'
import {
  buildAdminVenuesListSearch,
  type AdminVenueListTab,
  type AdminVenuesListSearch,
} from '@/utils/adminVenuesListSearch'
import { venueStatusMismatch } from '@/utils/venueDataStatus'
import { isUnverifiedConfidence } from '@/utils/venueTrust'
import { cn } from '@/utils'

const inputClassName =
  'h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

type VenueListTab = AdminVenueListTab

const VENUE_LIST_TABS: Array<{ id: VenueListTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'pending_review', label: 'Pending review' },
  { id: 'live', label: 'Live' },
]

function venueTabToApi(tab: VenueListTab): {
  liveOnly: boolean
  pendingReviewOnly: boolean
  publishedOnly: boolean
} {
  return {
    liveOnly: tab === 'live',
    pendingReviewOnly: tab === 'pending_review',
    publishedOnly: tab === 'published',
  }
}

function venueTabLabel(tab: VenueListTab): string | null {
  const match = VENUE_LIST_TABS.find((item) => item.id === tab)
  return tab === 'all' ? null : (match?.label.toLowerCase() ?? null)
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
  listSearch: AdminVenuesListSearch
}

function currentListSearchParams(
  citySlug: string,
  search: string,
  listTab: VenueListTab,
  hasEventsFilter: boolean,
  showArchived: boolean,
): AdminVenuesListSearch {
  return {
    city: citySlug.trim() || undefined,
    tab: listTab === 'all' ? undefined : listTab,
    q: search.trim() || undefined,
    hasEvents: hasEventsFilter || undefined,
    archived: showArchived || undefined,
  }
}

export function AdminVenuesList({ listSearch }: AdminVenuesListProps) {
  const navigate = useNavigate()
  const [citySlug, setCitySlug] = useState(listSearch.city ?? 'bend-or')
  const [search, setSearch] = useState(listSearch.q ?? '')
  const [listTab, setListTab] = useState<VenueListTab>(listSearch.tab ?? 'all')
  const [hasEventsFilter, setHasEventsFilter] = useState(listSearch.hasEvents ?? false)
  const [showArchived, setShowArchived] = useState(listSearch.archived ?? false)
  const { liveOnly, pendingReviewOnly, publishedOnly } = venueTabToApi(listTab)
  const [venues, setVenues] = useState<AdminVenueListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [selectedVenueIds, setSelectedVenueIds] = useState<Set<string>>(new Set())

  const commitListSearch = useCallback(
    (patch: Partial<AdminVenuesListSearch>): void => {
      void navigate({
        to: '/admin/venues',
        search: buildAdminVenuesListSearch({
          ...currentListSearchParams(citySlug, search, listTab, hasEventsFilter, showArchived),
          ...patch,
        }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, citySlug, search, listTab, hasEventsFilter, showArchived],
  )

  const editLinkSearch = buildAdminVenuesListSearch(
    currentListSearchParams(citySlug, search, listTab, hasEventsFilter, showArchived),
  )

  useEffect(() => {
    setCitySlug(listSearch.city ?? 'bend-or')
    setSearch(listSearch.q ?? '')
    setListTab(listSearch.tab ?? 'all')
    setHasEventsFilter(listSearch.hasEvents ?? false)
    setShowArchived(listSearch.archived ?? false)
  }, [listSearch.city, listSearch.q, listSearch.tab, listSearch.hasEvents, listSearch.archived])

  useEffect(() => {
    if (!listSearch.notice) {
      return
    }

    setSavedNotice(listSearch.notice)
    void navigate({
      to: '/admin/venues',
      search: buildAdminVenuesListSearch({
        city: listSearch.city,
        tab: listSearch.tab,
        q: listSearch.q,
        hasEvents: listSearch.hasEvents,
        archived: listSearch.archived,
      }),
      replace: true,
      resetScroll: false,
    })
  }, [listSearch.notice, listSearch.city, listSearch.tab, listSearch.q, listSearch.hasEvents, listSearch.archived, navigate])

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listAdminVenues({
        data: {
          citySlug: citySlug.trim() || undefined,
          search: search.trim() || undefined,
          liveOnly: showArchived ? undefined : liveOnly,
          pendingReviewOnly: showArchived ? undefined : pendingReviewOnly,
          publishedOnly: showArchived ? undefined : publishedOnly,
          archivedOnly: showArchived,
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
    listTab,
    liveOnly,
    pendingReviewOnly,
    publishedOnly,
    hasEventsFilter,
    showArchived,
  ])

  useEffect(() => {
    void load()
  }, [load])

  const clearFilters = (): void => {
    setListTab('all')
    setSearch('')
    setHasEventsFilter(false)
    commitListSearch({ tab: undefined, q: undefined, hasEvents: false })
  }

  useEffect(() => {
    const q = search.trim() || undefined
    if (q === listSearch.q) {
      return
    }

    const handle = window.setTimeout(() => {
      commitListSearch({ q })
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [search, listSearch.q, commitListSearch])

  useEffect(() => {
    const city = citySlug.trim() || undefined
    if (city === listSearch.city) {
      return
    }

    const handle = window.setTimeout(() => {
      commitListSearch({ city })
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [citySlug, listSearch.city, commitListSearch])

  const filtersActive =
    listTab !== 'all' || hasEventsFilter || search.trim().length > 0

  const activeFilterLabels = [
    showArchived ? 'archived' : venueTabLabel(listTab),
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
        showArchived
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
      showArchived
        ? `Restored ${names} to active venues.`
        : `Archived ${names}. They are hidden from this list and unpublished.`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/admin/venues/new"
          search={editLinkSearch}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="size-4" />
          Add venue
        </Link>
        {showArchived ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2"
            onClick={() => {
              setShowArchived(false)
              setSelectedVenueIds(new Set())
              commitListSearch({ archived: false })
            }}
          >
            Back to active venues
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2"
            onClick={() => {
              setShowArchived(true)
              setSelectedVenueIds(new Set())
              commitListSearch({ archived: true })
            }}
          >
            <Archive className="size-4" aria-hidden />
            View archived
          </Button>
        )}
      </div>

      {showArchived ? (
        <p className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Archived venues are hidden from the map and the active list. Restore them to edit or
          publish again.
        </p>
      ) : null}

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

      {!showArchived ? (
        <div className="space-y-3">
          <div
            className="grid w-full grid-cols-4 gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-sm"
            role="tablist"
            aria-label="Filter venues"
          >
            {VENUE_LIST_TABS.map((tab) => {
              const selected = listTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setListTab(tab.id)
                    commitListSearch({ tab: tab.id === 'all' ? undefined : tab.id })
                  }}
                  className={cn(
                    primaryTabClassName(selected),
                    'min-w-0 whitespace-nowrap px-1 text-xs sm:px-2 sm:text-sm',
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHasEventsFilter((current) => {
                  const next = !current
                  commitListSearch({ hasEvents: next || undefined })
                  return next
                })
              }}
              aria-pressed={hasEventsFilter}
              className={filterChipClassName(hasEventsFilter)}
            >
              Has events
            </button>
            {hasEventsFilter ? (
              <p className="text-xs text-muted-foreground">
                Showing venues with at least one event in the{' '}
                <span className="font-medium text-dark">
                  {VENUE_LIST_TABS.find((tab) => tab.id === listTab)?.label ?? 'All'}
                </span>{' '}
                tab.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setHasEventsFilter((current) => {
                const next = !current
                commitListSearch({ hasEvents: next || undefined })
                return next
              })
            }}
            aria-pressed={hasEventsFilter}
            className={filterChipClassName(hasEventsFilter)}
          >
            Has events
          </button>
        </div>
      )}

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
            {showArchived ? (
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
              {showArchived
                ? 'Check one or more archived venues above, then restore them.'
                : 'Check one or more venues above, then archive or unpublish published venues.'}
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
              Your edit may be saved as <span className="font-medium text-dark">pending review</span>
              — try the <span className="font-medium text-dark">Pending review</span> tab, or click{' '}
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
            <li key={venue.id}>
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
                        search={editLinkSearch}
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
                        {showArchived ? (
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
                          <Link
                            to="/admin/venues/$venueId"
                            params={{ venueId: venue.id }}
                            search={editLinkSearch}
                          >
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

                    {venueStatusMismatch(
                      venue.data_status,
                      venue.happy_hour_slot_count,
                      venue.event_count,
                    ) ? (
                      <p className="mt-2 text-xs text-secondary">
                        {venueStatusMismatch(
                          venue.data_status,
                          venue.happy_hour_slot_count,
                          venue.event_count,
                        )}
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
      <p className="font-semibold text-dark">Tabs</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-4">
        <li>
          <span className="font-medium text-dark">Published</span> — on the discovery map (
          <em>Published on discovery map</em> is on).
        </li>
        <li>
          <span className="font-medium text-dark">Live</span> — data status is Live but not
          published yet (ready to turn on the map switch).
        </li>
        <li>
          <span className="font-medium text-dark">Pending review</span> — data still needs admin
          review in the editor.
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

import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AdminVenueDiscoverPanel } from '@/components/AdminVenueDiscoverPanel/AdminVenueDiscoverPanel'
import { HappyHourPastePanel } from '@/components/HappyHourPastePanel/HappyHourPastePanel'
import {
  discoverVenuesByName,
  getAdminDiscoverDashboard,
  listDiscoveredVenues,
  markVenueNoHappyHour,
  type DiscoveredVenueListItem,
} from '@/server/adminDiscover'
import { pasteAdminVenueHappyHours } from '@/server/adminVenues'

const textareaClassName =
  'min-h-40 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

export function AdminDiscoverPanel() {
  const [citySlug, setCitySlug] = useState('bend-or')
  const [cities, setCities] = useState<Array<{ slug: string; name: string; state: string }>>([])
  const [namesText, setNamesText] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [discoverMessage, setDiscoverMessage] = useState<string | null>(null)
  const [venues, setVenues] = useState<DiscoveredVenueListItem[]>([])
  const [loadingVenues, setLoadingVenues] = useState(true)
  const [pastingVenueId, setPastingVenueId] = useState<string | null>(null)
  const [markingVenueId, setMarkingVenueId] = useState<string | null>(null)

  const loadVenues = useCallback(async (): Promise<void> => {
    setLoadingVenues(true)
    try {
      const rows = await listDiscoveredVenues({ data: { citySlug } })
      setVenues(rows)
    } finally {
      setLoadingVenues(false)
    }
  }, [citySlug])

  useEffect(() => {
    void getAdminDiscoverDashboard().then((dashboard) => {
      setCities(dashboard.cities)
    })
  }, [])

  useEffect(() => {
    void loadVenues()
  }, [loadVenues])

  const handleMarkNoHappyHour = (venueId: string): void => {
    setMarkingVenueId(venueId)
    void markVenueNoHappyHour({ data: { venueId } })
      .then(() => loadVenues())
      .finally(() => setMarkingVenueId(null))
  }

  const handleDiscover = (): void => {
    setDiscovering(true)
    setDiscoverMessage(null)
    void discoverVenuesByName({ data: { citySlug, namesText } })
      .then((result) => {
        setDiscoverMessage(
          `Created ${result.created}, updated ${result.updated}, skipped ${result.skipped}, not found ${result.notFound}, errors ${result.failed}.`,
        )
        void loadVenues()
      })
      .catch((error) => {
        setDiscoverMessage(error instanceof Error ? error.message : 'Discover failed')
      })
      .finally(() => {
        setDiscovering(false)
      })
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dark">Discover venues</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste bar and restaurant names (one per line). Google Places fills address, phone,
            website, and map coordinates. Open each venue in the editor to add happy hours and
            events manually.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-dark">City</span>
            <select
              value={citySlug}
              onChange={(event) => setCitySlug(event.target.value)}
              className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
            >
              {cities.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name}, {city.state}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-dark">Restaurant names</span>
          <textarea
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
            className={textareaClassName}
            placeholder={'10 Barrel Brewing\nZydeco Kitchen\nThe Lot'}
          />
        </label>

        <Button
          type="button"
          onClick={handleDiscover}
          disabled={discovering || namesText.trim().length === 0}
          className="min-h-11"
        >
          {discovering ? <Loader2 className="animate-spin" /> : null}
          Discover from Google
        </Button>

        {discoverMessage ? (
          <p className="text-sm text-dark" role="status">
            {discoverMessage}
          </p>
        ) : null}
      </section>

      <AdminVenueDiscoverPanel citySlug={citySlug} onVenuesAdded={() => void loadVenues()} />

      <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dark">Discovered venues</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Venues waiting for happy hour data. Paste a schedule on each row or open the editor for
            full control.
          </p>
        </div>

        {loadingVenues ? (
          <p className="text-sm text-muted-foreground">Loading discovered venues…</p>
        ) : venues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No discovered venues in {citySlug}. Run discover above.
          </p>
        ) : (
          <ul className="space-y-2">
            {venues.map((venue) => (
              <li
                key={venue.id}
                className="rounded-xl border border-border/70 bg-background px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    to="/admin/venues/$venueId"
                    params={{ venueId: venue.id }}
                    className="font-medium text-dark hover:text-primary hover:underline"
                  >
                    {venue.name}
                  </Link>
                  <p className="mt-1 text-muted-foreground">{venue.address_line1}</p>
                  {venue.phone ? (
                    <p className="mt-1 text-muted-foreground">{venue.phone}</p>
                  ) : null}
                  {venue.website_url ? (
                    <a
                      href={venue.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-primary hover:underline"
                    >
                      {venue.website_url}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-secondary">No website on file</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {venue.happy_hour_slot_count > 0
                      ? `${venue.happy_hour_slot_count} happy hour slot${venue.happy_hour_slot_count === 1 ? '' : 's'} on file`
                      : 'No happy hours yet'}
                  </p>
                </div>
                <HappyHourPastePanel
                  variant="compact"
                  applyLabel="Save happy hours"
                  showModeToggle={false}
                  defaultMode="append"
                  saving={pastingVenueId === venue.id}
                  onApply={async (result) => {
                    setPastingVenueId(venue.id)
                    try {
                      await pasteAdminVenueHappyHours({
                        data: { venueId: venue.id, mode: 'append', slots: result.slots },
                      })
                      await loadVenues()
                    } finally {
                      setPastingVenueId(null)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 min-h-11"
                  disabled={markingVenueId === venue.id}
                  onClick={() => handleMarkNoHappyHour(venue.id)}
                >
                  {markingVenueId === venue.id ? <Loader2 className="size-4 animate-spin" /> : null}
                  No happy hour — send to review
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

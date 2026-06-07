import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Copy, Loader2, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { HappyHourMenuPhotoPanel } from '@/components/HappyHourMenuPhotoPanel/HappyHourMenuPhotoPanel'
import { HappyHourPastePanel } from '@/components/HappyHourPastePanel/HappyHourPastePanel'
import { VenueSourceLinks } from '@/components/VenueSourceLinks/VenueSourceLinks'
import {
  setVenueCommunityVerified,
  setVenueHappyHourConfidence,
  setVenueScheduleCadence,
} from '@/server/adminDiscover'
import { getAdminVenueForEdit, saveAdminVenue } from '@/server/adminVenues'
import { parseHappyHourMenuPhotoAdmin } from '@/server/menuPhotoSubmissions'
import type { AdminVenueEditorSlot } from '@/server/adminVenues'
import { formatHappyHourDayLabel } from '@/utils/happyHourSchedule'
import { getDayName } from '@/utils/happyHour'
import type { DayOfWeek, ScrapeConfidence } from '@/types/venue'
import { expandGroupedSlotsForSave, groupSlotsForEditor } from '@/utils/happyHourEditorSlots'
import type { ParsedHappyHourSlot } from '@/utils/parseHappyHourPaste'
import { slugifyVenueName } from '@/utils/slug'
import { collectUniqueUrls } from '@/utils/urlDisplay'
import { validateVenueBeforeSave, venueStatusMismatch } from '@/utils/venueDataStatus'
import {
  formatSourceCountLabel,
  formatTrustFreshnessLabel,
  rollupSlotConfidence,
  SCRAPE_CONFIDENCE_ADMIN_OPTIONS,
} from '@/utils/venueTrust'
import { VENUE_TYPE_ADMIN_OPTIONS } from '@/utils/venueType'
import { VIBE_ADMIN_OPTIONS } from '@/utils/vibe'
import { buildAdminVenuesListSearch } from '@/utils/adminVenuesListSearch'
import { cn } from '@/utils'

import { AdminVenueEventsSection, type DraftEventInput } from './AdminVenueEventsSection'
import { AdminVenueManagersSection } from '@/components/AdminVenueManagersSection/AdminVenueManagersSection'
import { AdminMenuSubmissionsPanel } from '@/components/AdminMenuSubmissionsPanel/AdminMenuSubmissionsPanel'
import { AdminEventSubmissionsPanel } from '@/components/AdminEventSubmissionsPanel/AdminEventSubmissionsPanel'
import type { AdminVenueEditorProps, SlotFormState, VenueFormState } from './AdminVenueEditor.types'

const inputClassName =
  'h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-base text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

const labelClassName = 'text-sm font-medium text-dark'

function venueToFormState(
  venue: NonNullable<AdminVenueEditorProps['initialVenue']>,
): VenueFormState {
  return {
    ...venue,
    address_line2: venue.address_line2 ?? '',
    postal_code: venue.postal_code ?? '',
    lat: String(venue.lat),
    lng: String(venue.lng),
    phone: venue.phone ?? '',
    website_url: venue.website_url ?? '',
    description: venue.description ?? '',
    place_id: venue.place_id ?? '',
    venue_types: venue.venue_types ?? [],
    vibes: venue.vibes ?? [],
    last_verified_at: venue.last_verified_at ?? '',
    community_verified_at: venue.community_verified_at ?? '',
    last_scraped_at: venue.last_scraped_at ?? '',
    schedule_cadence: venue.schedule_cadence ?? '',
  }
}

function slotsToFormState(slots: AdminVenueEditorSlot[]): SlotFormState[] {
  return groupSlotsForEditor(slots).map((slot, index) => ({
    ...slot,
    key: `slot-${index}`,
    deals: slot.deals.length > 0 ? slot.deals : [{ label: '', category: 'drinks', price_text: null }],
  }))
}

function newEmptySlot(): SlotFormState {
  return {
    key: `slot-${crypto.randomUUID()}`,
    days: [1],
    start_time: '16:00',
    end_time: '18:00',
    deal_summary: null,
    data_status: 'pending_review',
    is_active: true,
    confidence: null,
    source_urls: [],
    deals: [{ label: '', category: 'drinks', price_text: null }],
  }
}

function formatEditorFreshness(venue: VenueFormState): string | null {
  const staffVerified = venue.last_verified_at ? new Date(venue.last_verified_at) : null
  if (staffVerified && !Number.isNaN(staffVerified.getTime())) {
    return formatTrustFreshnessLabel('verified', staffVerified)
  }

  const communityVerified = venue.community_verified_at
    ? new Date(venue.community_verified_at)
    : null
  if (communityVerified && !Number.isNaN(communityVerified.getTime())) {
    return formatTrustFreshnessLabel('community', communityVerified)
  }

  const scraped = venue.last_scraped_at ? new Date(venue.last_scraped_at) : null
  if (scraped && !Number.isNaN(scraped.getTime())) {
    return formatTrustFreshnessLabel('updated', scraped)
  }

  return null
}

function duplicateSlot(slot: SlotFormState): SlotFormState {
  return {
    ...slot,
    key: `slot-${crypto.randomUUID()}`,
    deals: slot.deals.map((deal) => ({ ...deal })),
  }
}

function parsedSlotsToFormState(parsed: ParsedHappyHourSlot[]): SlotFormState[] {
  return parsed.map((slot) => ({
    key: `slot-${crypto.randomUUID()}`,
    days: slot.days,
    start_time: slot.start_time,
    end_time: slot.end_time,
    deal_summary: slot.deal_summary,
    data_status: 'pending_review',
    is_active: true,
    confidence: null,
    source_urls: [],
    deals: [{ label: '', category: 'drinks', price_text: null }],
  }))
}

export function AdminVenueEditor({
  mode,
  initialCities,
  initialVenue,
  initialSlots,
  cityTimezone = 'America/Los_Angeles',
  initialEvents = [],
  onEventsReload,
  returnListSearch,
}: AdminVenueEditorProps) {
  const navigate = useNavigate()
  const [venue, setVenue] = useState<VenueFormState>(() => venueToFormState(initialVenue))
  const [slots, setSlots] = useState<SlotFormState[]>(() => slotsToFormState(initialSlots))
  const [saving, setSaving] = useState(false)
  const [confidenceSaving, setConfidenceSaving] = useState(false)
  const [communitySaving, setCommunitySaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDraftEvent, setPendingDraftEvent] = useState<DraftEventInput | null>(null)
  const [autoSlug, setAutoSlug] = useState(mode === 'create')
  const editorTrustConfidence = useMemo(() => rollupSlotConfidence(slots), [slots])
  const editorSourceUrls = useMemo(
    () => collectUniqueUrls(slots.flatMap((slot) => slot.source_urls)),
    [slots],
  )
  const reloadSlotsFromServer = useCallback(async (): Promise<void> => {
    if (!venue.id) {
      return
    }

    const fresh = await getAdminVenueForEdit({ data: { venueId: venue.id } })
    setSlots(slotsToFormState(fresh.slots))
  }, [venue.id])

  const editorSourceCount = useMemo(() => {
    const website = venue.website_url?.trim()
    if (!website) {
      return editorSourceUrls.length
    }
    return editorSourceUrls.filter((url) => url !== website).length
  }, [editorSourceUrls, venue.website_url])
  const editorFreshnessLabel = formatEditorFreshness(venue)
  const isCommunityVerified = Boolean(venue.community_verified_at)
  const citySlug =
    initialCities.find((city) => city.id === venue.city_id)?.slug ?? 'bend-or'

  const updateVenue = useCallback(
    (patch: Partial<VenueFormState>): void => {
      setVenue((current) => {
        if (!current) {
          return current
        }
        const next = { ...current, ...patch }
        if (autoSlug && patch.name != null) {
          next.slug = slugifyVenueName(patch.name)
        }
        return next
      })
    },
    [autoSlug],
  )

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!venue) {
      return
    }

    const lat = Number.parseFloat(venue.lat)
    const lng = Number.parseFloat(venue.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Latitude and longitude must be valid numbers.')
      return
    }

    if (slots.some((slot) => slot.start_time && slot.end_time && slot.days.length === 0)) {
      setError('Each happy hour slot needs at least one day selected.')
      return
    }

    const cleanedSlots = expandGroupedSlotsForSave(
      slots
        .filter((slot) => slot.start_time && slot.end_time && slot.days.length > 0)
        .map((slot) => ({
          ...slot,
          deals: slot.deals
            .filter((deal) => deal.label.trim())
            .map((deal) => ({
              label: deal.label.trim(),
              category: deal.category,
              price_text: deal.price_text,
            })),
        })),
    ).map((slot) => ({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      deal_summary: slot.deal_summary,
      data_status: slot.data_status,
      is_active: slot.is_active,
      confidence: slot.confidence,
      source_urls: slot.source_urls,
      deals: slot.deals,
    }))

    const validationError = validateVenueBeforeSave(
      venue.data_status,
      cleanedSlots.length,
      venue.is_published,
      initialEvents.length,
    )
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await saveAdminVenue({
        data: {
          venue: {
            id: venue.id || undefined,
            city_id: venue.city_id,
            name: venue.name,
            slug: venue.slug,
            address_line1: venue.address_line1,
            address_line2: venue.address_line2 || null,
            postal_code: venue.postal_code || null,
            lat,
            lng,
            phone: venue.phone || null,
            website_url: venue.website_url || null,
            description: venue.description || null,
            price_level: venue.price_level,
            data_status: venue.data_status,
            is_published: venue.is_published,
            is_featured: venue.is_featured,
            place_id: venue.place_id || null,
            venue_types: venue.venue_types,
            vibes: venue.vibes,
            schedule_cadence: venue.schedule_cadence || null,
          },
          slots: cleanedSlots,
        },
      })

      const mapNote = result.mapVisible
        ? ' It is visible on the public map.'
        : result.isPublished && result.dataStatus === 'live'
          ? ' Published as live — add live happy hour slots to appear on the map.'
          : result.dataStatus === 'live'
            ? ' Saved as live — check Published and live slots for map visibility.'
            : ''

      await navigate({
        to: '/admin/venues',
        search: buildAdminVenuesListSearch({
          ...returnListSearch,
          city: citySlug,
          notice: `Saved as ${result.dataStatus.replace(/_/g, ' ')} (${result.slotCount} slot${result.slotCount === 1 ? '' : 's'}).${mapNote}`,
        }),
        resetScroll: false,
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save venue')
    } finally {
      setSaving(false)
    }
  }

  const statusWarning = venueStatusMismatch(venue.data_status, slots.length, initialEvents.length)
  const activeSlotCount = slots.filter((slot) => slot.is_active).length
  const eventCount = initialEvents.length
  const hasHappyHourOrEvents = activeSlotCount > 0 || eventCount > 0
  const readyForMap =
    venue.data_status === 'live' &&
    venue.is_published &&
    hasHappyHourOrEvents &&
    (eventCount > 0 || slots.some((slot) => slot.start_time && slot.end_time))

  const handlePublishToMap = (checked: boolean): void => {
    if (checked) {
      updateVenue({ is_published: true, data_status: 'live' })
      return
    }
    updateVenue({ is_published: false })
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-8">
      <section className="space-y-4 rounded-xl border-2 border-primary/25 bg-primary/5 p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-dark">Publish to map</h2>
        <p className="text-sm text-muted-foreground">
          Turn this on to show the venue on the public discovery map. You still need at least one
          happy hour slot or event, then click{' '}
          <span className="font-medium text-dark">Save venue</span>.
        </p>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
          <input
            type="checkbox"
            checked={venue.is_published}
            onChange={(event) => handlePublishToMap(event.target.checked)}
            className="mt-1 size-5 shrink-0 rounded border-border"
          />
          <span>
            <span className="text-base font-semibold text-dark">Published on discovery map</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Sets data status to Live when enabled. Uncheck to hide from the map (keeps your edits
              in admin).
            </span>
          </span>
        </label>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className={venue.data_status === 'live' ? 'text-open' : ''}>
            {venue.data_status === 'live' ? '✓' : '○'} Data status is Live
          </li>
          <li className={venue.is_published ? 'text-open' : ''}>
            {venue.is_published ? '✓' : '○'} Published to map
          </li>
          <li className={hasHappyHourOrEvents ? 'text-open' : ''}>
            {hasHappyHourOrEvents ? '✓' : '○'} {activeSlotCount} active happy hour slot
            {activeSlotCount === 1 ? '' : 's'}, {eventCount} event{eventCount === 1 ? '' : 's'}
          </li>
        </ul>
        {readyForMap ? (
          <p className="text-sm font-medium text-open">Ready for the map after you save.</p>
        ) : (
          <p className="text-sm text-secondary">
            Not ready for the map yet — complete the checklist above, then save.
          </p>
        )}
      </section>

      {statusWarning ? (
        <p className="rounded-xl border border-secondary/50 bg-secondary/10 px-4 py-3 text-sm text-dark">
          {statusWarning}
        </p>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-dark">Venue details</h2>

        <label className="block space-y-2">
          <span className={labelClassName}>City</span>
          <select
            value={venue.city_id}
            onChange={(event) => updateVenue({ city_id: event.target.value })}
            className={inputClassName}
          >
            {initialCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.state}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className={labelClassName}>Name</span>
          <input
            required
            value={venue.name}
            onChange={(event) => updateVenue({ name: event.target.value })}
            className={inputClassName}
          />
        </label>

        <label className="block space-y-2">
          <span className={labelClassName}>URL slug</span>
          <input
            required
            value={venue.slug}
            onChange={(event) => {
              setAutoSlug(false)
              updateVenue({ slug: event.target.value })
            }}
            className={inputClassName}
          />
          {mode === 'create' ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setAutoSlug(true)
                updateVenue({ slug: slugifyVenueName(venue.name) })
              }}
            >
              Regenerate slug from name
            </button>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className={labelClassName}>Address</span>
          <input
            required
            value={venue.address_line1}
            onChange={(event) => updateVenue({ address_line1: event.target.value })}
            className={inputClassName}
          />
        </label>

        <label className="block space-y-2">
          <span className={labelClassName}>Address line 2 (optional)</span>
          <input
            value={venue.address_line2}
            onChange={(event) => updateVenue({ address_line2: event.target.value })}
            className={inputClassName}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={labelClassName}>ZIP</span>
            <input
              value={venue.postal_code}
              onChange={(event) => updateVenue({ postal_code: event.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClassName}>Phone</span>
            <input
              value={venue.phone}
              onChange={(event) => updateVenue({ phone: event.target.value })}
              className={inputClassName}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={labelClassName}>Latitude</span>
            <input
              required
              inputMode="decimal"
              value={venue.lat}
              onChange={(event) => updateVenue({ lat: event.target.value })}
              className={inputClassName}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClassName}>Longitude</span>
            <input
              required
              inputMode="decimal"
              value={venue.lng}
              onChange={(event) => updateVenue({ lng: event.target.value })}
              className={inputClassName}
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className={labelClassName}>Website</span>
          <input
            type="url"
            value={venue.website_url}
            onChange={(event) => updateVenue({ website_url: event.target.value })}
            placeholder="https://"
            className={inputClassName}
          />
        </label>

        <VenueSourceLinks
          websiteUrl={venue.website_url.trim() || null}
          sourceUrls={editorSourceUrls}
          className="rounded-xl border border-border/70 bg-background/60 px-3 py-3"
        />

        <label className="block space-y-2">
          <span className={labelClassName}>Description / notes</span>
          <textarea
            value={venue.description}
            onChange={(event) => updateVenue({ description: event.target.value })}
            rows={3}
            className={cn(inputClassName, 'h-auto py-2')}
          />
        </label>

        <div className="space-y-2">
          <span className={labelClassName}>Venue type</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {VENUE_TYPE_ADMIN_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-2"
              >
                <input
                  type="checkbox"
                  checked={venue.venue_types.includes(option.value)}
                  onChange={(event) =>
                    updateVenue({
                      venue_types: event.target.checked
                        ? [...venue.venue_types, option.value]
                        : venue.venue_types.filter((type) => type !== option.value),
                    })
                  }
                  className="size-5 shrink-0 rounded border-border"
                />
                <span className="text-sm text-dark">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={labelClassName}>Price level</span>
            <select
              value={venue.price_level}
              onChange={(event) =>
                updateVenue({
                  price_level: event.target.value as VenueFormState['price_level'],
                })
              }
              className={inputClassName}
            >
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
            </select>
          </label>
        </div>

        <div className="space-y-2">
          <span className={labelClassName}>Vibes</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {VIBE_ADMIN_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-2"
              >
                <input
                  type="checkbox"
                  checked={venue.vibes.includes(option.value)}
                  onChange={(event) =>
                    updateVenue({
                      vibes: event.target.checked
                        ? [...venue.vibes, option.value]
                        : venue.vibes.filter((vibe) => vibe !== option.value),
                    })
                  }
                  className="size-5 shrink-0 rounded border-border"
                />
                <span className="text-sm text-dark">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className={labelClassName}>Data status</span>
            <select
              value={venue.data_status}
              onChange={(event) =>
                updateVenue({
                  data_status: event.target.value as VenueFormState['data_status'],
                })
              }
              className={inputClassName}
            >
              <option value="discovered">Discovered (Google only)</option>
              <option value="pending_review">Pending review</option>
              <option value="live">Live</option>
              <option value="no_happy_hour_found">No happy hour found</option>
              <option value="flagged">Flagged</option>
            </select>
          </label>
        </div>

        <section className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4">
          <h3 className="font-heading text-sm font-semibold text-dark">Data quality</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{editorFreshnessLabel ?? 'No scrape or verification date recorded yet.'}</p>
            {editorSourceCount > 0 ? (
              <p>{formatSourceCountLabel(editorSourceCount)}</p>
            ) : null}
          </div>
          {slots.length > 0 ? (
            <label className="block space-y-2">
              <span className="text-xs font-medium text-dark">Confidence</span>
              <select
                value={editorTrustConfidence ?? ''}
                disabled={confidenceSaving}
                onChange={(event) => {
                  const confidence =
                    event.target.value === ''
                      ? null
                      : (event.target.value as ScrapeConfidence)
                  setSlots((current) => current.map((slot) => ({ ...slot, confidence })))
                  if (mode === 'edit' && venue.id) {
                    setConfidenceSaving(true)
                    void setVenueHappyHourConfidence({
                      data: { venueId: venue.id, confidence },
                    })
                      .catch((saveError) => {
                        setError(
                          saveError instanceof Error
                            ? saveError.message
                            : 'Could not update confidence',
                        )
                      })
                      .finally(() => setConfidenceSaving(false))
                  }
                }}
                className={inputClassName}
              >
                {SCRAPE_CONFIDENCE_ADMIN_OPTIONS.map((option) => (
                  <option key={option.value || 'unset'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Applies to all happy hour slots for this venue.
              </p>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add happy hour slots to set confidence.
            </p>
          )}

          {mode === 'edit' && venue.id ? (
            <div className="space-y-3 border-t border-border/60 pt-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-dark">Community verified</p>
                <Button
                  type="button"
                  size="sm"
                  variant={isCommunityVerified ? 'default' : 'outline'}
                  className="min-h-9"
                  disabled={communitySaving}
                  aria-pressed={isCommunityVerified}
                  onClick={() => {
                    const next = !isCommunityVerified
                    setCommunitySaving(true)
                    void setVenueCommunityVerified({
                      data: { venueId: venue.id, enabled: next },
                    })
                      .then(({ communityVerifiedAt }) => {
                        updateVenue({ community_verified_at: communityVerifiedAt ?? '' })
                      })
                      .catch((saveError) => {
                        setError(
                          saveError instanceof Error
                            ? saveError.message
                            : 'Could not update community verification',
                        )
                      })
                      .finally(() => setCommunitySaving(false))
                  }}
                >
                  {communitySaving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isCommunityVerified ? 'Community verified' : 'Mark community verified'}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-dark">Happy hour changes</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['weekly', 'Weekly'],
                      ['monthly', 'Monthly'],
                      ['annually', 'Annually'],
                      ['seasonally', 'Seasonally'],
                    ] as const
                  ).map(([value, label]) => {
                    const selected = venue.schedule_cadence === value
                    return (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        className="min-h-9"
                        onClick={() => {
                          const next = selected ? null : value
                          updateVenue({ schedule_cadence: next ?? '' })
                          if (mode === 'edit' && venue.id) {
                            void setVenueScheduleCadence({
                              data: { venueId: venue.id, scheduleCadence: next },
                            })
                          }
                        }}
                      >
                        {label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <label className="block space-y-2">
          <span className={labelClassName}>Google Place ID (optional)</span>
          <input
            value={venue.place_id}
            onChange={(event) => updateVenue({ place_id: event.target.value })}
            className={inputClassName}
          />
        </label>

        <label className="flex min-h-11 items-center gap-2 text-sm text-dark">
          <input
            type="checkbox"
            checked={venue.is_featured}
            onChange={(event) => updateVenue({ is_featured: event.target.checked })}
            className="size-5 rounded border-border"
          />
          Featured venue (optional highlight)
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold text-dark">Happy hours</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSlots((current) => [...current, newEmptySlot()])}
          >
            <Plus className="size-4" />
            Add slot
          </Button>
        </div>

        <HappyHourPastePanel
          applyLabel="Apply to slots"
          onApply={(result, mode) => {
            if (result.slots.length === 0) {
              throw new Error(result.warnings[0] ?? 'Could not parse any happy hour slots.')
            }

            const nextSlots = parsedSlotsToFormState(result.slots)
            setSlots((current) => (mode === 'replace' ? nextSlots : [...current, ...nextSlots]))
            setError(null)
          }}
        />

        {venue.id ? (
          <HappyHourMenuPhotoPanel
            flow="manager"
            applyLabel="Apply to slots"
            appendModeLabel="Add more"
            saving={saving}
            parseMenuPhoto={(payload) =>
              parseHappyHourMenuPhotoAdmin({
                data: {
                  venueId: venue.id,
                  imageBase64: payload.imageBase64,
                  mediaType: payload.mediaType,
                },
              })
            }
            onApply={(result, mode) => {
              if (result.slots.length === 0) {
                throw new Error(result.warnings[0] ?? 'Could not parse any happy hour slots.')
              }
              const nextSlots = parsedSlotsToFormState(result.slots)
              setSlots((current) => (mode === 'replace' ? nextSlots : [...current, ...nextSlots]))
              setError(null)
            }}
          />
        ) : null}

        {mode === 'edit' && venue.id ? (
          <AdminMenuSubmissionsPanel venueId={venue.id} onApproved={reloadSlotsFromServer} />
        ) : null}

        <p className="text-xs text-muted-foreground">
          Paste updates the slots below. Approving a menu photo adds specials to existing slots
          immediately. Click Save venue at the bottom to persist other edits.
        </p>

        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No happy hour slots yet. Add at least one window with days and times.
          </p>
        ) : (
          <ul className="space-y-4">
            {slots.map((slot, slotIndex) => (
              <li
                key={slot.key}
                className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-dark">
                    Slot {slotIndex + 1}
                    {slot.days.length > 0 ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        · {formatHappyHourDayLabel(slot.days)}
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Duplicate slot"
                      onClick={() =>
                        setSlots((current) => {
                          const index = current.findIndex((row) => row.key === slot.key)
                          if (index === -1) {
                            return current
                          }
                          const copy = duplicateSlot(slot)
                          return [
                            ...current.slice(0, index + 1),
                            copy,
                            ...current.slice(index + 1),
                          ]
                        })
                      }
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-dark"
                    >
                      <Copy className="size-4 shrink-0" aria-hidden />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      aria-label="Remove slot"
                      onClick={() =>
                        setSlots((current) => current.filter((row) => row.key !== slot.key))
                      }
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-dark">Days</legend>
                  <div className="flex flex-wrap gap-2">
                    {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => {
                      const checked = slot.days.includes(day)
                      return (
                        <label
                          key={day}
                          className={cn(
                            'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm',
                            checked
                              ? 'border-primary/40 bg-primary/10 text-dark'
                              : 'border-border/70 bg-background text-muted-foreground',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSlots((current) =>
                                current.map((row) => {
                                  if (row.key !== slot.key) {
                                    return row
                                  }
                                  const days = checked
                                    ? row.days.filter((value) => value !== day)
                                    : [...row.days, day].sort((a, b) => a - b)
                                  return { ...row, days }
                                }),
                              )
                            }
                            className="size-4 rounded border-border"
                          />
                          {getDayName(day).slice(0, 3)}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-dark">Start</span>
                    <input
                      type="time"
                      required
                      value={slot.start_time}
                      onChange={(event) =>
                        setSlots((current) =>
                          current.map((row) =>
                            row.key === slot.key
                              ? { ...row, start_time: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-dark">End</span>
                    <input
                      type="time"
                      required
                      value={slot.end_time}
                      onChange={(event) =>
                        setSlots((current) =>
                          current.map((row) =>
                            row.key === slot.key
                              ? { ...row, end_time: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-dark">Deal summary (optional)</span>
                  <input
                    value={slot.deal_summary ?? ''}
                    onChange={(event) =>
                      setSlots((current) =>
                        current.map((row) =>
                          row.key === slot.key
                            ? { ...row, deal_summary: event.target.value || null }
                            : row,
                        ),
                      )
                    }
                    className={inputClassName}
                    placeholder="Short overview — use deal rows below for specifics"
                  />
                  {slot.deals.some((deal) => deal.label.trim()) ? (
                    <span className="text-xs text-muted-foreground">
                      Deal rows below are shown on the map; summary is only needed when there are no
                      line items.
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-dark">Slot status</span>
                    <select
                      value={slot.data_status}
                      onChange={(event) =>
                        setSlots((current) =>
                          current.map((row) =>
                            row.key === slot.key
                              ? {
                                  ...row,
                                  data_status: event.target
                                    .value as SlotFormState['data_status'],
                                }
                              : row,
                          ),
                        )
                      }
                      className={inputClassName}
                    >
                      <option value="pending_review">Pending review</option>
                      <option value="live">Live</option>
                      <option value="flagged">Flagged</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-dark">Confidence</span>
                    <select
                      value={slot.confidence ?? ''}
                      onChange={(event) =>
                        setSlots((current) =>
                          current.map((row) =>
                            row.key === slot.key
                              ? {
                                  ...row,
                                  confidence:
                                    event.target.value === ''
                                      ? null
                                      : (event.target.value as NonNullable<
                                          SlotFormState['confidence']
                                        >),
                                }
                              : row,
                          ),
                        )
                      }
                      className={inputClassName}
                    >
                      {SCRAPE_CONFIDENCE_ADMIN_OPTIONS.map((option) => (
                        <option key={option.value || 'unset'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-sm text-dark">
                    <input
                      type="checkbox"
                      checked={slot.is_active}
                      onChange={(event) =>
                        setSlots((current) =>
                          current.map((row) =>
                            row.key === slot.key
                              ? { ...row, is_active: event.target.checked }
                              : row,
                          ),
                        )
                      }
                      className="size-4 rounded border-border"
                    />
                    Active
                  </label>
                </div>

                {slot.source_urls.length > 0 ? (
                  <VenueSourceLinks
                    websiteUrl={null}
                    sourceUrls={slot.source_urls}
                    className="rounded-lg border border-border/60 bg-background/80 px-3 py-2"
                  />
                ) : null}

                <div className="space-y-2">
                  <span className="text-xs font-medium text-dark">Deals</span>
                  {slot.deals.map((deal, dealIndex) => (
                    <div
                      key={`${slot.key}-deal-${dealIndex}`}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                    >
                      <input
                        value={deal.label}
                        onChange={(event) =>
                          setSlots((current) =>
                            current.map((row) =>
                              row.key === slot.key
                                ? {
                                    ...row,
                                    deals: row.deals.map((d, index) =>
                                      index === dealIndex
                                        ? { ...d, label: event.target.value }
                                        : d,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                        placeholder="Deal label"
                        className={inputClassName}
                      />
                      <select
                        value={deal.category}
                        onChange={(event) =>
                          setSlots((current) =>
                            current.map((row) =>
                              row.key === slot.key
                                ? {
                                    ...row,
                                    deals: row.deals.map((d, index) =>
                                      index === dealIndex
                                        ? {
                                            ...d,
                                            category: event.target
                                              .value as typeof d.category,
                                          }
                                        : d,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                        className={inputClassName}
                      >
                        <option value="drinks">Drinks</option>
                        <option value="food">Food</option>
                        <option value="both">Both</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        value={deal.price_text ?? ''}
                        onChange={(event) =>
                          setSlots((current) =>
                            current.map((row) =>
                              row.key === slot.key
                                ? {
                                    ...row,
                                    deals: row.deals.map((d, index) =>
                                      index === dealIndex
                                        ? {
                                            ...d,
                                            price_text: event.target.value || null,
                                          }
                                        : d,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                        placeholder="Price text"
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        aria-label={`Remove deal ${dealIndex + 1}`}
                        onClick={() =>
                          setSlots((current) =>
                            current.map((row) =>
                              row.key === slot.key
                                ? {
                                    ...row,
                                    deals: row.deals.filter((_, index) => index !== dealIndex),
                                  }
                                : row,
                            ),
                          )
                        }
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      setSlots((current) =>
                        current.map((row) =>
                          row.key === slot.key
                            ? {
                                ...row,
                                deals: [
                                  ...row.deals,
                                  { label: '', category: 'drinks', price_text: null },
                                ],
                              }
                            : row,
                        ),
                      )
                    }
                  >
                    Add deal line
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mode === 'edit' && venue.id ? (
        <AdminVenueManagersSection venueId={venue.id} venueSlug={venue.slug} />
      ) : null}

      {mode === 'edit' && venue.id ? (
        <AdminVenueEventsSection
          venueId={venue.id}
          cityId={venue.city_id}
          cityTimezone={cityTimezone}
          initialEvents={initialEvents}
          onReload={onEventsReload ?? (async () => {})}
          draftEvent={pendingDraftEvent}
          onDraftConsumed={() => setPendingDraftEvent(null)}
        />
      ) : null}

      {mode === 'edit' && venue.id ? (
        <AdminEventSubmissionsPanel
          venueId={venue.id}
          onApprove={(submission) =>
            setPendingDraftEvent({
              key: submission.id,
              title: submission.title,
              description: submission.description ?? '',
              sourceUrl: null,
            })
          }
        />
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pb-8">
        <Button type="submit" disabled={saving} className="min-h-11 w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Saving…
            </>
          ) : venue.is_published ? (
            'Save & publish to map'
          ) : (
            'Save venue'
          )}
        </Button>
        <Link
          to="/admin/venues"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-dark hover:bg-muted"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

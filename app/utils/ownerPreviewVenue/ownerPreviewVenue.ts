import type { HappyHourSlotFormState } from '@/components/HappyHourSlotsEditor/HappyHourSlotsEditor.types'
import type { OwnerVenueDetail } from '@/server/ownerVenues'
import type { HappyHourSlotWithDeals, VenueDetail } from '@/types/venue'
import type { Database } from '@/types/database'
import {
  formatHappyHourWindow,
  getDayName,
  getDayOfWeekInTimezone,
  getDealSummaryForSlot,
  getVenueTimelinePlacement,
  resolveDisplayStatusBadgeLabel,
  type MapPinStatus,
  type VenueTimelinePlacement,
} from '@/utils/happyHour'
import { expandGroupedSlotsForSave } from '@/utils/happyHourEditorSlots'
import type { TimelineVenueEntry } from '@/hooks/useHappyHourTimeline'
import type { VenueOverlayStatus } from '@/utils/venueOverlayStatus'

const PREVIEW_TIMESTAMP = '2020-01-01T00:00:00.000Z'

function inferSlotCategories(
  deals: Array<{ category: Database['public']['Enums']['deal_category'] }>,
): Database['public']['Enums']['deal_category'][] {
  const categories = [...new Set(deals.map((deal) => deal.category))]
  return categories.length > 0 ? categories : ['other']
}

function toDbTimeValue(value: string): string {
  return value.length === 5 ? `${value}:00` : value
}

export function formSlotsToPreviewSlots(
  formSlots: HappyHourSlotFormState[],
  venueId: string,
): HappyHourSlotWithDeals[] {
  const grouped = formSlots
    .filter((slot) => slot.days.length > 0 && slot.start_time && slot.end_time)
    .map((slot) => {
      const dealRows = slot.deals.filter((deal) => deal.label.trim())
      return {
        days: slot.days,
        start_time: slot.start_time,
        end_time: slot.end_time,
        deal_summary: slot.deal_summary?.trim() || null,
        data_status: 'pending_review' as const,
        is_active: true,
        confidence: null,
        source_urls: [] as string[],
        deals: dealRows,
      }
    })

  return expandGroupedSlotsForSave(grouped).map((slot, index) => {
    const slotId = `preview-slot-${index}`
    const dealRows = slot.deals.filter((deal) => deal.label.trim())

    return {
      id: slotId,
      venue_id: venueId,
      day_of_week: slot.day_of_week,
      start_time: toDbTimeValue(slot.start_time),
      end_time: toDbTimeValue(slot.end_time),
      deal_summary: slot.deal_summary,
      categories: inferSlotCategories(dealRows),
      data_status: 'pending_review',
      is_active: true,
      confidence: null,
      source_urls: [],
      conflicts: null,
      last_scraped_at: null,
      created_at: PREVIEW_TIMESTAMP,
      updated_at: PREVIEW_TIMESTAMP,
      deals: dealRows.map((deal, dealIndex) => ({
        id: `preview-deal-${index}-${dealIndex}`,
        slot_id: slotId,
        label: deal.label,
        category: deal.category,
        price_text: deal.price_text,
        sort_order: dealIndex,
        created_at: PREVIEW_TIMESTAMP,
      })),
    }
  })
}

export function getOwnerPreviewListPlacement(
  slots: HappyHourSlotWithDeals[],
  now: Date,
  timeZone: string,
): VenueTimelinePlacement | null {
  const live = getVenueTimelinePlacement(slots, now, timeZone)
  if (live) {
    return live
  }

  const activeSlots = slots
    .filter((slot) => slot.is_active)
    .sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week
      }
      return a.start_time.localeCompare(b.start_time)
    })

  if (activeSlots.length === 0) {
    return null
  }

  const today = getDayOfWeekInTimezone(now, timeZone)
  const todaySlots = activeSlots.filter((slot) => slot.day_of_week === today)
  const focusSlot = todaySlots[0] ?? activeSlots[0]
  const hhWindow = formatHappyHourWindow(focusSlot)

  return {
    sectionId: 'owner_preview',
    sectionTitle: hhWindow,
    sectionSortKey: 0,
    focusSlot,
    badgeTone: 'scheduled',
    badgeLabel: getDayName(focusSlot.day_of_week),
    hhWindow,
    minutesUntilStart: null,
  }
}

function mapPinStatusFromPlacement(placement: VenueTimelinePlacement | null): MapPinStatus {
  if (!placement) {
    return 'none'
  }
  if (placement.badgeTone === 'open' || placement.sectionId === 'happening_now') {
    return 'happening_now'
  }
  if (placement.sectionId === 'starting_soon') {
    return 'starting_soon'
  }
  if (placement.sectionId === 'later_tonight') {
    return 'later_tonight'
  }
  return 'scheduled'
}

export function getOwnerPreviewOverlayStatus(
  venue: Pick<VenueDetail, 'happy_hour_slots' | 'city'>,
  now: Date,
): VenueOverlayStatus {
  const timeZone = venue.city.timezone
  const placement = getOwnerPreviewListPlacement(venue.happy_hour_slots, now, timeZone)
  const isLiveDay = true

  return {
    placement,
    pinStatus: mapPinStatusFromPlacement(placement),
    isLiveDay,
    statusBadgeLabel: resolveDisplayStatusBadgeLabel(placement?.badgeLabel, isLiveDay),
  }
}

export function buildOwnerPreviewTimelineEntry(
  venue: VenueDetail,
  now: Date,
): TimelineVenueEntry {
  const timeZone = venue.city.timezone
  const placement = getOwnerPreviewListPlacement(venue.happy_hour_slots, now, timeZone)

  return {
    venue,
    distanceLabel: '—',
    hhWindow: placement?.hhWindow ?? '',
    dealSummary: placement?.focusSlot
      ? getDealSummaryForSlot(venue.happy_hour_slots, placement.focusSlot)
      : '',
    badgeTone: placement?.badgeTone ?? 'scheduled',
    badgeLabel: placement?.badgeLabel ?? '',
    emphasis: placement?.sectionId === 'happening_now',
  }
}

export function buildOwnerPreviewVenue(
  venue: OwnerVenueDetail,
  formSlots: HappyHourSlotFormState[],
): VenueDetail {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    address_line1: venue.address_line1,
    phone: venue.phone,
    website_url: venue.website_url,
    description: venue.description,
    image_url: venue.image_url,
    price_level: venue.price_level,
    lat: venue.lat,
    lng: venue.lng,
    city_id: '',
    is_published: false,
    is_featured: false,
    data_status: 'pending_review',
    venue_type: venue.venue_type,
    created_at: PREVIEW_TIMESTAMP,
    updated_at: PREVIEW_TIMESTAMP,
    city: {
      slug: venue.city_slug,
      name: venue.city_name,
      timezone: venue.city_timezone,
    },
    happy_hour_slots: formSlotsToPreviewSlots(formSlots, venue.id),
  }
}

import type { HappyHourSlot, ScrapeConfidence, VenueDetail } from '@/types/venue'
import { collectUniqueUrls } from '@/utils/urlDisplay'

const CONFIDENCE_RANK: Record<ScrapeConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
}

export type TrustFreshnessKind = 'verified' | 'updated' | 'community'

export interface VenueTrustMeta {
  freshnessDate: Date | null
  freshnessKind: TrustFreshnessKind | null
  confidence: ScrapeConfidence | null
  sourceCount: number
  isCommunityVerified: boolean
}

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function maxDate(dates: Array<Date | null>): Date | null {
  const valid = dates.filter((date): date is Date => date != null)
  if (valid.length === 0) {
    return null
  }
  return valid.reduce((latest, date) => (date > latest ? date : latest))
}

function rollupConfidence(slots: HappyHourSlot[]): ScrapeConfidence | null {
  let lowest: ScrapeConfidence | null = null
  let lowestRank = Number.POSITIVE_INFINITY

  for (const slot of slots) {
    if (!slot.confidence) {
      continue
    }
    const rank = CONFIDENCE_RANK[slot.confidence]
    if (rank < lowestRank) {
      lowestRank = rank
      lowest = slot.confidence
    }
  }

  return lowest
}

function getLiveSlots(venue: VenueDetail): HappyHourSlot[] {
  return venue.happy_hour_slots.filter(
    (slot) => slot.is_active && slot.data_status === 'live',
  )
}

function getRelevantSlots(
  venue: VenueDetail,
  focusSlot?: Pick<HappyHourSlot, 'id'> | null,
): HappyHourSlot[] {
  const liveSlots = getLiveSlots(venue)
  if (!focusSlot) {
    return liveSlots
  }

  const matched = liveSlots.find((slot) => slot.id === focusSlot.id)
  return matched ? [matched] : liveSlots
}

function resolveFreshness(
  venue: VenueDetail,
  relevantSlots: HappyHourSlot[],
): Pick<VenueTrustMeta, 'freshnessDate' | 'freshnessKind' | 'isCommunityVerified'> {
  const isCommunityVerified = parseTimestamp(venue.community_verified_at) != null

  const staffVerified = parseTimestamp(venue.last_verified_at)
  if (staffVerified) {
    return { freshnessDate: staffVerified, freshnessKind: 'verified', isCommunityVerified }
  }

  const communityVerified = parseTimestamp(venue.community_verified_at)
  if (communityVerified) {
    return {
      freshnessDate: communityVerified,
      freshnessKind: 'community',
      isCommunityVerified: true,
    }
  }

  const scraped = maxDate([
    parseTimestamp(venue.last_scraped_at),
    ...relevantSlots.map((slot) => parseTimestamp(slot.last_scraped_at)),
  ])

  return scraped
    ? { freshnessDate: scraped, freshnessKind: 'updated', isCommunityVerified: false }
    : { freshnessDate: null, freshnessKind: null, isCommunityVerified: false }
}

function countSourceUrls(
  slots: HappyHourSlot[],
  websiteUrl: string | null | undefined,
): number {
  const urls = collectUniqueUrls(slots.flatMap((slot) => slot.source_urls ?? []))
  const website = websiteUrl?.trim()
  if (!website) {
    return urls.length
  }
  return urls.filter((url) => url !== website).length
}

function formatTrustDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatTrustFreshnessLabel(
  kind: TrustFreshnessKind,
  date: Date,
): string {
  const formatted = formatTrustDate(date)
  if (kind === 'verified') {
    return `Last verified ${formatted}`
  }
  if (kind === 'community') {
    return `Community verified ${formatted}`
  }
  return `Last updated ${formatted}`
}

/** @deprecated Use formatTrustFreshnessLabel */
export function formatLastUpdatedLabel(date: Date): string {
  return formatTrustFreshnessLabel('updated', date)
}

export function formatSourceCountLabel(count: number): string {
  return count === 1 ? '1 source' : `${count} sources`
}

export function getConfidenceBadgeLabel(confidence: ScrapeConfidence | null): string {
  if (confidence === 'high') {
    return 'High confidence'
  }
  if (confidence === 'medium') {
    return 'Medium confidence'
  }
  return 'Unverified — check with venue'
}

export function isUnverifiedConfidence(confidence: ScrapeConfidence | null): boolean {
  return confidence !== 'high' && confidence !== 'medium'
}

export function shouldShowVenueTrustFooter(
  meta: VenueTrustMeta,
  options: { showSourceCount?: boolean; showConfidenceBadge?: boolean } = {},
): boolean {
  const showSourceCount = options.showSourceCount !== false
  const showConfidenceBadge = options.showConfidenceBadge !== false

  return (
    meta.freshnessDate != null ||
    (showSourceCount && meta.sourceCount > 0) ||
    (showConfidenceBadge && meta.confidence != null) ||
    meta.isCommunityVerified
  )
}

export const SCRAPE_CONFIDENCE_ADMIN_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'high', label: 'High confidence' },
  { value: 'medium', label: 'Medium confidence' },
  { value: 'low', label: 'Low confidence' },
] as const

export function rollupSlotConfidence(
  slots: Array<Pick<HappyHourSlot, 'confidence'>>,
): ScrapeConfidence | null {
  return rollupConfidence(slots as HappyHourSlot[])
}

export function getVenueTrustMeta(
  venue: VenueDetail,
  focusSlot?: Pick<HappyHourSlot, 'id'> | null,
): VenueTrustMeta {
  const relevantSlots = getRelevantSlots(venue, focusSlot)
  const focusMatch =
    focusSlot != null ? relevantSlots.find((slot) => slot.id === focusSlot.id) : null

  return {
    ...resolveFreshness(venue, relevantSlots),
    confidence: focusMatch ? focusMatch.confidence : rollupConfidence(relevantSlots),
    sourceCount: countSourceUrls(relevantSlots, venue.website_url),
  }
}

export interface EventTrustSource {
  confidence: ScrapeConfidence | null
  source_urls: string[] | null
  last_scraped_at: string | null
  last_verified_at: string | null
  venue: {
    website_url: string | null
    last_verified_at: string | null
    community_verified_at: string | null
    last_scraped_at: string | null
  }
}

function countEventSourceUrls(
  sourceUrls: string[] | null | undefined,
  websiteUrl: string | null | undefined,
): number {
  const urls = collectUniqueUrls(sourceUrls ?? [])
  const website = websiteUrl?.trim()
  if (!website) {
    return urls.length
  }
  return urls.filter((url) => url !== website).length
}

function resolveEventFreshness(
  event: EventTrustSource,
): Pick<VenueTrustMeta, 'freshnessDate' | 'freshnessKind' | 'isCommunityVerified'> {
  const isCommunityVerified = parseTimestamp(event.venue.community_verified_at) != null

  const staffVerified =
    parseTimestamp(event.last_verified_at) ?? parseTimestamp(event.venue.last_verified_at)
  if (staffVerified) {
    return { freshnessDate: staffVerified, freshnessKind: 'verified', isCommunityVerified }
  }

  const communityVerified = parseTimestamp(event.venue.community_verified_at)
  if (communityVerified) {
    return {
      freshnessDate: communityVerified,
      freshnessKind: 'community',
      isCommunityVerified: true,
    }
  }

  const scraped =
    parseTimestamp(event.last_scraped_at) ?? parseTimestamp(event.venue.last_scraped_at)

  return scraped
    ? { freshnessDate: scraped, freshnessKind: 'updated', isCommunityVerified: false }
    : { freshnessDate: null, freshnessKind: null, isCommunityVerified: false }
}

function resolveEventConfidence(event: EventTrustSource): ScrapeConfidence | null {
  if (event.confidence) {
    return event.confidence
  }
  if (event.last_verified_at) {
    return 'high'
  }
  return null
}

export function getEventTrustMeta(event: EventTrustSource): VenueTrustMeta {
  return {
    ...resolveEventFreshness(event),
    confidence: resolveEventConfidence(event),
    sourceCount: countEventSourceUrls(event.source_urls, event.venue.website_url),
  }
}

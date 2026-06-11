import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import { getAnthropicApiKey, getAnthropicHappyHourModel } from '@/lib/scrape/anthropicConfig'
import { fetchPageText, fetchPageTextWithSubPages } from '@/lib/scrape/fetchPageText'
import { fetchGooglePlacePhoto, getGooglePlaceById } from '@/lib/scrape/googlePlaces'
import { parseEventsFromPageText } from '@/lib/scrape/parseEventsWithAnthropic'
import { parseHappyHourPasteSmart } from '@/lib/scrape/parseHappyHourWithAnthropic'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { uploadVenueImageToStorage } from '@/lib/venueImageStorage'
import { mapGooglePriceLevel } from '@/utils/googlePriceLevel'
import { isMenuPhotoMediaType } from '@/utils/menuPhotoFile'
import type { ParsedEvent } from '@/lib/scrape/parseEventsWithAnthropic'
import type { ParsedHappyHourSlot } from '@/utils/parseHappyHourPaste'
import type { Database } from '@/types/database'
import { ScrapeApiError } from '@/lib/scrape/errors'
import { logger } from '@/utils/logger'

type VenueUpdate = Database['public']['Tables']['venues']['Update']

type VenueType = Database['public']['Enums']['venue_type']
type VenueVibe = Database['public']['Enums']['venue_vibe']
type PriceLevel = Database['public']['Enums']['venue_price_level']

export type RescrubSource = 'website' | 'google'

export interface ScrubVenueInfoResult {
  venueId: string
  source: RescrubSource
  fieldsUpdated: string[]
}

export interface ScrubVenueHappyHoursResult {
  slots: ParsedHappyHourSlot[]
  warnings: string[]
  source: RescrubSource
}

export interface ScrubVenueEventsResult {
  events: ParsedEvent[]
  warnings: string[]
}

export interface ScrubVenueAllResult {
  venueInfo: ScrubVenueInfoResult
  slots: ParsedHappyHourSlot[]
  slotWarnings: string[]
  events: ParsedEvent[]
  eventWarnings: string[]
}

interface VenueInfoAiResponse {
  description: string | null
  venue_types: VenueType[]
  price_level: PriceLevel | null
  vibes: VenueVibe[]
  hours_of_operation: Array<{ day: number; open: string; close: string }> | null
}

const VALID_VENUE_TYPES: VenueType[] = [
  'bar', 'brewery', 'taproom', 'restaurant', 'gastropub',
  'wine_bar', 'cocktail_bar', 'sports_bar', 'pub', 'distillery',
]

const VALID_VIBES: VenueVibe[] = [
  'upscale', 'rooftop', 'patio', 'sports_viewing',
  'group_friendly', 'family_friendly', 'dog_friendly',
]

const VALID_PRICE_LEVELS: PriceLevel[] = ['$', '$$', '$$$']

function toAuthError(error: unknown): Error {
  if (error instanceof AdminAuthError) return error
  return error instanceof Error ? error : new Error('Unexpected error')
}

const VENUE_INFO_SYSTEM_PROMPT = `You extract structured venue metadata from a bar or restaurant website.

Return ONLY valid JSON (no markdown) with this shape:
{
  "description": "One sentence max, 150 characters or fewer. Capture the vibe and concept only. No em dashes. Null if not enough info.",
  "venue_types": ["bar"],
  "price_level": "$$",
  "vibes": ["patio", "dog_friendly"],
  "hours_of_operation": [
    { "day": 1, "open": "11:00", "close": "22:00" }
  ]
}

Rules:
- venue_types: array of zero or more from: bar, brewery, taproom, restaurant, gastropub, wine_bar, cocktail_bar, sports_bar, pub, distillery
- price_level: one of "$", "$$", "$$$", or null if unknown
- vibes: array of zero or more from: upscale, rooftop, patio, sports_viewing, group_friendly, family_friendly, dog_friendly
- hours_of_operation: array of { day: 0=Sun..6=Sat, open: "HH:MM", close: "HH:MM" }. Use 24-hour time. Null if not found.
- description: 1-2 sentences only. Null if not enough info.
- Return empty arrays [] when nothing applies — never omit a key.`

async function parseVenueInfoFromText(pageText: string): Promise<VenueInfoAiResponse> {
  const apiKey = getAnthropicApiKey()
  const model = getAnthropicHappyHourModel()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: VENUE_INFO_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract venue metadata from this website text:\n\n${pageText.slice(0, 15000)}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new ScrapeApiError(
      `Anthropic venue info parse failed (${response.status}): ${detail.slice(0, 300)}`,
      { code: 'api_error', provider: 'anthropic', statusCode: response.status },
    )
  }

  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> }
  const textBlock = data.content?.find((b) => b.type === 'text')
  if (!textBlock?.text) {
    throw new ScrapeApiError('No text response from Anthropic.', {
      code: 'parse_error',
      provider: 'anthropic',
    })
  }

  const raw = textBlock.text.trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new ScrapeApiError('AI response did not include JSON.', {
      code: 'parse_error',
      provider: 'anthropic',
    })
  }

  const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<VenueInfoAiResponse>

  return {
    description: typeof parsed.description === 'string' ? parsed.description.trim() || null : null,
    venue_types: Array.isArray(parsed.venue_types)
      ? parsed.venue_types.filter((t): t is VenueType => VALID_VENUE_TYPES.includes(t as VenueType))
      : [],
    price_level: VALID_PRICE_LEVELS.includes(parsed.price_level as PriceLevel)
      ? (parsed.price_level as PriceLevel)
      : null,
    vibes: Array.isArray(parsed.vibes)
      ? parsed.vibes.filter((v): v is VenueVibe => VALID_VIBES.includes(v as VenueVibe))
      : [],
    hours_of_operation: Array.isArray(parsed.hours_of_operation)
      ? parsed.hours_of_operation.filter(
          (h) =>
            typeof h === 'object' &&
            h !== null &&
            typeof h.day === 'number' &&
            h.day >= 0 &&
            h.day <= 6 &&
            typeof h.open === 'string' &&
            typeof h.close === 'string',
        )
      : null,
  }
}

async function applyVenueInfoToDb(
  venueId: string,
  info: VenueInfoAiResponse,
  hasExistingHours: boolean,
): Promise<string[]> {
  const supabase = createSupabaseServiceClient()
  const fieldsUpdated: string[] = []

  const patch: VenueUpdate & { hours_of_operation?: unknown } = {
    last_scraped_at: new Date().toISOString(),
  }

  if (info.description !== null) {
    patch.description = info.description
    fieldsUpdated.push('description')
  }
  if (info.venue_types.length > 0) {
    patch.venue_types = info.venue_types
    fieldsUpdated.push('venue_types')
  }
  if (info.price_level !== null) {
    patch.price_level = info.price_level
    fieldsUpdated.push('price_level')
  }
  if (info.vibes.length > 0) {
    patch.vibes = info.vibes
    fieldsUpdated.push('vibes')
  }
  if (info.hours_of_operation !== null && !hasExistingHours) {
    patch.hours_of_operation = info.hours_of_operation
    fieldsUpdated.push('hours_of_operation')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('venues').update(patch as any).eq('id', venueId)
  if (error) throw error

  return fieldsUpdated
}

function isUploadedVenueCoverPhoto(imageUrl: string | null): boolean {
  return imageUrl !== null && imageUrl.includes('/storage/v1/object/public/venue-images/')
}

async function getVenueForScrub(venueId: string) {
  const supabase = createSupabaseServiceClient()
  const { data: venue, error } = await supabase
    .from('venues')
    .select('id, website_url, place_id, image_url, hours_of_operation')
    .eq('id', venueId)
    .single()

  if (error || !venue) {
    throw error ?? new Error('Venue not found.')
  }
  return venue
}

async function fetchVenueImageFromGooglePlace(
  venueId: string,
  photoResourceNames: string[],
): Promise<string | null> {
  for (const photoResourceName of photoResourceNames) {
    const photo = await fetchGooglePlacePhoto(photoResourceName)
    if (!photo || !isMenuPhotoMediaType(photo.mediaType)) {
      continue
    }

    try {
      const supabase = createSupabaseServiceClient()
      return await uploadVenueImageToStorage(supabase, {
        venueId,
        imageBase64: photo.imageBase64,
        mediaType: photo.mediaType,
      })
    } catch (error) {
      logger.error('Failed to upload venue image from Google Places', error, { venueId })
    }
  }

  return null
}

export const scrubVenueInfo = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ScrubVenueInfoResult> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const venue = await getVenueForScrub(data.venueId)

    if (venue.website_url) {
      const pageText = await fetchPageTextWithSubPages(venue.website_url)
      const info = await parseVenueInfoFromText(pageText)
      const hasExistingHours = Array.isArray(venue.hours_of_operation) && venue.hours_of_operation.length > 0
      const fieldsUpdated = await applyVenueInfoToDb(data.venueId, info, hasExistingHours)

      if (!isUploadedVenueCoverPhoto(venue.image_url) && venue.place_id) {
        const place = await getGooglePlaceById(venue.place_id)
        if (place && place.photoResourceNames.length > 0) {
          const imageUrl = await fetchVenueImageFromGooglePlace(
            data.venueId,
            place.photoResourceNames,
          )
          if (imageUrl) {
            const supabase = createSupabaseServiceClient()
            const { error } = await supabase
              .from('venues')
              .update({ image_url: imageUrl })
              .eq('id', data.venueId)
            if (error) throw error
            fieldsUpdated.push('image_url')
          }
        }
      }

      return { venueId: data.venueId, source: 'website', fieldsUpdated }
    }

    if (venue.place_id) {
      logger.info('No website for venue, falling back to Google', { venueId: data.venueId })
      const place = await getGooglePlaceById(venue.place_id)
      if (!place) {
        throw new Error('No website set and Google Place not found.')
      }

      const supabase = createSupabaseServiceClient()
      const fieldsUpdated: string[] = []
      const patch: VenueUpdate = { last_scraped_at: new Date().toISOString() }

      if (place.name) { patch.name = place.name; fieldsUpdated.push('name') }
      if (place.formattedAddress) { patch.address_line1 = place.formattedAddress; fieldsUpdated.push('address_line1') }
      if (place.phone) { patch.phone = place.phone; fieldsUpdated.push('phone') }
      if (place.websiteUrl) { patch.website_url = place.websiteUrl; fieldsUpdated.push('website_url') }
      if (place.lat && place.lng) { patch.lat = place.lat; patch.lng = place.lng; fieldsUpdated.push('lat', 'lng') }
      if (place.googlePriceLevel !== null) {
        patch.price_level = mapGooglePriceLevel(place.googlePriceLevel)
        fieldsUpdated.push('price_level')
      }

      if (!isUploadedVenueCoverPhoto(venue.image_url) && place.photoResourceNames.length > 0) {
        const imageUrl = await fetchVenueImageFromGooglePlace(
          data.venueId,
          place.photoResourceNames,
        )
        if (imageUrl) {
          patch.image_url = imageUrl
          fieldsUpdated.push('image_url')
        }
      }

      const { error } = await supabase.from('venues').update(patch).eq('id', data.venueId)
      if (error) throw error

      return { venueId: data.venueId, source: 'google', fieldsUpdated }
    }

    throw new Error('No website URL or Google Place ID set on this venue.')
  })

export const scrubVenueHappyHours = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ScrubVenueHappyHoursResult> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const venue = await getVenueForScrub(data.venueId)

    if (!venue.website_url) {
      throw new Error('No website URL set on this venue. Add a website first.')
    }

    const pageText = await fetchPageText(venue.website_url)
    const result = await parseHappyHourPasteSmart(pageText)

    return { slots: result.slots, warnings: result.warnings, source: 'website' }
  })

export const scrubVenueEvents = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ScrubVenueEventsResult> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const venue = await getVenueForScrub(data.venueId)

    if (!venue.website_url) {
      throw new Error('No website URL set on this venue. Add a website first.')
    }

    const pageText = await fetchPageText(venue.website_url)
    const result = await parseEventsFromPageText(pageText)

    return { events: result.events, warnings: result.warnings }
  })

export const scrubVenueAll = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ScrubVenueAllResult> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const venue = await getVenueForScrub(data.venueId)

    if (!venue.website_url && !venue.place_id) {
      throw new Error('No website URL or Google Place ID set on this venue.')
    }

    const venueInfo = await scrubVenueInfo({ data: { venueId: data.venueId } })

    let slots: ParsedHappyHourSlot[] = []
    let slotWarnings: string[] = []
    let events: ParsedEvent[] = []
    let eventWarnings: string[] = []

    if (venue.website_url) {
      const pageText = await fetchPageText(venue.website_url)

      const [hhResult, eventsResult] = await Promise.all([
        parseHappyHourPasteSmart(pageText),
        parseEventsFromPageText(pageText),
      ])

      slots = hhResult.slots
      slotWarnings = hhResult.warnings
      events = eventsResult.events
      eventWarnings = eventsResult.warnings
    }

    return { venueInfo, slots, slotWarnings, events, eventWarnings }
  })

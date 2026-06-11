import { findGooglePlaceByText } from '@/lib/scrape/googlePlaces'
import { saveDiscoveredVenue } from '@/lib/scrape/saveDiscoveredVenue'
import { scrubVenueInfo } from '@/server/adminVenueRescrub'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { logger } from '@/utils/logger'

export interface DiscoverVenueRow {
  inputName: string
  venueId: string | null
  venueName: string | null
  status: 'created' | 'updated' | 'skipped' | 'not_found' | 'error'
  message: string
}

export interface DiscoverVenuesFromNamesResult {
  results: DiscoverVenueRow[]
  created: number
  updated: number
  skipped: number
  notFound: number
  failed: number
}

function parseVenueNames(raw: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || seen.has(trimmed.toLowerCase())) {
      continue
    }
    seen.add(trimmed.toLowerCase())
    names.push(trimmed)
  }

  return names
}

export async function discoverVenuesFromNames(input: {
  citySlug: string
  namesText: string
}): Promise<DiscoverVenuesFromNamesResult> {
  const names = parseVenueNames(input.namesText)
  if (names.length === 0) {
    throw new Error('Paste at least one restaurant or bar name (one per line).')
  }

  const supabase = createSupabaseServiceClient()
  const { data: city, error: cityError } = await supabase
    .from('cities')
    .select('id, slug, name, state, center_lat, center_lng')
    .eq('slug', input.citySlug)
    .eq('is_active', true)
    .single()

  if (cityError || !city) {
    throw new Error(`Unknown or inactive city slug: ${input.citySlug}`)
  }

  const results: DiscoverVenueRow[] = []
  let created = 0
  let updated = 0
  let skipped = 0
  let notFound = 0
  let failed = 0

  for (const inputName of names) {
    try {
      const textQuery = `${inputName}, ${city.name}, ${city.state}`
      const place = await findGooglePlaceByText({
        textQuery,
        latitude: city.center_lat,
        longitude: city.center_lng,
      })

      if (!place) {
        notFound += 1
        results.push({
          inputName,
          venueId: null,
          venueName: null,
          status: 'not_found',
          message: 'Google Places returned no match',
        })
        continue
      }

      const { data: existing } = await supabase
        .from('venues')
        .select('id, data_status, archived_at')
        .eq('place_id', place.placeId)
        .maybeSingle()

      if (existing?.archived_at) {
        skipped += 1
        results.push({
          inputName,
          venueId: existing.id,
          venueName: place.name,
          status: 'skipped',
          message: 'Venue is archived — restore it from the Archived tab to update',
        })
        continue
      }

      if (
        existing &&
        existing.data_status !== 'discovered' &&
        existing.data_status !== 'pending_review' &&
        existing.data_status !== 'no_happy_hour_found'
      ) {
        skipped += 1
        results.push({
          inputName,
          venueId: existing.id,
          venueName: place.name,
          status: 'skipped',
          message: `Already in database (${existing.data_status})`,
        })
        continue
      }

      const saved = await saveDiscoveredVenue(supabase, {
        cityId: city.id,
        place,
        existingVenueId: existing?.id,
      })

      if (saved.created) {
        created += 1
      } else {
        updated += 1
      }

      if (saved.created) {
        try {
          await scrubVenueInfo({ data: { venueId: saved.venueId } })
        } catch (error) {
          logger.error('Initial venue info scrub failed', { inputName, error })
        }
      }

      results.push({
        inputName,
        venueId: saved.venueId,
        venueName: place.name,
        status: saved.created ? 'created' : 'updated',
        message: saved.created
          ? 'Added from Google Places'
          : 'Refreshed Google metadata',
      })
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : 'Discover failed'
      logger.error('Discover venue failed', { inputName, error })
      results.push({
        inputName,
        venueId: null,
        venueName: null,
        status: 'error',
        message,
      })
    }
  }

  return { results, created, updated, skipped, notFound, failed }
}

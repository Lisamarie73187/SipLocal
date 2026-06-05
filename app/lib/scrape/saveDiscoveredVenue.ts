import type { SupabaseClient } from '@supabase/supabase-js'

import type { GooglePlaceVenue } from '@/lib/scrape/googlePlaces'
import { mapGooglePriceLevel } from '@/utils/googlePriceLevel'
import type { Database } from '@/types/database'
import { slugifyVenueName } from '@/utils/slug'

async function resolveUniqueSlug(
  supabase: SupabaseClient<Database>,
  cityId: string,
  baseSlug: string,
  excludeVenueId?: string,
): Promise<string> {
  let candidate = baseSlug
  let suffix = 2

  while (true) {
    let query = supabase
      .from('venues')
      .select('id')
      .eq('city_id', cityId)
      .eq('slug', candidate)

    if (excludeVenueId) {
      query = query.neq('id', excludeVenueId)
    }

    const { data } = await query.maybeSingle()
    if (!data) {
      return candidate
    }

    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

function extractPostalCode(formattedAddress: string): string | null {
  const match = /\b(\d{5})(?:-\d{4})?\b/.exec(formattedAddress)
  return match?.[1] ?? null
}

export interface SaveDiscoveredVenueInput {
  cityId: string
  place: GooglePlaceVenue
  existingVenueId?: string
}

export interface SaveDiscoveredVenueResult {
  venueId: string
  slug: string
  created: boolean
}

export async function saveDiscoveredVenue(
  supabase: SupabaseClient<Database>,
  input: SaveDiscoveredVenueInput,
): Promise<SaveDiscoveredVenueResult> {
  const baseSlug = slugifyVenueName(input.place.name)
  const venuePayload = {
    city_id: input.cityId,
    name: input.place.name,
    address_line1: input.place.formattedAddress,
    postal_code: extractPostalCode(input.place.formattedAddress),
    phone: input.place.phone,
    website_url: input.place.websiteUrl,
    lat: input.place.lat,
    lng: input.place.lng,
    place_id: input.place.placeId,
    price_level: mapGooglePriceLevel(input.place.googlePriceLevel),
    is_published: false,
    data_status: 'discovered' as const,
    description: null,
  }

  if (input.existingVenueId) {
    const slug = await resolveUniqueSlug(
      supabase,
      input.cityId,
      baseSlug,
      input.existingVenueId,
    )
    const { error } = await supabase
      .from('venues')
      .update({ ...venuePayload, slug })
      .eq('id', input.existingVenueId)

    if (error) {
      throw error
    }

    return { venueId: input.existingVenueId, slug, created: false }
  }

  const slug = await resolveUniqueSlug(supabase, input.cityId, baseSlug)
  const { data: venue, error } = await supabase
    .from('venues')
    .insert({ ...venuePayload, slug })
    .select('id')
    .single()

  if (error || !venue) {
    throw error ?? new Error('Failed to insert discovered venue')
  }

  return { venueId: venue.id, slug, created: true }
}

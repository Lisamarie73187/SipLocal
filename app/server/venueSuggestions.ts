import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import {
  lookupVenueSuggestionPlace,
  resolveGooglePlaceForSuggestion,
  type VenueSuggestionLookupResult,
} from '@/lib/scrape/lookupVenueSuggestion'
import { saveDiscoveredVenue } from '@/lib/scrape/saveDiscoveredVenue'
import {
  createSignedMenuPhotoUrl,
  deleteMenuPhotoFromStorage,
  uploadVenueSuggestionPhotoToStorage,
} from '@/lib/menuPhotoStorage'
import { OwnerAuthError, requireAuthenticatedUser } from '@/lib/ownerAuth.server'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { parseHappyHourFromMenuImage } from '@/lib/scrape/parseHappyHourWithAnthropic'
import { applyParsedHappyHourSlotsToVenue } from '@/server/menuPhotoSubmissions'
import type { Database } from '@/types/database'
import { validateMenuPhotoPayload, type MenuPhotoMediaType, mediaTypeFromStoragePath } from '@/utils/menuPhotoFile'
import {
  submitterLocationDbFields,
  submitterLocationInputSchema,
} from '@/utils/submitterLocation'
import type { ParseHappyHourPasteResult, ParsedHappyHourSlot } from '@/utils/parseHappyHourPaste'

const venueSuggestionInputSchema = z.object({
  citySlug: z.string().min(1),
  venueName: z.string().trim().min(2).max(200),
  imageBase64: z.string().min(1),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  submitterLocation: submitterLocationInputSchema.optional(),
})

export interface AdminVenueSuggestionItem {
  id: string
  venue_name: string
  user_id: string
  user_email: string | null
  status: Database['public']['Enums']['menu_submission_status']
  photo_url: string
  parsed_slots: ParseHappyHourPasteResult | null
  submitter_lat: number | null
  submitter_lng: number | null
  created_at: string
}

function toOwnerError(error: unknown): Error {
  if (error instanceof OwnerAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

function toAdminError(error: unknown): Error {
  if (error instanceof AdminAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

function parseStoredParsedSlots(value: unknown): ParseHappyHourPasteResult | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as { slots?: ParsedHappyHourSlot[]; warnings?: string[] }
  if (!Array.isArray(record.slots)) {
    return null
  }

  return {
    slots: record.slots,
    warnings: record.warnings ?? [],
    unparsedBlocks: [],
  }
}

async function resolveCityId(citySlug: string): Promise<string> {
  const supabase = createSupabaseServiceClient()
  const { data: city, error } = await supabase
    .from('cities')
    .select('id')
    .eq('slug', citySlug)
    .eq('is_active', true)
    .single()

  if (error || !city) {
    throw error ?? new Error('City not found.')
  }

  return city.id
}

export const submitVenueSuggestion = createServerFn({ method: 'POST' })
  .inputValidator(venueSuggestionInputSchema)
  .handler(async ({ data }): Promise<{ submissionId: string; message: string }> => {
    try {
      const { userId } = await requireAuthenticatedUser()
      validateMenuPhotoPayload({
        imageBase64: data.imageBase64,
        mediaType: data.mediaType,
      })

      const cityId = await resolveCityId(data.citySlug)
      const supabase = createSupabaseServiceClient()
      const submissionId = crypto.randomUUID()

      const storagePath = await uploadVenueSuggestionPhotoToStorage(supabase, {
        cityId,
        submissionId,
        imageBase64: data.imageBase64,
        mediaType: data.mediaType as MenuPhotoMediaType,
      })

      const { error } = await supabase.from('venue_suggestions').insert({
        id: submissionId,
        user_id: userId,
        city_id: cityId,
        venue_name: data.venueName.trim(),
        storage_path: storagePath,
        status: 'pending_review',
        parsed_slots: null,
        ...submitterLocationDbFields(data.submitterLocation),
      })

      if (error) {
        throw error
      }

      return {
        submissionId,
        message:
          "Thanks! Nice find! You've helped fellow sippers discover a new happy hour.",
      }
    } catch (error) {
      throw toOwnerError(error)
    }
  })

export const listPendingVenueSuggestions = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      citySlug: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
  )
  .handler(async ({ data }): Promise<AdminVenueSuggestionItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()
    const limit = data.limit ?? 20

    let query = supabase
      .from('venue_suggestions')
      .select(
        'id, venue_name, user_id, status, storage_path, parsed_slots, submitter_lat, submitter_lng, created_at, city_id',
      )
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (data.citySlug) {
      const cityId = await resolveCityId(data.citySlug)
      query = query.eq('city_id', cityId)
    }

    const { data: rows, error } = await query

    if (error) {
      throw error
    }

    const items: AdminVenueSuggestionItem[] = []

    for (const row of rows ?? []) {
      const { data: userData } = await supabase.auth.admin.getUserById(row.user_id)
      const photoUrl = await createSignedMenuPhotoUrl(supabase, row.storage_path)
      items.push({
        id: row.id,
        venue_name: row.venue_name,
        user_id: row.user_id,
        user_email: userData.user?.email ?? null,
        status: row.status,
        photo_url: photoUrl,
        parsed_slots: parseStoredParsedSlots(row.parsed_slots),
        submitter_lat: row.submitter_lat,
        submitter_lng: row.submitter_lng,
        created_at: row.created_at,
      })
    }

    return items
  })

export const rejectVenueSuggestion = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ submissionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ message: string }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: suggestion, error: loadError } = await supabase
      .from('venue_suggestions')
      .select('id, storage_path')
      .eq('id', data.submissionId)
      .eq('status', 'pending_review')
      .single()

    if (loadError || !suggestion) {
      throw loadError ?? new Error('Suggestion not found or already reviewed.')
    }

    await deleteMenuPhotoFromStorage(supabase, suggestion.storage_path)

    const { error: deleteError } = await supabase
      .from('venue_suggestions')
      .delete()
      .eq('id', suggestion.id)

    if (deleteError) {
      throw deleteError
    }

    return { message: 'Venue suggestion dismissed and removed.' }
  })

export const lookupVenueSuggestion = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      submissionId: z.string().uuid(),
      citySlug: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<VenueSuggestionLookupResult> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { data: suggestion, error } = await supabase
      .from('venue_suggestions')
      .select('venue_name, submitter_lat, submitter_lng, status')
      .eq('id', data.submissionId)
      .single()

    if (error || !suggestion) {
      throw error ?? new Error('Suggestion not found.')
    }

    if (suggestion.status !== 'pending_review') {
      throw new Error('This suggestion was already reviewed.')
    }

    return lookupVenueSuggestionPlace({
      venueName: suggestion.venue_name,
      citySlug: data.citySlug,
      submitterLat: suggestion.submitter_lat,
      submitterLng: suggestion.submitter_lng,
    })
  })

export const approveVenueSuggestion = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      submissionId: z.string().uuid(),
      action: z.enum(['create_from_place', 'update_existing']),
      googlePlaceId: z.string().min(1).optional(),
      venueId: z.string().uuid().optional(),
      mode: z.enum(['append', 'replace']).optional().default('append'),
    }),
  )
  .handler(async ({ data }): Promise<{ venueId: string; message: string }> => {
    let adminId: string
    try {
      ;({ userId: adminId } = await requireAdmin())
    } catch (error) {
      throw toAdminError(error)
    }

    if (data.action === 'create_from_place' && !data.googlePlaceId) {
      throw new Error('Pick a Google Places match to add a new venue.')
    }

    if (data.action === 'update_existing' && !data.venueId) {
      throw new Error('Pick an existing venue to update.')
    }

    const supabase = createSupabaseServiceClient()

    const { data: suggestion, error: loadError } = await supabase
      .from('venue_suggestions')
      .select('id, city_id, venue_name, status, storage_path, parsed_slots')
      .eq('id', data.submissionId)
      .single()

    if (loadError || !suggestion) {
      throw loadError ?? new Error('Suggestion not found.')
    }

    if (suggestion.status !== 'pending_review') {
      throw new Error('This suggestion was already reviewed.')
    }

    const parsed = parseStoredParsedSlots(suggestion.parsed_slots)
    const hasParsedSlots = parsed != null && parsed.slots.length > 0

    let targetVenueId: string

    if (data.action === 'update_existing') {
      const venueId = data.venueId as string
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('id, city_id, archived_at')
        .eq('id', venueId)
        .single()

      if (venueError || !venue) {
        throw venueError ?? new Error('Venue not found.')
      }

      if (venue.city_id !== suggestion.city_id) {
        throw new Error('That venue is in a different city.')
      }

      if (venue.archived_at) {
        throw new Error('That venue is archived — restore it before applying happy hour.')
      }

      targetVenueId = venue.id
    } else {
      const place = await resolveGooglePlaceForSuggestion(data.googlePlaceId as string)

      const { data: existingByPlace } = await supabase
        .from('venues')
        .select('id, archived_at')
        .eq('place_id', place.placeId)
        .maybeSingle()

      if (existingByPlace?.archived_at) {
        throw new Error('This Google place matches an archived venue — restore it first.')
      }

      if (existingByPlace) {
        targetVenueId = existingByPlace.id
        await saveDiscoveredVenue(supabase, {
          cityId: suggestion.city_id,
          place,
          existingVenueId: existingByPlace.id,
        })
      } else {
        const saved = await saveDiscoveredVenue(supabase, {
          cityId: suggestion.city_id,
          place,
        })
        targetVenueId = saved.venueId
      }
    }

    let dealsAdded = 0
    let slotsTouched = 0

    if (hasParsedSlots) {
      const result = await applyParsedHappyHourSlotsToVenue(
        supabase,
        targetVenueId,
        parsed.slots,
        data.mode,
      )
      dealsAdded = result.dealsAdded
      slotsTouched = result.slotsTouched
    }

    const { error: updateError } = await supabase
      .from('venue_suggestions')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', suggestion.id)

    if (updateError) {
      throw updateError
    }

    const { error: venueMenuError } = await supabase
      .from('venues')
      .update({ happy_hour_menu_storage_path: suggestion.storage_path })
      .eq('id', targetVenueId)

    if (venueMenuError) {
      throw venueMenuError
    }

    const actionLabel =
      data.action === 'update_existing' ? 'Updated existing listing' : 'Added venue from Google Places'

    const dealsMessage = hasParsedSlots
      ? dealsAdded > 0
        ? ` — added ${dealsAdded} special${dealsAdded === 1 ? '' : 's'} to ${slotsTouched} slot${slotsTouched === 1 ? '' : 's'}.`
        : ' — happy hour slots were refreshed (no new specials detected).'
      : ' — menu photo saved; enter happy hour details in the venue editor.'

    return {
      venueId: targetVenueId,
      message: `${actionLabel}${dealsMessage}`,
    }
  })

export const parseVenueSuggestionMenuPhoto = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ submissionId: z.string().uuid() }))
  .handler(async ({
    data,
  }): Promise<{ message: string; dealCount: number }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: suggestion, error: loadError } = await supabase
      .from('venue_suggestions')
      .select('id, storage_path, status')
      .eq('id', data.submissionId)
      .single()

    if (loadError || !suggestion) {
      throw loadError ?? new Error('Suggestion not found')
    }

    if (suggestion.status !== 'pending_review') {
      throw new Error('Only pending suggestions can be parsed.')
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('menu-photos')
      .download(suggestion.storage_path)

    if (downloadError || !fileData) {
      throw downloadError ?? new Error('Could not load menu photo.')
    }

    const mediaType = mediaTypeFromStoragePath(suggestion.storage_path)
    const imageBase64 = Buffer.from(await fileData.arrayBuffer()).toString('base64')
    const parsed = await parseHappyHourFromMenuImage(imageBase64, mediaType)

    const { error: updateError } = await supabase
      .from('venue_suggestions')
      .update({
        parsed_slots: {
          slots: parsed.slots,
          warnings: parsed.warnings,
        },
      })
      .eq('id', suggestion.id)

    if (updateError) {
      throw updateError
    }

    const dealCount = parsed.slots.reduce(
      (total, slot) => total + (slot.deals?.length ?? 0),
      0,
    )

    return {
      dealCount,
      message:
        dealCount > 0
          ? `Parsed menu photo — found ${dealCount} special${dealCount === 1 ? '' : 's'}.`
          : 'Parsed menu photo — no priced specials found. Check the image or enter hours manually.',
    }
  })

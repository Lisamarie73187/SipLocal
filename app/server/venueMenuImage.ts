import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import {
  buildMenuPhotoStoragePath,
  createSignedMenuPhotoUrl,
  uploadMenuPhotoToStorage,
} from '@/lib/menuPhotoStorage'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { isMenuPhotoMediaType, type MenuPhotoMediaType } from '@/utils/menuPhotoFile'

function toAuthError(error: unknown): Error {
  if (error instanceof AdminAuthError) return error
  return error instanceof Error ? error : new Error('Unexpected error')
}

export const getVenueHappyHourMenuImage = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const supabase = createSupabaseServiceClient()

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, is_published, archived_at, happy_hour_menu_storage_path, happy_hour_menu_url')
      .eq('id', data.venueId)
      .maybeSingle()

    if (venueError || !venue || !venue.is_published || venue.archived_at) {
      return { url: null }
    }

    if (venue.happy_hour_menu_storage_path) {
      const url = await createSignedMenuPhotoUrl(supabase, venue.happy_hour_menu_storage_path)
      return { url }
    }

    if (venue.happy_hour_menu_url) {
      return { url: venue.happy_hour_menu_url }
    }

    const { data: submission, error: submissionError } = await supabase
      .from('venue_menu_submissions')
      .select('storage_path')
      .eq('venue_id', data.venueId)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (submissionError || !submission) {
      return { url: null }
    }

    const url = await createSignedMenuPhotoUrl(supabase, submission.storage_path)
    return { url }
  })

export const setVenueMenuPhoto = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      imageBase64: z.string().min(1),
      mediaType: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ storagePath: string }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    if (!isMenuPhotoMediaType(data.mediaType)) {
      throw new Error('Use a JPEG, PNG, or WebP image.')
    }

    const mediaType = data.mediaType as MenuPhotoMediaType
    const submissionId = `admin-${Date.now()}`
    const supabase = createSupabaseServiceClient()

    const storagePath = await uploadMenuPhotoToStorage(supabase, {
      venueId: data.venueId,
      submissionId,
      imageBase64: data.imageBase64,
      mediaType,
    })

    const { error } = await supabase
      .from('venues')
      .update({
        happy_hour_menu_storage_path: storagePath,
        happy_hour_menu_url: null,
      })
      .eq('id', data.venueId)

    if (error) throw error

    return { storagePath }
  })

export const setVenueMenuPhotoUrl = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      url: z.string().url(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { error } = await supabase
      .from('venues')
      .update({
        happy_hour_menu_url: data.url,
        happy_hour_menu_storage_path: null,
      })
      .eq('id', data.venueId)

    if (error) throw error

    return { ok: true }
  })

export const clearVenueMenuPhoto = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { error } = await supabase
      .from('venues')
      .update({
        happy_hour_menu_storage_path: null,
        happy_hour_menu_url: null,
      })
      .eq('id', data.venueId)

    if (error) throw error

    return { ok: true }
  })

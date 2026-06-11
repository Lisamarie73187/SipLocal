import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import {
  createSignedMenuPhotoUrl,
  deleteMenuPhotoFromStorage,
  uploadMenuPhotoToStorage,
} from '@/lib/menuPhotoStorage'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { isMenuPhotoMediaType, type MenuPhotoMediaType } from '@/utils/menuPhotoFile'

function toAuthError(error: unknown): Error {
  if (error instanceof AdminAuthError) return error
  return error instanceof Error ? error : new Error('Unexpected error')
}

export interface VenueMenuImageItem {
  id: string
  url: string
}

export const getVenueHappyHourMenuImages = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ images: VenueMenuImageItem[] }> => {
    const supabase = createSupabaseServiceClient()

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, is_published, archived_at')
      .eq('id', data.venueId)
      .maybeSingle()

    if (venueError || !venue || !venue.is_published || venue.archived_at) {
      return { images: [] }
    }

    const { data: rows, error: imagesError } = await supabase
      .from('venue_menu_images')
      .select('id, storage_path')
      .eq('venue_id', data.venueId)
      .order('position', { ascending: true })

    if (imagesError || !rows) {
      return { images: [] }
    }

    const images = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        url: await createSignedMenuPhotoUrl(supabase, row.storage_path),
      })),
    )

    return { images }
  })

export const getAdminVenueMenuImages = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ images: VenueMenuImageItem[] }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: rows, error: imagesError } = await supabase
      .from('venue_menu_images')
      .select('id, storage_path')
      .eq('venue_id', data.venueId)
      .order('position', { ascending: true })

    if (imagesError) throw imagesError

    const images = await Promise.all(
      (rows ?? []).map(async (row) => ({
        id: row.id,
        url: await createSignedMenuPhotoUrl(supabase, row.storage_path),
      })),
    )

    return { images }
  })

export const addVenueMenuPhoto = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      imageBase64: z.string().min(1),
      mediaType: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ id: string; url: string }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    if (!isMenuPhotoMediaType(data.mediaType)) {
      throw new Error('Use a JPEG, PNG, or WebP image.')
    }

    const mediaType = data.mediaType as MenuPhotoMediaType
    const supabase = createSupabaseServiceClient()

    const { count: existingCount, error: countError } = await supabase
      .from('venue_menu_images')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', data.venueId)

    if (countError) throw countError

    const submissionId = `admin-${Date.now()}`
    const storagePath = await uploadMenuPhotoToStorage(supabase, {
      venueId: data.venueId,
      submissionId,
      imageBase64: data.imageBase64,
      mediaType,
    })

    const { data: inserted, error } = await supabase
      .from('venue_menu_images')
      .insert({
        venue_id: data.venueId,
        storage_path: storagePath,
        position: existingCount ?? 0,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      await deleteMenuPhotoFromStorage(supabase, storagePath)
      throw error ?? new Error('Failed to save menu photo.')
    }

    const url = await createSignedMenuPhotoUrl(supabase, storagePath)

    return { id: inserted.id, url }
  })

export const deleteVenueMenuPhoto = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueId: z.string().uuid(), imageId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: image, error: fetchError } = await supabase
      .from('venue_menu_images')
      .select('id, storage_path')
      .eq('id', data.imageId)
      .eq('venue_id', data.venueId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!image) throw new Error('Menu photo not found.')

    const { error: deleteError } = await supabase
      .from('venue_menu_images')
      .delete()
      .eq('id', image.id)

    if (deleteError) throw deleteError

    await deleteMenuPhotoFromStorage(supabase, image.storage_path)

    const { data: remaining, error: remainingError } = await supabase
      .from('venue_menu_images')
      .select('id')
      .eq('venue_id', data.venueId)
      .order('position', { ascending: true })

    if (remainingError) throw remainingError

    for (let i = 0; i < (remaining ?? []).length; i++) {
      await supabase
        .from('venue_menu_images')
        .update({ position: i })
        .eq('id', remaining![i].id)
    }

    return { ok: true }
  })

export const reorderVenueMenuPhotos = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      imageIds: z.array(z.string().uuid()).min(1),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: rows, error: fetchError } = await supabase
      .from('venue_menu_images')
      .select('id')
      .eq('venue_id', data.venueId)

    if (fetchError) throw fetchError

    const validIds = new Set((rows ?? []).map((row) => row.id))
    if (data.imageIds.length !== validIds.size || !data.imageIds.every((id) => validIds.has(id))) {
      throw new Error('Image list does not match this venue.')
    }

    for (let i = 0; i < data.imageIds.length; i++) {
      const { error } = await supabase
        .from('venue_menu_images')
        .update({ position: i })
        .eq('id', data.imageIds[i])

      if (error) throw error
    }

    return { ok: true }
  })

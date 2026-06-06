import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'
import {
  menuPhotoExtension,
  type MenuPhotoMediaType,
  validateMenuPhotoPayload,
} from '@/utils/menuPhotoFile'

export function buildMenuPhotoStoragePath(
  venueId: string,
  submissionId: string,
  mediaType: MenuPhotoMediaType,
): string {
  return `${venueId}/${submissionId}.${menuPhotoExtension(mediaType)}`
}

export function buildVenueSuggestionStoragePath(
  cityId: string,
  submissionId: string,
  mediaType: MenuPhotoMediaType,
): string {
  return `suggestions/${cityId}/${submissionId}.${menuPhotoExtension(mediaType)}`
}

export async function uploadMenuPhotoToStorage(
  supabase: SupabaseClient<Database>,
  params: {
    venueId: string
    submissionId: string
    imageBase64: string
    mediaType: MenuPhotoMediaType
  },
): Promise<string> {
  validateMenuPhotoPayload(params)

  const path = buildMenuPhotoStoragePath(
    params.venueId,
    params.submissionId,
    params.mediaType,
  )
  const bytes = Buffer.from(params.imageBase64, 'base64')

  const { error } = await supabase.storage.from('menu-photos').upload(path, bytes, {
    contentType: params.mediaType,
    upsert: false,
  })

  if (error) {
    throw error
  }

  return path
}

export async function uploadVenueSuggestionPhotoToStorage(
  supabase: SupabaseClient<Database>,
  params: {
    cityId: string
    submissionId: string
    imageBase64: string
    mediaType: MenuPhotoMediaType
  },
): Promise<string> {
  validateMenuPhotoPayload(params)

  const path = buildVenueSuggestionStoragePath(
    params.cityId,
    params.submissionId,
    params.mediaType,
  )
  const bytes = Buffer.from(params.imageBase64, 'base64')

  const { error } = await supabase.storage.from('menu-photos').upload(path, bytes, {
    contentType: params.mediaType,
    upsert: false,
  })

  if (error) {
    throw error
  }

  return path
}

export async function createSignedMenuPhotoUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('menu-photos')
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Could not load menu photo.')
  }

  return data.signedUrl
}

export async function deleteMenuPhotoFromStorage(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage.from('menu-photos').remove([storagePath])

  if (error) {
    throw error
  }
}

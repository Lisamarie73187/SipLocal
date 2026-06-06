import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

import {
  menuPhotoExtension,
  validateMenuPhotoPayload,
  type MenuPhotoMediaType,
} from './menuPhotoFile.ts'

function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/\s/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

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
  supabase: SupabaseClient,
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
  const bytes = base64ToBytes(params.imageBase64)

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
  supabase: SupabaseClient,
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
  const bytes = base64ToBytes(params.imageBase64)

  const { error } = await supabase.storage.from('menu-photos').upload(path, bytes, {
    contentType: params.mediaType,
    upsert: false,
  })

  if (error) {
    throw error
  }

  return path
}

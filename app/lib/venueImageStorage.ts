import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'
import { menuPhotoExtension, type MenuPhotoMediaType, validateMenuPhotoPayload } from '@/utils/menuPhotoFile'

export async function uploadVenueImageToStorage(
  supabase: SupabaseClient<Database>,
  params: {
    venueId: string
    imageBase64: string
    mediaType: MenuPhotoMediaType
  },
): Promise<string> {
  validateMenuPhotoPayload(params)

  const path = `${params.venueId}/cover-${Date.now()}.${menuPhotoExtension(params.mediaType)}`
  const bytes = Buffer.from(params.imageBase64, 'base64')

  const { error } = await supabase.storage.from('venue-images').upload(path, bytes, {
    contentType: params.mediaType,
    upsert: false,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from('venue-images').getPublicUrl(path)
  return data.publicUrl
}

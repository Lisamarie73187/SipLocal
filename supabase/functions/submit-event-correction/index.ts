import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createServiceClient, requireAuthenticatedUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  isMenuPhotoMediaType,
  validateMenuPhotoPayload,
  type MenuPhotoMediaType,
} from '../_shared/menuPhotoFile.ts'
import { uploadEventCorrectionPhotoToStorage } from '../_shared/menuPhotoStorage.ts'

interface SubmitEventCorrectionBody {
  eventId?: string
  venueId?: string
  venueName?: string
  title?: string
  description?: string
  imageBase64?: string
  mediaType?: string
}

async function assertEventExists(eventId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data: event, error } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  try {
    const { userId } = await requireAuthenticatedUser(req.headers.get('Authorization'))
    const body = (await req.json()) as SubmitEventCorrectionBody

    if (!body.eventId || typeof body.eventId !== 'string') {
      return errorResponse('eventId is required.')
    }

    if (!body.venueId || typeof body.venueId !== 'string') {
      return errorResponse('venueId is required.')
    }

    const venueName = body.venueName?.trim() ?? ''
    if (venueName.length < 1 || venueName.length > 200) {
      return errorResponse('venueName is required.')
    }

    const title = body.title?.trim() ?? ''
    if (title.length < 1 || title.length > 200) {
      return errorResponse('title is required.')
    }

    const description = body.description?.trim() || null
    if (description && description.length > 200) {
      return errorResponse('Description must be 200 characters or fewer.')
    }

    const hasPhoto = typeof body.imageBase64 === 'string' && body.imageBase64.length > 0

    if (!description && !hasPhoto) {
      return errorResponse('Add a photo or a few details so we know what to check.')
    }

    let mediaType: MenuPhotoMediaType | null = null
    if (hasPhoto) {
      if (!body.mediaType || !isMenuPhotoMediaType(body.mediaType)) {
        return errorResponse('Use a JPEG, PNG, or WebP image.')
      }
      mediaType = body.mediaType as MenuPhotoMediaType
      validateMenuPhotoPayload({ imageBase64: body.imageBase64 as string, mediaType })
    }

    await assertEventExists(body.eventId)

    const supabase = createServiceClient()
    const submissionId = crypto.randomUUID()

    let photoStoragePath: string | null = null
    if (hasPhoto && mediaType) {
      photoStoragePath = await uploadEventCorrectionPhotoToStorage(supabase, {
        eventId: body.eventId,
        submissionId,
        imageBase64: body.imageBase64 as string,
        mediaType,
      })
    }

    const { error } = await supabase.from('event_submissions').insert({
      id: submissionId,
      user_id: userId,
      venue_id: body.venueId,
      venue_name: venueName,
      title,
      description,
      photo_storage_path: photoStoragePath,
      status: 'pending_review',
    })

    if (error) {
      throw error
    }

    return jsonResponse({
      submissionId,
      message: 'Thanks for letting us know!! Not all heros wear capes',
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }

    const message = error instanceof Error ? error.message : 'Submit failed.'
    return errorResponse(message, 400)
  }
})

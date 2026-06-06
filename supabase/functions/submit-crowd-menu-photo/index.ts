import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createServiceClient, requireAuthenticatedUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  isMenuPhotoMediaType,
  validateMenuPhotoPayload,
  type MenuPhotoMediaType,
} from '../_shared/menuPhotoFile.ts'
import { uploadMenuPhotoToStorage } from '../_shared/menuPhotoStorage.ts'
import {
  parseSubmitterLocation,
  submitterLocationDbFields,
} from '../_shared/submitterLocation.ts'

interface SubmitCrowdMenuPhotoBody {
  venueId?: string
  imageBase64?: string
  mediaType?: string
  submitterLocation?: unknown
}

async function assertPublishedVenue(venueId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data: venue, error } = await supabase
    .from('venues')
    .select('id, is_published')
    .eq('id', venueId)
    .single()

  if (error || !venue) {
    throw new Error('Venue not found')
  }

  if (!venue.is_published) {
    throw new Error('This venue is not available for menu submissions.')
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
    const body = (await req.json()) as SubmitCrowdMenuPhotoBody

    if (!body.venueId || typeof body.venueId !== 'string') {
      return errorResponse('venueId is required.')
    }

    if (!body.imageBase64 || typeof body.imageBase64 !== 'string') {
      return errorResponse('imageBase64 is required.')
    }

    if (!body.mediaType || !isMenuPhotoMediaType(body.mediaType)) {
      return errorResponse('Use a JPEG, PNG, or WebP image.')
    }

    const mediaType = body.mediaType as MenuPhotoMediaType
    validateMenuPhotoPayload({ imageBase64: body.imageBase64, mediaType })

    await assertPublishedVenue(body.venueId)

    const supabase = createServiceClient()
    const submissionId = crypto.randomUUID()
    const storagePath = await uploadMenuPhotoToStorage(supabase, {
      venueId: body.venueId,
      submissionId,
      imageBase64: body.imageBase64,
      mediaType,
    })

    const submitterLocation = parseSubmitterLocation(body.submitterLocation)
    const { error } = await supabase.from('venue_menu_submissions').insert({
      id: submissionId,
      venue_id: body.venueId,
      user_id: userId,
      storage_path: storagePath,
      source: 'crowd',
      status: 'pending_review',
      parsed_slots: null,
      ...submitterLocationDbFields(submitterLocation),
    })

    if (error) {
      throw error
    }

    return jsonResponse({
      submissionId,
      message:
        "Nice catch! Consider yourself a certified Happy Hour Fact Checker. We'll review your update shortly.",
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }

    const message = error instanceof Error ? error.message : 'Submit failed.'
    return errorResponse(message, 400)
  }
})

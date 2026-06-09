import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createServiceClient, requireAuthenticatedUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  isMenuPhotoMediaType,
  validateMenuPhotoPayload,
  type MenuPhotoMediaType,
} from '../_shared/menuPhotoFile.ts'
import { uploadVenueSuggestionPhotoToStorage } from '../_shared/menuPhotoStorage.ts'
import {
  parseSubmitterLocation,
  submitterLocationDbFields,
} from '../_shared/submitterLocation.ts'

interface SubmitVenueSuggestionBody {
  citySlug?: string
  venueName?: string
  userDescription?: string
  imageBase64?: string
  mediaType?: string
  submitterLocation?: unknown
}

async function resolveCityId(citySlug: string): Promise<string> {
  const supabase = createServiceClient()
  const { data: city, error } = await supabase
    .from('cities')
    .select('id')
    .eq('slug', citySlug)
    .eq('is_active', true)
    .single()

  if (error || !city) {
    throw new Error('City not found.')
  }

  return city.id
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
    const body = (await req.json()) as SubmitVenueSuggestionBody

    if (!body.citySlug || typeof body.citySlug !== 'string') {
      return errorResponse('citySlug is required.')
    }

    const venueName = body.venueName?.trim() ?? ''
    if (venueName.length < 2 || venueName.length > 200) {
      return errorResponse('Enter a venue name between 2 and 200 characters.')
    }

    if (!body.imageBase64 || typeof body.imageBase64 !== 'string') {
      return errorResponse('imageBase64 is required.')
    }

    if (!body.mediaType || !isMenuPhotoMediaType(body.mediaType)) {
      return errorResponse('Use a JPEG, PNG, or WebP image.')
    }

    const mediaType = body.mediaType as MenuPhotoMediaType
    validateMenuPhotoPayload({ imageBase64: body.imageBase64, mediaType })

    const cityId = await resolveCityId(body.citySlug)
    const supabase = createServiceClient()
    const submissionId = crypto.randomUUID()

    const storagePath = await uploadVenueSuggestionPhotoToStorage(supabase, {
      cityId,
      submissionId,
      imageBase64: body.imageBase64,
      mediaType,
    })

    const submitterLocation = parseSubmitterLocation(body.submitterLocation)
    const userDescription = typeof body.userDescription === 'string' ? body.userDescription.trim() || null : null

    const { error } = await supabase.from('venue_suggestions').insert({
      id: submissionId,
      user_id: userId,
      city_id: cityId,
      venue_name: venueName,
      user_description: userDescription,
      storage_path: storagePath,
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
        "Thanks! Nice find! You've helped fellow sippers discover a new happy hour.",
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }

    const message = error instanceof Error ? error.message : 'Submit failed.'
    return errorResponse(message, 400)
  }
})

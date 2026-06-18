import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createServiceClient } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed.', 405)
  }

  try {
    const url = new URL(req.url)
    const venueId = url.searchParams.get('venueId') ?? req.headers.get('x-venue-id')

    if (!venueId) {
      return errorResponse('venueId is required.')
    }

    const supabase = createServiceClient()

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, is_published, archived_at')
      .eq('id', venueId)
      .maybeSingle()

    if (venueError || !venue || !venue.is_published || venue.archived_at) {
      return jsonResponse({ url: null, urls: [] })
    }

    const { data: menuImages, error: menuImagesError } = await supabase
      .from('venue_menu_images')
      .select('storage_path')
      .eq('venue_id', venueId)
      .order('position', { ascending: true })

    if (!menuImagesError && menuImages && menuImages.length > 0) {
      const signedUrls = await Promise.all(
        menuImages.map(async (image) => {
          const { data, error } = await supabase.storage
            .from('menu-photos')
            .createSignedUrl(image.storage_path, 3600)

          return error ? null : (data?.signedUrl ?? null)
        }),
      )

      const urls = signedUrls.filter((signedUrl): signedUrl is string => signedUrl !== null)

      if (urls.length > 0) {
        return jsonResponse({ url: urls[0], urls })
      }
    }

    const { data: submission, error: submissionError } = await supabase
      .from('venue_menu_submissions')
      .select('storage_path')
      .eq('venue_id', venueId)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (submissionError || !submission) {
      return jsonResponse({ url: null, urls: [] })
    }

    const { data, error } = await supabase.storage
      .from('menu-photos')
      .createSignedUrl(submission.storage_path, 3600)

    if (error || !data?.signedUrl) {
      return jsonResponse({ url: null, urls: [] })
    }

    return jsonResponse({ url: data.signedUrl, urls: [data.signedUrl] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load menu image.'
    return errorResponse(message, 500)
  }
})

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
      .select('id, is_published, archived_at, happy_hour_menu_storage_path, happy_hour_menu_url')
      .eq('id', venueId)
      .maybeSingle()

    if (venueError || !venue || !venue.is_published || venue.archived_at) {
      return jsonResponse({ url: null })
    }

    if (venue.happy_hour_menu_storage_path) {
      const { data, error } = await supabase.storage
        .from('menu-photos')
        .createSignedUrl(venue.happy_hour_menu_storage_path, 3600)

      if (error || !data?.signedUrl) {
        return jsonResponse({ url: null })
      }

      return jsonResponse({ url: data.signedUrl })
    }

    if (venue.happy_hour_menu_url) {
      return jsonResponse({ url: venue.happy_hour_menu_url })
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
      return jsonResponse({ url: null })
    }

    const { data, error } = await supabase.storage
      .from('menu-photos')
      .createSignedUrl(submission.storage_path, 3600)

    if (error || !data?.signedUrl) {
      return jsonResponse({ url: null })
    }

    return jsonResponse({ url: data.signedUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load menu image.'
    return errorResponse(message, 500)
  }
})

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSignedMenuPhotoUrl } from '@/lib/menuPhotoStorage'
import { createSupabaseServiceClient } from '@/lib/supabaseService'

export const getVenueHappyHourMenuImage = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const supabase = createSupabaseServiceClient()

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, is_published, archived_at, happy_hour_menu_storage_path')
      .eq('id', data.venueId)
      .maybeSingle()

    if (venueError || !venue || !venue.is_published || venue.archived_at) {
      return { url: null }
    }

    let storagePath = venue.happy_hour_menu_storage_path

    if (!storagePath) {
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

      storagePath = submission.storage_path
    }

    const url = await createSignedMenuPhotoUrl(supabase, storagePath)
    return { url }
  })

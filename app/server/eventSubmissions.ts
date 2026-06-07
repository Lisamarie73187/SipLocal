import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import type { Database } from '@/types/database'

const EVENT_PHOTO_BUCKET = 'event-photos'

function toAdminError(error: unknown): Error {
  if (error instanceof AdminAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

export interface AdminEventSubmissionListItem {
  id: string
  user_email: string | null
  title: string
  description: string | null
  photo_url: string | null
  photo_storage_path: string | null
  status: Database['public']['Enums']['event_submission_status']
  created_at: string
}

export const listVenueEventSubmissionsForAdmin = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<AdminEventSubmissionListItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { data: rows, error } = await supabase
      .from('event_submissions')
      .select('id, user_id, title, description, photo_storage_path, status, created_at')
      .eq('venue_id', data.venueId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const items: AdminEventSubmissionListItem[] = []

    for (const row of rows ?? []) {
      const { data: userData } = await supabase.auth.admin.getUserById(row.user_id)

      let photoUrl: string | null = null
      if (row.photo_storage_path) {
        const { data: signed } = await supabase.storage
          .from(EVENT_PHOTO_BUCKET)
          .createSignedUrl(row.photo_storage_path, 3600)
        photoUrl = signed?.signedUrl ?? null
      }

      items.push({
        id: row.id,
        user_email: userData.user?.email ?? null,
        title: row.title,
        description: row.description,
        photo_url: photoUrl,
        photo_storage_path: row.photo_storage_path,
        status: row.status,
        created_at: row.created_at,
      })
    }

    return items
  })

async function setSubmissionStatus(
  submissionId: string,
  status: 'approved' | 'rejected',
): Promise<{ message: string }> {
  const { userId } = await requireAdmin()
  const supabase = createSupabaseServiceClient()

  const { data: submission, error: loadError } = await supabase
    .from('event_submissions')
    .select('id')
    .eq('id', submissionId)
    .eq('status', 'pending_review')
    .single()

  if (loadError || !submission) {
    throw loadError ?? new Error('Submission not found or already reviewed.')
  }

  const { error: updateError } = await supabase
    .from('event_submissions')
    .update({
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (updateError) {
    throw updateError
  }

  return {
    message:
      status === 'approved'
        ? 'Submission approved. Fill in the prefilled event below and save to publish it.'
        : 'Submission rejected.',
  }
}

export const approveVenueEventSubmission = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ submissionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ message: string }> => {
    try {
      return await setSubmissionStatus(data.submissionId, 'approved')
    } catch (error) {
      throw toAdminError(error)
    }
  })

export const rejectVenueEventSubmission = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ submissionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ message: string }> => {
    try {
      return await setSubmissionStatus(data.submissionId, 'rejected')
    } catch (error) {
      throw toAdminError(error)
    }
  })

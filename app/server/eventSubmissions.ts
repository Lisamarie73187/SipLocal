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

export interface AdminPendingEventSubmissionItem extends AdminEventSubmissionListItem {
  venue_id: string | null
  venue_name: string
  venue_slug: string | null
  address_line1: string | null
}

export const listPendingEventSubmissions = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      citySlug: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
  )
  .handler(async ({ data }): Promise<AdminPendingEventSubmissionItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()
    const limit = data.limit ?? 20

    let cityId: string | null = null
    if (data.citySlug) {
      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('id')
        .eq('slug', data.citySlug)
        .maybeSingle()

      if (cityError) {
        throw cityError
      }
      if (!city) {
        return []
      }

      cityId = city.id
    }

    const { data: rows, error } = await supabase
      .from('event_submissions')
      .select(
        `
        id,
        user_id,
        title,
        description,
        photo_storage_path,
        status,
        created_at,
        venue_id,
        venue_name,
        venues (
          name,
          slug,
          address_line1,
          city_id
        )
      `,
      )
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    const items: AdminPendingEventSubmissionItem[] = []

    for (const row of rows ?? []) {
      const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues

      if (cityId && row.venue_id && venue?.city_id !== cityId) {
        continue
      }

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
        venue_id: row.venue_id,
        venue_name: venue?.name ?? row.venue_name ?? 'Unknown venue',
        venue_slug: venue?.slug ?? null,
        address_line1: venue?.address_line1 ?? null,
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

export const setEventCommunityVerified = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      eventId: z.string().uuid(),
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<{ communityVerifiedAt: string | null }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()
    const communityVerifiedAt = data.enabled ? new Date().toISOString() : null

    const { error: updateError } = await supabase
      .from('events')
      .update({ community_verified_at: communityVerifiedAt })
      .eq('id', data.eventId)

    if (updateError) {
      throw updateError
    }

    return { communityVerifiedAt }
  })

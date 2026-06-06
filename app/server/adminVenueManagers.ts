import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requireAdmin } from '@/lib/adminAuth.server'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import type { Database } from '@/types/database'

import { toAuthError } from '@/server/adminVenues.shared'

export interface VenueManagerListItem {
  id: string
  user_id: string
  email: string | null
  role: Database['public']['Enums']['venue_manager_role']
  created_at: string
}

export const listVenueManagers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<VenueManagerListItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { data: rows, error } = await supabase
      .from('venue_managers')
      .select('id, user_id, role, created_at')
      .eq('venue_id', data.venueId)
      .order('created_at')

    if (error) {
      throw error
    }

    const managers: VenueManagerListItem[] = []
    for (const row of rows ?? []) {
      const { data: userData } = await supabase.auth.admin.getUserById(row.user_id)
      managers.push({
        id: row.id,
        user_id: row.user_id,
        email: userData.user?.email ?? null,
        role: row.role,
        created_at: row.created_at,
      })
    }

    return managers
  })

export const inviteVenueManager = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(['owner', 'manager']).optional().default('manager'),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true; managePath: string; email: string }> => {
    let adminId: string
    try {
      ;({ userId: adminId } = await requireAdmin())
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const email = data.email.trim().toLowerCase()

    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listError) {
      throw listError
    }

    const authUser = listed.users.find((user) => user.email?.toLowerCase() === email)
    if (!authUser) {
      throw new Error(
        `No account found for ${email}. Ask them to sign up first, then add them again.`,
      )
    }

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('slug, cities ( slug )')
      .eq('id', data.venueId)
      .single()

    if (venueError || !venue) {
      throw venueError ?? new Error('Venue not found')
    }

    const city = venue.cities
    const citySlug = city && !Array.isArray(city) ? city.slug : 'bend-or'

    const { error: insertError } = await supabase.from('venue_managers').insert({
      venue_id: data.venueId,
      user_id: authUser.id,
      role: data.role,
      invited_by: adminId,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error('This user already manages this venue.')
      }
      throw insertError
    }

    return {
      ok: true,
      managePath: `/manage/${venue.slug}`,
      email,
    }
  })

export const removeVenueManager = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ managerId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { error } = await supabase.from('venue_managers').delete().eq('id', data.managerId)

    if (error) {
      throw error
    }

    return { ok: true }
  })

export interface VenueClaimRequestListItem {
  id: string
  venue_id: string
  venue_name: string
  venue_slug: string
  user_id: string
  user_email: string | null
  message: string | null
  status: Database['public']['Enums']['venue_claim_status']
  created_at: string
}

export const listVenueClaimRequests = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }))
  .handler(async ({ data }): Promise<VenueClaimRequestListItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    let query = supabase
      .from('venue_claim_requests')
      .select(
        `
        id,
        venue_id,
        user_id,
        message,
        status,
        created_at,
        venues ( name, slug )
      `,
      )
      .order('created_at', { ascending: false })

    if (data.status) {
      query = query.eq('status', data.status)
    }

    const { data: rows, error } = await query

    if (error) {
      throw error
    }

    const items: VenueClaimRequestListItem[] = []
    for (const row of rows ?? []) {
      const venue = row.venues
      if (!venue || Array.isArray(venue)) {
        continue
      }
      const { data: userData } = await supabase.auth.admin.getUserById(row.user_id)
      items.push({
        id: row.id,
        venue_id: row.venue_id,
        venue_name: venue.name,
        venue_slug: venue.slug,
        user_id: row.user_id,
        user_email: userData.user?.email ?? null,
        message: row.message,
        status: row.status,
        created_at: row.created_at,
      })
    }

    return items
  })

export const reviewVenueClaimRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      claimId: z.string().uuid(),
      action: z.enum(['approve', 'reject']),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    let adminId: string
    try {
      ;({ userId: adminId } = await requireAdmin())
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: claim, error: claimError } = await supabase
      .from('venue_claim_requests')
      .select('id, venue_id, user_id, status')
      .eq('id', data.claimId)
      .single()

    if (claimError || !claim) {
      throw claimError ?? new Error('Claim not found')
    }

    if (claim.status !== 'pending') {
      throw new Error('This claim was already reviewed.')
    }

    const reviewedAt = new Date().toISOString()
    const newStatus = data.action === 'approve' ? 'approved' : 'rejected'

    const { error: updateError } = await supabase
      .from('venue_claim_requests')
      .update({
        status: newStatus,
        reviewed_by: adminId,
        reviewed_at: reviewedAt,
      })
      .eq('id', data.claimId)

    if (updateError) {
      throw updateError
    }

    if (data.action === 'approve') {
      const { error: insertError } = await supabase.from('venue_managers').insert({
        venue_id: claim.venue_id,
        user_id: claim.user_id,
        role: 'owner',
        invited_by: adminId,
      })

      if (insertError && insertError.code !== '23505') {
        throw insertError
      }
    }

    return { ok: true }
  })

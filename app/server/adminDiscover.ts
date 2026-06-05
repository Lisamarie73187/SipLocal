import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import {
  discoverVenuesFromNames,
  type DiscoverVenuesFromNamesResult,
} from '@/lib/scrape/discoverVenuesPipeline'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import type { Database } from '@/types/database'

function toAuthError(error: unknown): Error {
  if (error instanceof AdminAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

export interface DiscoveredVenueListItem {
  id: string
  name: string
  address_line1: string
  phone: string | null
  website_url: string | null
  data_status: string
  schedule_cadence: Database['public']['Enums']['schedule_cadence'] | null
  last_verified_at: string | null
  last_scraped_at: string | null
  happy_hour_slot_count: number
}

export const discoverVenuesByName = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      citySlug: z.string().min(1),
      namesText: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<DiscoverVenuesFromNamesResult> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    return discoverVenuesFromNames({
      citySlug: data.citySlug,
      namesText: data.namesText,
    })
  })

export const listDiscoveredVenues = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ citySlug: z.string().min(1) }))
  .handler(async ({ data }): Promise<DiscoveredVenueListItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { data: city, error: cityError } = await supabase
      .from('cities')
      .select('id')
      .eq('slug', data.citySlug)
      .eq('is_active', true)
      .single()

    if (cityError || !city) {
      return []
    }

    const { data: rows, error } = await supabase
      .from('venues')
      .select(
        `
        id,
        name,
        address_line1,
        phone,
        website_url,
        data_status,
        schedule_cadence,
        last_verified_at,
        last_scraped_at,
        happy_hour_slots ( id, is_active )
      `,
      )
      .eq('city_id', city.id)
      .eq('data_status', 'discovered')
      .is('archived_at', null)
      .order('name')

    if (error) {
      throw error
    }

    return (rows ?? []).map((row) => {
      const activeSlots = (row.happy_hour_slots ?? []).filter(
        (slot) => slot.is_active !== false,
      )
      return {
        id: row.id,
        name: row.name,
        address_line1: row.address_line1,
        phone: row.phone,
        website_url: row.website_url,
        data_status: row.data_status,
        schedule_cadence: row.schedule_cadence,
        last_verified_at: row.last_verified_at,
        last_scraped_at: row.last_scraped_at,
        happy_hour_slot_count: activeSlots.length,
      }
    })
  })

export const getAdminDiscoverDashboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{
    cities: Array<{ slug: string; name: string; state: string }>
  }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('slug, name, state')
      .eq('is_active', true)
      .order('name')

    if (citiesError) {
      throw citiesError
    }

    return { cities: cities ?? [] }
  },
)

export const verifyVenueByPerson = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const verifiedAt = new Date().toISOString()

    const { error: venueError } = await supabase
      .from('venues')
      .update({ last_verified_at: verifiedAt })
      .eq('id', data.venueId)

    if (venueError) {
      throw venueError
    }

    const { error: slotsError } = await supabase
      .from('happy_hour_slots')
      .update({ confidence: 'high' })
      .eq('venue_id', data.venueId)
      .eq('is_active', true)

    if (slotsError) {
      throw slotsError
    }

    const { error: eventsError } = await supabase
      .from('events')
      .update({ confidence: 'high', last_verified_at: verifiedAt })
      .eq('venue_id', data.venueId)

    if (eventsError) {
      throw eventsError
    }

    return { ok: true }
  })

export const setVenueScheduleCadence = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      scheduleCadence: z.enum(['weekly', 'monthly', 'annually', 'seasonally']).nullable(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { error } = await supabase
      .from('venues')
      .update({ schedule_cadence: data.scheduleCadence })
      .eq('id', data.venueId)

    if (error) {
      throw error
    }

    return { ok: true }
  })

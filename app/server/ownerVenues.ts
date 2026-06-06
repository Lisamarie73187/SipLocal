import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { OwnerAuthError, requireAuthenticatedUser, requireVenueManager } from '@/lib/ownerAuth.server'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { createSupabaseRequestClient } from '@/lib/supabaseRequest'
import { expandGroupedSlotsForSave } from '@/utils/happyHourEditorSlots'
import { reconcileVenueDataStatus } from '@/utils/venueDataStatus'
import { getOwnerPreviewCardSubtitle } from '@/utils/venueDisplay'
import type { DayOfWeek } from '@/types/venue'
import {
  groupedOwnerSlotSchema,
  toDbTime,
} from '@/utils/happyHourSlotInput'
import type { Database } from '@/types/database'

function toOwnerError(error: unknown): Error {
  if (error instanceof OwnerAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

export interface OwnerDashboardVenue {
  id: string
  slug: string
  name: string
  address_line1: string
  city_slug: string
  city_name: string
  happy_hour_slot_count: number
  role: Database['public']['Enums']['venue_manager_role']
}

export interface OwnerVenueEditorSlot {
  day_of_week: number
  start_time: string
  end_time: string
  deal_summary: string | null
  deals: Array<{
    label: string
    category: Database['public']['Enums']['deal_category']
    price_text: string | null
  }>
}

export interface OwnerVenueDetail {
  id: string
  slug: string
  name: string
  address_line1: string
  phone: string | null
  website_url: string | null
  description: string | null
  venue_type: Database['public']['Enums']['venue_type'] | null
  price_level: Database['public']['Enums']['venue_price_level']
  image_url: string | null
  city_slug: string
  city_name: string
  city_timezone: string
  lat: number
  lng: number
  /** Subtitle shown on discovery list + map panel (matches public map logic). */
  previewSubtitle: string
}

export const getOwnerDashboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<OwnerDashboardVenue[]> => {
    try {
      const { userId } = await requireAuthenticatedUser()
      const supabase = createSupabaseRequestClient()

      const { data: managerRows, error: managerError } = await supabase
        .from('venue_managers')
        .select('role, venue_id')
        .eq('user_id', userId)
        .order('created_at')

      if (managerError) {
        throw managerError
      }

      const venueIds = (managerRows ?? []).map((row) => row.venue_id)
      if (venueIds.length === 0) {
        return []
      }

      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select(
          `
          id,
          slug,
          name,
          address_line1,
          cities ( slug, name ),
          happy_hour_slots ( id, is_active )
        `,
        )
        .in('id', venueIds)

      if (venuesError) {
        throw venuesError
      }

      const roleByVenue = new Map((managerRows ?? []).map((row) => [row.venue_id, row.role]))

      return (venues ?? []).map((venue) => {
        const city = venue.cities
        const citySlug = city && !Array.isArray(city) ? city.slug : ''
        const cityName = city && !Array.isArray(city) ? city.name : ''
        const slots = venue.happy_hour_slots ?? []
        const activeCount = slots.filter(
          (slot) => !Array.isArray(slot) && slot.is_active !== false,
        ).length

        return {
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          address_line1: venue.address_line1,
          city_slug: citySlug,
          city_name: cityName,
          happy_hour_slot_count: activeCount,
          role: roleByVenue.get(venue.id) ?? 'manager',
        }
      })
    } catch (error) {
      throw toOwnerError(error)
    }
  },
)

export const getOwnerVenueBySlug = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      slug: z.string().min(1),
      citySlug: z.string().min(1).optional(),
    }),
  )
  .handler(async ({
    data,
  }): Promise<{
    venue: OwnerVenueDetail
    slots: OwnerVenueEditorSlot[]
  }> => {
    try {
      const { userId } = await requireAuthenticatedUser()
      const supabase = createSupabaseRequestClient()

      let accessQuery = supabase
        .from('venues')
        .select('id, cities!inner ( slug )')
        .eq('slug', data.slug)

      if (data.citySlug) {
        accessQuery = accessQuery.eq('cities.slug', data.citySlug)
      }

      const { data: accessVenue, error: accessError } = await accessQuery.maybeSingle()

      if (accessError) {
        throw accessError
      }

      if (!accessVenue) {
        throw new OwnerAuthError('Venue not found.', 403)
      }

      const { data: managerRow, error: managerError } = await supabase
        .from('venue_managers')
        .select('id')
        .eq('venue_id', accessVenue.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (managerError) {
        throw managerError
      }

      if (!managerRow) {
        throw new OwnerAuthError('You do not manage this venue.', 403)
      }

      const serviceSupabase = createSupabaseServiceClient()
      const { data: venueRow, error: venueError } = await serviceSupabase
        .from('venues')
        .select(
          `
          id,
          slug,
          name,
          address_line1,
          phone,
          website_url,
          description,
          venue_type,
          price_level,
          image_url,
          lat,
          lng,
          cities!inner ( slug, name, timezone )
        `,
        )
        .eq('id', accessVenue.id)
        .single()

      if (venueError || !venueRow) {
        throw venueError ?? new Error('Venue not found')
      }

      const { data: slotRows, error: slotsError } = await serviceSupabase
        .from('happy_hour_slots')
        .select(
          `
          day_of_week,
          start_time,
          end_time,
          deal_summary,
          happy_hour_deals ( label, category, price_text )
        `,
        )
        .eq('venue_id', venueRow.id)
        .order('day_of_week')
        .order('start_time')

      if (slotsError) {
        throw slotsError
      }

      const city = venueRow.cities
      if (!city || Array.isArray(city)) {
        throw new Error('City not found for venue')
      }

      const slots: OwnerVenueEditorSlot[] = (slotRows ?? []).map((slot) => ({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time.slice(0, 5),
        end_time: slot.end_time.slice(0, 5),
        deal_summary: slot.deal_summary,
        deals: (slot.happy_hour_deals ?? [])
          .filter((deal) => !Array.isArray(deal))
          .map((deal) => ({
            label: deal.label,
            category: deal.category,
            price_text: deal.price_text,
          })),
      }))

      return {
        venue: {
          id: venueRow.id,
          slug: venueRow.slug,
          name: venueRow.name,
          address_line1: venueRow.address_line1,
          phone: venueRow.phone,
          website_url: venueRow.website_url,
          description: venueRow.description,
          venue_type: venueRow.venue_type,
          price_level: venueRow.price_level,
          image_url: venueRow.image_url,
          city_slug: city.slug,
          city_name: city.name,
          city_timezone: city.timezone,
          lat: venueRow.lat,
          lng: venueRow.lng,
          previewSubtitle: getOwnerPreviewCardSubtitle({
            description: venueRow.description,
            name: venueRow.name,
            venue_type: venueRow.venue_type,
          }),
        },
        slots,
      }
    } catch (error) {
      throw toOwnerError(error)
    }
  })

export const saveOwnerVenueHappyHours = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      slots: z.array(
        z.object({
          day_of_week: z.number().int().min(0).max(6),
          start_time: z.string(),
          end_time: z.string(),
          deal_summary: z.string().nullable().optional(),
          deals: z
            .array(
              z.object({
                label: z.string().min(1),
                category: z.enum(['drinks', 'food', 'both', 'other']),
                price_text: z.string().nullable().optional(),
              }),
            )
            .optional(),
        }),
      ),
      groupedSlots: z.array(groupedOwnerSlotSchema).optional(),
    }),
  )
  .handler(async ({
    data,
  }): Promise<{ slotCount: number; message: string }> => {
    try {
      await requireVenueManager(data.venueId)
    } catch (error) {
      throw toOwnerError(error)
    }

    const flatSlots = data.groupedSlots
      ? expandGroupedSlotsForSave(
          data.groupedSlots.map((slot) => ({
            ...slot,
            data_status: 'pending_review' as const,
            is_active: true,
            confidence: null,
            source_urls: [] as string[],
            deals: slot.deals ?? [],
          })),
        ).map((slot) => ({
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          deal_summary: slot.deal_summary,
          deals: slot.deals ?? [],
        }))
      : data.slots

    if (flatSlots.length === 0) {
      throw new Error('Add at least one happy hour slot before saving.')
    }

    const supabase = createSupabaseServiceClient()

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, data_status, is_published')
      .eq('id', data.venueId)
      .single()

    if (venueError || !venue) {
      throw venueError ?? new Error('Venue not found')
    }

    const { error: deleteError } = await supabase
      .from('happy_hour_slots')
      .delete()
      .eq('venue_id', data.venueId)

    if (deleteError) {
      throw deleteError
    }

    for (const slot of flatSlots) {
      const deals = (slot.deals ?? []).filter((deal) => deal.label.trim())
      const categories: Database['public']['Enums']['deal_category'][] = []
      for (const deal of deals) {
        if (!categories.includes(deal.category)) {
          categories.push(deal.category)
        }
      }
      if (categories.length === 0) {
        categories.push('other')
      }

      const { data: slotRow, error: slotError } = await supabase
        .from('happy_hour_slots')
        .insert({
          venue_id: data.venueId,
          day_of_week: slot.day_of_week,
          start_time: toDbTime(slot.start_time),
          end_time: toDbTime(slot.end_time),
          deal_summary: slot.deal_summary?.trim() || null,
          data_status: 'pending_review',
          is_active: true,
          categories,
          source_urls: [],
          confidence: null,
        })
        .select('id')
        .single()

      if (slotError || !slotRow) {
        throw slotError ?? new Error('Failed to save happy hour slot')
      }

      if (deals.length > 0) {
        const { error: dealsError } = await supabase.from('happy_hour_deals').insert(
          deals.map((deal, index) => ({
            slot_id: slotRow.id,
            label: deal.label.trim(),
            category: deal.category,
            price_text: deal.price_text?.trim() || null,
            sort_order: index,
          })),
        )

        if (dealsError) {
          throw dealsError
        }
      }
    }

    await supabase
      .from('venues')
      .update({ data_status: reconcileVenueDataStatus('pending_review', flatSlots.length) })
      .eq('id', data.venueId)

    return {
      slotCount: flatSlots.length,
      message: 'Saved for review. We will publish updates on the map after approval.',
    }
  })

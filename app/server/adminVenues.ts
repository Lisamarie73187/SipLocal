import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { slugifyVenueName } from '@/utils/slug'
import { collectUniqueUrls } from '@/utils/urlDisplay'
import { reconcileVenueDataStatus, validateVenueBeforeSave } from '@/utils/venueDataStatus'
import { parsedHappyHourSlotSchema } from '@/server/adminHappyHourPaste'
import { parseHappyHourPasteSmart } from '@/lib/scrape/parseHappyHourWithAnthropic'
import type { DayOfWeek } from '@/types/venue'
import { rollupSlotConfidence } from '@/utils/venueTrust'
import type { Database } from '@/types/database'

function toAuthError(error: unknown): Error {
  if (error instanceof AdminAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

const timeSchema = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use HH:MM or HH:MM:SS')

function toDbTime(value: string): string {
  const parts = value.trim().split(':')
  if (parts.length === 3) {
    return value
  }
  return `${parts[0]}:${parts[1]}:00`
}

const dealInputSchema = z.object({
  label: z.string().min(1),
  category: z.enum(['drinks', 'food', 'both', 'other']),
  price_text: z.string().nullable().optional(),
})

const slotInputSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: timeSchema,
  end_time: timeSchema,
  deal_summary: z.string().nullable().optional(),
  data_status: z.enum(['live', 'pending_review', 'flagged']).optional(),
  is_active: z.boolean().optional(),
  confidence: z.enum(['high', 'medium', 'low']).nullable().optional(),
  source_urls: z.array(z.string().url()).optional(),
  deals: z.array(dealInputSchema).optional(),
})

const venueInputSchema = z.object({
  id: z.string().uuid().optional(),
  city_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(80),
  address_line1: z.string().min(1),
  address_line2: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  phone: z.string().nullable().optional(),
  website_url: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  description: z.string().nullable().optional(),
  price_level: z.enum(['$', '$$', '$$$']),
  data_status: z.enum([
    'live',
    'pending_review',
    'no_happy_hour_found',
    'flagged',
    'discovered',
  ]),
  schedule_cadence: z
    .enum(['weekly', 'monthly', 'annually', 'seasonally'])
    .nullable()
    .optional(),
  is_published: z.boolean(),
  is_featured: z.boolean().optional(),
  place_id: z.string().nullable().optional(),
  venue_type: z
    .enum([
      'bar',
      'brewery',
      'taproom',
      'restaurant',
      'gastropub',
      'wine_bar',
      'cocktail_bar',
      'sports_bar',
      'pub',
      'distillery',
    ])
    .nullable()
    .optional(),
})

const saveVenueSchema = z.object({
  venue: venueInputSchema,
  slots: z.array(slotInputSchema),
})

export interface AdminVenueListItem {
  id: string
  name: string
  slug: string
  address_line1: string
  phone: string | null
  data_status: string
  schedule_cadence: Database['public']['Enums']['schedule_cadence'] | null
  is_published: boolean
  city_slug: string
  city_name: string
  place_id: string | null
  happy_hour_slot_count: number
  live_slot_count: number
  event_count: number
  published_event_count: number
  map_visible: boolean
  website_url: string | null
  /** Unique URLs from happy hour slot scrape sources. */
  source_urls: string[]
  /** Lowest confidence across live active slots, or all active slots if none are live. */
  confidence: Database['public']['Enums']['scrape_confidence'] | null
  archived_at: string | null
}

export interface AdminVenueEditorSlot {
  day_of_week: number
  start_time: string
  end_time: string
  deal_summary: string | null
  data_status: Database['public']['Enums']['happy_hour_data_status']
  is_active: boolean
  confidence: Database['public']['Enums']['scrape_confidence'] | null
  source_urls: string[]
  deals: Array<{
    label: string
    category: Database['public']['Enums']['deal_category']
    price_text: string | null
  }>
}

export interface AdminVenueEditorEvent {
  id: string
  title: string
  description: string | null
  event_type: Database['public']['Enums']['event_type']
  event_date: string | null
  day_of_week: number | null
  start_time: string
  end_time: string | null
  is_published: boolean
  confidence: Database['public']['Enums']['scrape_confidence'] | null
  source_urls: string[]
}

export interface AdminVenueEditorData {
  cities: Array<{ id: string; slug: string; name: string; state: string }>
  cityTimezone: string
  venue: {
    id: string
    city_id: string
    name: string
    slug: string
    address_line1: string
    address_line2: string | null
    postal_code: string | null
    lat: number
    lng: number
    phone: string | null
    website_url: string | null
    description: string | null
    price_level: Database['public']['Enums']['venue_price_level']
    data_status: Database['public']['Enums']['venue_data_status']
    is_published: boolean
    is_featured: boolean
    place_id: string | null
    venue_type: Database['public']['Enums']['venue_type'] | null
    last_verified_at: string | null
    last_scraped_at: string | null
    schedule_cadence: Database['public']['Enums']['schedule_cadence'] | null
  } | null
  slots: AdminVenueEditorSlot[]
  events: AdminVenueEditorEvent[]
}

const eventInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(500).nullable().optional(),
    event_type: z.enum(['trivia', 'live_music', 'special', 'other']),
    event_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: timeSchema,
    end_time: timeSchema.optional(),
    is_published: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']).nullable().optional(),
  })
  .refine((event) => Boolean(event.event_date) || event.day_of_week != null, {
    message: 'Event needs a date or day of week',
  })

const saveVenueEventsSchema = z.object({
  venueId: z.string().uuid(),
  cityId: z.string().uuid(),
  events: z.array(eventInputSchema),
})

async function resolveUniqueSlug(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  cityId: string,
  baseSlug: string,
  excludeVenueId?: string,
): Promise<string> {
  let candidate = baseSlug
  let suffix = 2

  while (true) {
    let query = supabase
      .from('venues')
      .select('id')
      .eq('city_id', cityId)
      .eq('slug', candidate)

    if (excludeVenueId) {
      query = query.neq('id', excludeVenueId)
    }

    const { data } = await query.maybeSingle()

    if (!data) {
      return candidate
    }

    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }
}

export const getAdminVenueCities = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminVenueEditorData['cities']> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('cities')
      .select('id, slug, name, state')
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw error
    }

    return data ?? []
  },
)

export const listAdminVenues = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      citySlug: z.string().optional(),
      search: z.string().optional(),
      /** When true, only venues with data_status = live. */
      liveOnly: z.boolean().optional(),
      /** When true, only venues with data_status = pending_review. */
      pendingReviewOnly: z.boolean().optional(),
      /** When true, only venues with data_status = no_happy_hour_found. */
      noHappyHourOnly: z.boolean().optional(),
      /** When true, only venues with is_published = true. Stacks with other filters. */
      publishedOnly: z.boolean().optional(),
      /** When true, only venues visible on the public map (live + published + live slots). */
      mapVisibleOnly: z.boolean().optional(),
      /** When true, only venues with data_status = discovered (Google metadata only). */
      discoveredOnly: z.boolean().optional(),
      /** When true, only archived venues. Default lists exclude archived. */
      archivedOnly: z.boolean().optional(),
      /** When true, only venues with at least one event row. Stacks with other filters. */
      withEventsOnly: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }): Promise<AdminVenueListItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    let query = supabase
      .from('venues')
      .select(
        `
        id,
        name,
        slug,
        address_line1,
        phone,
        data_status,
        schedule_cadence,
        is_published,
        place_id,
        website_url,
        archived_at,
        cities!inner ( slug, name ),
        happy_hour_slots ( id, data_status, is_active, confidence, source_urls ),
        events ( id, is_published )
      `,
      )
      .order('name')
      .limit(500)

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
      query = query.eq('city_id', city.id)
    }

    if (data.liveOnly) {
      query = query.eq('data_status', 'live')
    } else if (data.pendingReviewOnly) {
      query = query.eq('data_status', 'pending_review')
    } else if (data.noHappyHourOnly) {
      query = query.eq('data_status', 'no_happy_hour_found')
    } else if (data.discoveredOnly) {
      query = query.eq('data_status', 'discovered')
    }

    if (data.archivedOnly) {
      query = query.not('archived_at', 'is', null)
    } else {
      query = query.is('archived_at', null)
    }

    const { data: rows, error } = await query

    if (error) {
      throw error
    }

    const search = data.search?.trim().toLowerCase()
    const mapped = (rows ?? []).map((row) => {
      const city = row.cities as { slug: string; name: string }
      const slots = row.happy_hour_slots ?? []
      const activeSlots = slots.filter(
        (slot) => slot.is_active !== false,
      )
      const liveActiveSlots = activeSlots.filter((slot) => slot.data_status === 'live')
      const liveSlotCount = liveActiveSlots.length
      const confidence = rollupSlotConfidence(
        liveActiveSlots.length > 0 ? liveActiveSlots : activeSlots,
      )
      const mapVisible =
        row.data_status === 'live' &&
        row.is_published &&
        liveSlotCount > 0

      const slotSourceUrls = slots.flatMap((slot) => slot.source_urls ?? [])
      const source_urls = collectUniqueUrls(slotSourceUrls)
      const events = row.events ?? []
      const event_count = events.length
      const published_event_count = events.filter((event) => event.is_published).length

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        address_line1: row.address_line1,
        phone: row.phone,
        data_status: row.data_status,
        schedule_cadence: row.schedule_cadence,
        is_published: row.is_published,
        city_slug: city.slug,
        city_name: city.name,
        place_id: row.place_id,
        happy_hour_slot_count: activeSlots.length,
        live_slot_count: liveSlotCount,
        event_count,
        published_event_count,
        map_visible: mapVisible,
        website_url: row.website_url,
        source_urls,
        confidence,
        archived_at: row.archived_at,
      }
    })

    let filtered = mapped

    if (data.publishedOnly) {
      filtered = filtered.filter((venue) => venue.is_published)
    }

    if (data.withEventsOnly) {
      filtered = filtered.filter((venue) => venue.event_count > 0)
    }

    if (data.mapVisibleOnly) {
      filtered = filtered.filter((venue) => venue.map_visible)
    }

    if (!search) {
      return filtered
    }

    return filtered.filter(
      (venue) =>
        venue.name.toLowerCase().includes(search) ||
        venue.slug.toLowerCase().includes(search) ||
        venue.address_line1.toLowerCase().includes(search),
    )
  })

export const archiveAdminVenues = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueIds: z.array(z.string().uuid()).min(1) }))
  .handler(async ({ data }): Promise<{ archivedCount: number; venueNames: string[] }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const archivedAt = new Date().toISOString()
    const { data: rows, error } = await supabase
      .from('venues')
      .update({ archived_at: archivedAt, is_published: false })
      .in('id', data.venueIds)
      .is('archived_at', null)
      .select('id, name')

    if (error) {
      throw error
    }

    const updated = rows ?? []
    return {
      archivedCount: updated.length,
      venueNames: updated.map((row) => row.name),
    }
  })

export const unarchiveAdminVenues = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueIds: z.array(z.string().uuid()).min(1) }))
  .handler(async ({ data }): Promise<{ unarchivedCount: number; venueNames: string[] }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { data: rows, error } = await supabase
      .from('venues')
      .update({ archived_at: null })
      .in('id', data.venueIds)
      .not('archived_at', 'is', null)
      .select('id, name')

    if (error) {
      throw error
    }

    const updated = rows ?? []
    return {
      unarchivedCount: updated.length,
      venueNames: updated.map((row) => row.name),
    }
  })

export const unpublishAdminVenues = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ venueIds: z.array(z.string().uuid()).min(1) }))
  .handler(async ({ data }): Promise<{ unpublishedCount: number; venueNames: string[] }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { data: rows, error } = await supabase
      .from('venues')
      .update({ is_published: false })
      .in('id', data.venueIds)
      .eq('is_published', true)
      .select('id, name')

    if (error) {
      throw error
    }

    const updated = rows ?? []
    return {
      unpublishedCount: updated.length,
      venueNames: updated.map((row) => row.name),
    }
  })

export const getAdminVenueForEdit = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ venueId: z.string().uuid() }))
  .handler(async ({ data }): Promise<AdminVenueEditorData> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, slug, name, state')
      .eq('is_active', true)
      .order('name')

    if (citiesError) {
      throw citiesError
    }

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', data.venueId)
      .single()

    if (venueError || !venue) {
      throw venueError ?? new Error('Venue not found')
    }

    const { data: city, error: cityError } = await supabase
      .from('cities')
      .select('timezone')
      .eq('id', venue.city_id)
      .single()

    if (cityError || !city) {
      throw cityError ?? new Error('City not found for venue')
    }

    const { data: eventRows, error: eventsError } = await supabase
      .from('events')
      .select(
        'id, title, description, event_type, event_date, day_of_week, start_time, end_time, is_published, confidence, source_urls',
      )
      .eq('venue_id', data.venueId)
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('day_of_week', { ascending: true, nullsFirst: false })
      .order('start_time', { ascending: true })

    if (eventsError) {
      throw eventsError
    }

    const { data: slotRows, error: slotsError } = await supabase
      .from('happy_hour_slots')
      .select(
        `
        day_of_week,
        start_time,
        end_time,
        deal_summary,
        data_status,
        is_active,
        confidence,
        source_urls,
        happy_hour_deals ( label, category, price_text )
      `,
      )
      .eq('venue_id', data.venueId)
      .order('day_of_week')
      .order('start_time')

    if (slotsError) {
      throw slotsError
    }

    const slots: AdminVenueEditorSlot[] = (slotRows ?? []).map((slot) => ({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      deal_summary: slot.deal_summary,
      data_status: slot.data_status,
      is_active: slot.is_active,
      confidence: slot.confidence,
      source_urls: slot.source_urls ?? [],
      deals: (slot.happy_hour_deals ?? []).map((deal) => ({
        label: deal.label,
        category: deal.category,
        price_text: deal.price_text,
      })),
    }))

    return {
      cities: cities ?? [],
      cityTimezone: city.timezone,
      venue: {
        id: venue.id,
        city_id: venue.city_id,
        name: venue.name,
        slug: venue.slug,
        address_line1: venue.address_line1,
        address_line2: venue.address_line2,
        postal_code: venue.postal_code,
        lat: venue.lat,
        lng: venue.lng,
        phone: venue.phone,
        website_url: venue.website_url,
        description: venue.description,
        price_level: venue.price_level,
        data_status: venue.data_status,
        is_published: venue.is_published,
        is_featured: venue.is_featured,
        place_id: venue.place_id,
        venue_type: venue.venue_type,
        last_verified_at: venue.last_verified_at,
        last_scraped_at: venue.last_scraped_at,
        schedule_cadence: venue.schedule_cadence,
      },
      slots,
      events: (eventRows ?? []).map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        event_date: event.event_date,
        day_of_week: event.day_of_week,
        start_time: event.start_time.slice(0, 5),
        end_time: event.end_time ? event.end_time.slice(0, 5) : null,
        is_published: event.is_published,
        confidence: event.confidence,
        source_urls: event.source_urls ?? [],
      })),
    }
  })

export const saveAdminVenueEvents = createServerFn({ method: 'POST' })
  .inputValidator(saveVenueEventsSchema)
  .handler(async ({ data }): Promise<{ saved: number }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, city_id')
      .eq('id', data.venueId)
      .single()

    if (venueError || !venue) {
      throw venueError ?? new Error('Venue not found')
    }

    if (venue.city_id !== data.cityId) {
      throw new Error('Venue does not belong to the selected city')
    }

    const rows = data.events.map((event) => {
      const startTime = toDbTime(event.start_time)
      let endTime: string | null = null
      if (event.end_time?.trim()) {
        endTime = toDbTime(event.end_time)
        if (endTime <= startTime) {
          throw new Error(`End time must be after start for “${event.title}”`)
        }
      }

      const confidence = event.confidence ?? null
      const adminVerified =
        confidence === 'high' || confidence === 'medium'
          ? new Date().toISOString()
          : null

      return {
        id: event.id,
        title: event.title.trim(),
        description: event.description?.trim() || null,
        event_type: event.event_type,
        event_date: event.event_date ?? null,
        day_of_week: event.event_date ? null : (event.day_of_week ?? null),
        start_time: startTime,
        end_time: endTime,
        is_published: event.is_published,
        confidence,
        last_verified_at: adminVerified,
      }
    })

    const keepIds = new Set<string>()

    for (const row of rows) {
      if (row.id) {
        const { error: updateError } = await supabase
          .from('events')
          .update({
            title: row.title,
            description: row.description,
            event_type: row.event_type,
            event_date: row.event_date,
            day_of_week: row.day_of_week,
            start_time: row.start_time,
            end_time: row.end_time,
            is_published: row.is_published,
            confidence: row.confidence,
            ...(row.last_verified_at
              ? { last_verified_at: row.last_verified_at }
              : {}),
          })
          .eq('id', row.id)
          .eq('venue_id', data.venueId)

        if (updateError) {
          throw updateError
        }
        keepIds.add(row.id)
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('events')
          .insert({
            city_id: data.cityId,
            venue_id: data.venueId,
            title: row.title,
            description: row.description,
            event_type: row.event_type,
            event_date: row.event_date,
            day_of_week: row.day_of_week,
            start_time: row.start_time,
            end_time: row.end_time,
            is_published: row.is_published,
            confidence: row.confidence,
            last_verified_at: row.last_verified_at,
          })
          .select('id')
          .single()

        if (insertError || !inserted) {
          throw insertError ?? new Error('Failed to insert event')
        }
        keepIds.add(inserted.id)
      }
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('events')
      .select('id')
      .eq('venue_id', data.venueId)

    if (existingError) {
      throw existingError
    }

    const toDelete = (existingRows ?? [])
      .map((row) => row.id)
      .filter((id) => !keepIds.has(id))

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .in('id', toDelete)

      if (deleteError) {
        throw deleteError
      }
    }

    return { saved: rows.length }
  })

export const getAdminVenueCreateDefaults = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ citySlug: z.string().optional() }))
  .handler(async ({ data }): Promise<AdminVenueEditorData> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, slug, name, state, timezone, center_lat, center_lng')
      .eq('is_active', true)
      .order('name')

    if (citiesError) {
      throw citiesError
    }

    const cityRows = cities ?? []
    const cityList = cityRows.map(({ id, slug, name, state }) => ({ id, slug, name, state }))
    const selected =
      cityRows.find((city) => city.slug === data.citySlug) ?? cityRows[0] ?? null

    return {
      cities: cityList,
      cityTimezone: selected?.timezone ?? 'America/Los_Angeles',
      venue: selected
        ? {
            id: '',
            city_id: selected.id,
            name: '',
            slug: '',
            address_line1: '',
            address_line2: null,
            postal_code: null,
            lat: selected.center_lat,
            lng: selected.center_lng,
            phone: null,
            website_url: null,
            description: null,
            price_level: '$$',
            data_status: 'pending_review',
            is_published: false,
            is_featured: false,
            place_id: null,
            venue_type: null,
            last_verified_at: null,
            last_scraped_at: null,
            schedule_cadence: null,
          }
        : null,
      slots: [],
      events: [],
    }
  })

export const saveAdminVenue = createServerFn({ method: 'POST' })
  .inputValidator(saveVenueSchema)
  .handler(async ({
    data,
  }): Promise<{
    venueId: string
    slug: string
    dataStatus: Database['public']['Enums']['venue_data_status']
    isPublished: boolean
    slotCount: number
    mapVisible: boolean
  }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const { venue, slots } = data
    const websiteUrl = venue.website_url?.trim() ? venue.website_url.trim() : null

    const validationError = validateVenueBeforeSave(
      venue.data_status,
      slots.length,
      venue.is_published,
    )
    if (validationError) {
      throw new Error(validationError)
    }

    const dataStatus = reconcileVenueDataStatus(venue.data_status, slots.length)

    let venueId = venue.id
    let slug = slugifyVenueName(venue.slug || venue.name)

    const venuePayload = {
      city_id: venue.city_id,
      name: venue.name.trim(),
      slug,
      address_line1: venue.address_line1.trim(),
      address_line2: venue.address_line2?.trim() || null,
      postal_code: venue.postal_code?.trim() || null,
      lat: venue.lat,
      lng: venue.lng,
      phone: venue.phone?.trim() || null,
      website_url: websiteUrl,
      description: venue.description?.trim() || null,
      price_level: venue.price_level,
      data_status: dataStatus,
      is_published: venue.is_published,
      is_featured: venue.is_featured ?? false,
      place_id: venue.place_id?.trim() || null,
      venue_type: venue.venue_type ?? null,
      schedule_cadence: venue.schedule_cadence ?? null,
    }

    if (venueId) {
      slug = await resolveUniqueSlug(supabase, venue.city_id, slug, venueId)
      const { error: updateError } = await supabase
        .from('venues')
        .update({ ...venuePayload, slug })
        .eq('id', venueId)

      if (updateError) {
        throw updateError
      }

      await supabase.from('happy_hour_slots').delete().eq('venue_id', venueId)
    } else {
      slug = await resolveUniqueSlug(supabase, venue.city_id, slug)
      const { data: inserted, error: insertError } = await supabase
        .from('venues')
        .insert({ ...venuePayload, slug })
        .select('id, slug')
        .single()

      if (insertError || !inserted) {
        throw insertError ?? new Error('Failed to create venue')
      }

      venueId = inserted.id
      slug = inserted.slug
    }

    for (const slot of slots) {
      const categories: Database['public']['Enums']['deal_category'][] = []
      const deals = slot.deals ?? []
      for (const deal of deals) {
        if (!categories.includes(deal.category)) {
          categories.push(deal.category)
        }
      }
      if (categories.length === 0) {
        categories.push('other')
      }

      const slotActive = slot.is_active ?? true
      const slotStatus =
        dataStatus === 'live' && slotActive
          ? 'live'
          : (slot.data_status ?? 'pending_review')

      const { data: slotRow, error: slotError } = await supabase
        .from('happy_hour_slots')
        .insert({
          venue_id: venueId,
          day_of_week: slot.day_of_week,
          start_time: toDbTime(slot.start_time),
          end_time: toDbTime(slot.end_time),
          deal_summary: slot.deal_summary?.trim() || null,
          data_status: slotStatus,
          is_active: slot.is_active ?? true,
          categories,
          source_urls: slot.source_urls ?? [],
          confidence: slot.confidence ?? null,
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

    const activeSlotCount = slots.filter((slot) => slot.is_active ?? true).length
    const mapVisible =
      dataStatus === 'live' && venue.is_published && activeSlotCount > 0

    return {
      venueId,
      slug,
      dataStatus,
      isPublished: venue.is_published,
      slotCount: slots.length,
      mapVisible,
    }
  })

export const pasteAdminVenueHappyHours = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      mode: z.enum(['append', 'replace']).optional().default('append'),
      slots: z.array(parsedHappyHourSlotSchema).optional(),
      pasteText: z.string().min(1).optional(),
    }),
  )
  .handler(async ({
    data,
  }): Promise<{
    slotCount: number
    addedCount: number
    warnings: string[]
    parser: 'rules' | 'ai'
  }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    let parsed: Awaited<ReturnType<typeof parseHappyHourPasteSmart>>
    if (data.slots && data.slots.length > 0) {
      parsed = {
        slots: data.slots.map((slot) => ({
          ...slot,
          days: slot.days as DayOfWeek[],
        })),
        warnings: [],
        unparsedBlocks: [],
        parser: 'rules',
      }
    } else if (data.pasteText?.trim()) {
      parsed = await parseHappyHourPasteSmart(data.pasteText)
    } else {
      throw new Error('Provide pasted slots or paste text.')
    }

    if (parsed.slots.length === 0) {
      throw new Error(parsed.warnings[0] ?? 'No happy hour slots found in paste.')
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

    if (data.mode === 'replace') {
      const { error: deleteError } = await supabase
        .from('happy_hour_slots')
        .delete()
        .eq('venue_id', data.venueId)

      if (deleteError) {
        throw deleteError
      }
    }

    let addedCount = 0

    for (const slot of parsed.slots) {
      for (const day of slot.days) {
        const { error: slotError } = await supabase.from('happy_hour_slots').insert({
          venue_id: data.venueId,
          day_of_week: day,
          start_time: toDbTime(slot.start_time),
          end_time: toDbTime(slot.end_time),
          deal_summary: slot.deal_summary?.trim() || null,
          data_status: 'pending_review',
          is_active: true,
          categories: ['other'],
          source_urls: [],
          confidence: null,
        })

        if (slotError) {
          throw slotError
        }

        addedCount += 1
      }
    }

    const { count: slotCount, error: countError } = await supabase
      .from('happy_hour_slots')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', data.venueId)
      .eq('is_active', true)

    if (countError) {
      throw countError
    }

    const activeSlotCount = slotCount ?? 0
    const dataStatus = reconcileVenueDataStatus(venue.data_status, activeSlotCount)
    const validationError = validateVenueBeforeSave(
      dataStatus,
      activeSlotCount,
      venue.is_published,
    )
    if (validationError) {
      throw new Error(validationError)
    }

    if (dataStatus !== venue.data_status) {
      const { error: statusError } = await supabase
        .from('venues')
        .update({ data_status: dataStatus })
        .eq('id', data.venueId)

      if (statusError) {
        throw statusError
      }
    }

    return {
      slotCount: activeSlotCount,
      addedCount,
      warnings: parsed.warnings,
      parser: parsed.parser,
    }
  })

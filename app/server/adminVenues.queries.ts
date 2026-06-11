import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requireAdmin } from '@/lib/adminAuth.server'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { collectUniqueUrls } from '@/utils/urlDisplay'
import { rollupSlotConfidence } from '@/utils/venueTrust'
import { classifyPendingVenueUpdate } from '@/utils/adminPendingUpdates/adminPendingUpdates'

import { toAuthError } from '@/server/adminVenues.shared'
import type {
  AdminPendingUpdatesDashboard,
  AdminPendingVenueUpdate,
  AdminVenueEditorData,
  AdminVenueEditorSlot,
  AdminVenueListItem,
  HoursOfOperationEntry,
} from '@/server/adminVenues.types'

export type {
  AdminPendingUpdatesDashboard,
  AdminPendingVenueUpdate,
  AdminVenueEditorData,
  AdminVenueEditorEvent,
  AdminVenueEditorSlot,
  AdminVenueListItem,
} from '@/server/adminVenues.types'

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
      /** When true, only venues with data_status = live and is_published = false. */
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
        last_verified_at,
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
      query = query.eq('data_status', 'live').eq('is_published', false)
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
        last_verified_at: row.last_verified_at,
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

export const listPendingVenueUpdates = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      citySlug: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
  )
  .handler(async ({ data }): Promise<AdminPendingUpdatesDashboard> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const supabase = createSupabaseServiceClient()
    const limit = data.limit ?? 25

    let query = supabase
      .from('venues')
      .select(
        `
        id,
        name,
        slug,
        address_line1,
        data_status,
        updated_at,
        cities!inner ( slug, name ),
        happy_hour_slots ( data_status, is_active, updated_at )
      `,
      )
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
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
        return { managerUpdates: [], staffReview: [] }
      }
      query = query.eq('city_id', city.id)
    }

    const [{ data: rows, error }, { data: managerRows, error: managerError }] = await Promise.all([
      query,
      supabase.from('venue_managers').select('venue_id'),
    ])

    if (error) {
      throw error
    }
    if (managerError) {
      throw managerError
    }

    const managerVenueIds = new Set((managerRows ?? []).map((row) => row.venue_id))

    const pending = (rows ?? [])
      .map((row) => {
        const city = row.cities as { slug: string; name: string }
        const slots = (row.happy_hour_slots ?? []).filter((slot) => slot.is_active !== false)
        const pendingSlots = slots.filter((slot) => slot.data_status === 'pending_review')
        const pending_slot_count = pendingSlots.length
        const needsReview =
          row.data_status === 'pending_review' ||
          row.data_status === 'discovered' ||
          row.data_status === 'no_happy_hour_found' ||
          row.data_status === 'flagged' ||
          pending_slot_count > 0

        if (!needsReview) {
          return null
        }

        const hasManager = managerVenueIds.has(row.id)
        const slotUpdatedAt = pendingSlots.reduce<string | null>((latest, slot) => {
          if (!slot.updated_at) {
            return latest
          }
          if (!latest || slot.updated_at > latest) {
            return slot.updated_at
          }
          return latest
        }, null)
        const updated_at =
          [row.updated_at, slotUpdatedAt].filter(Boolean).sort().reverse()[0] ?? row.updated_at

        const source = classifyPendingVenueUpdate(
          hasManager,
          pending_slot_count,
          row.data_status,
        )

        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          address_line1: row.address_line1,
          data_status: row.data_status,
          city_slug: city.slug,
          city_name: city.name,
          pending_slot_count,
          updated_at,
          source,
        }
      })
      .filter((row): row is AdminPendingVenueUpdate => row !== null)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))

    const managerUpdates = pending.filter((row) => row.source === 'manager').slice(0, limit)
    const staffReview = pending.filter((row) => row.source === 'staff').slice(0, limit)

    return { managerUpdates, staffReview }
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
        'id, title, description, event_type, event_date, day_of_week, start_time, end_time, is_published, confidence, source_urls, community_verified_at',
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
        admin_notes: venue.admin_notes ?? null,
        price_level: venue.price_level,
        data_status: venue.data_status,
        is_published: venue.is_published,
        is_featured: venue.is_featured,
        place_id: venue.place_id,
        venue_types: venue.venue_types,
        vibes: venue.vibes,
        last_verified_at: venue.last_verified_at,
        community_verified_at: venue.community_verified_at,
        last_scraped_at: venue.last_scraped_at,
        schedule_cadence: venue.schedule_cadence,
        image_url: venue.image_url,
        hours_of_operation: (venue.hours_of_operation as HoursOfOperationEntry[] | null) ?? null,
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
        community_verified_at: event.community_verified_at ?? null,
      })),
    }
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
            venue_types: [],
            vibes: [],
            last_verified_at: null,
            last_scraped_at: null,
            schedule_cadence: null,
            image_url: null,
          }
        : null,
      slots: [],
      events: [],
    }
  })

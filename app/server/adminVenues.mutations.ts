import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requireAdmin } from '@/lib/adminAuth.server'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import { slugifyVenueName } from '@/utils/slug'
import { reconcileVenueDataStatus, validateVenueBeforeSave } from '@/utils/venueDataStatus'
import { parsedHappyHourSlotSchema } from '@/server/adminHappyHourPaste'
import { parseHappyHourPasteSmart } from '@/lib/scrape/parseHappyHourWithAnthropic'
import type { DayOfWeek } from '@/types/venue'
import type { Database } from '@/types/database'

import {
  resolveUniqueSlug,
  saveVenueEventsSchema,
  saveVenueSchema,
  toAuthError,
  toDbTime,
} from '@/server/adminVenues.shared'

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
        source_urls: event.source_urls ?? [],
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
            source_urls: row.source_urls,
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
            source_urls: row.source_urls,
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

    let eventCount = 0
    if (venue.id) {
      const { count, error: eventCountError } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venue.id)

      if (eventCountError) {
        throw eventCountError
      }

      eventCount = count ?? 0
    }

    const validationError = validateVenueBeforeSave(
      venue.data_status,
      slots.length,
      venue.is_published,
      eventCount,
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
      admin_notes: venue.admin_notes?.trim() || null,
      price_level: venue.price_level,
      data_status: dataStatus,
      is_published: venue.is_published,
      is_featured: venue.is_featured ?? false,
      place_id: venue.place_id?.trim() || null,
      venue_types: venue.venue_types ?? [],
      vibes: venue.vibes ?? [],
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

    const { count: eventCount, error: eventCountError } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', data.venueId)

    if (eventCountError) {
      throw eventCountError
    }

    const dataStatus = reconcileVenueDataStatus(venue.data_status, activeSlotCount)
    const validationError = validateVenueBeforeSave(
      dataStatus,
      activeSlotCount,
      venue.is_published,
      eventCount ?? 0,
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

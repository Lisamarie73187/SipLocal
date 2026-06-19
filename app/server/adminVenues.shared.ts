import { z } from 'zod'

import { AdminAuthError } from '@/lib/adminAuth.server'
import { createSupabaseServiceClient } from '@/lib/supabaseService'

export function toAuthError(error: unknown): Error {
  if (error instanceof AdminAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

export const timeSchema = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use HH:MM or HH:MM:SS')

export function toDbTime(value: string): string {
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
  // "00:00" from a time picker means midnight (end of day); store as 23:59 to satisfy start_time < end_time.
  end_time: timeSchema.transform((val) => (val === '00:00' || val === '00:00:00' ? '23:59' : val)),
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
  admin_notes: z.string().nullable().optional(),
  image_url: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
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
  venue_types: z
    .array(
      z.enum([
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
      ]),
    )
    .optional(),
  vibes: z
    .array(
      z.enum([
        'upscale',
        'rooftop',
        'patio',
        'sports_viewing',
        'group_friendly',
        'family_friendly',
        'dog_friendly',
      ]),
    )
    .optional(),
  hours_of_operation: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        open: timeSchema,
        close: timeSchema,
      }),
    )
    .nullable()
    .optional(),
})

export const saveVenueSchema = z.object({
  venue: venueInputSchema,
  slots: z.array(slotInputSchema),
})

const eventInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(500).nullable().optional(),
    event_type: z.enum([
      'trivia',
      'live_music',
      'special',
      'other',
      'game_night',
      'comedy',
      'sports',
      'nightlife',
    ]),
    event_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: timeSchema,
    end_time: timeSchema.optional(),
    is_published: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']).nullable().optional(),
    source_urls: z.array(z.string().url()).optional(),
  })
  .refine((event) => Boolean(event.event_date) || event.day_of_week != null, {
    message: 'Event needs a date or day of week',
  })

export const saveVenueEventsSchema = z.object({
  venueId: z.string().uuid(),
  cityId: z.string().uuid(),
  events: z.array(eventInputSchema),
})

export async function resolveUniqueSlug(
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

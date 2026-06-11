import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import { createSignedMenuPhotoUrl, deleteMenuPhotoFromStorage, uploadMenuPhotoToStorage } from '@/lib/menuPhotoStorage'
import { OwnerAuthError, requireAuthenticatedUser, requireVenueManager } from '@/lib/ownerAuth.server'
import { parseHappyHourFromMenuImage } from '@/lib/scrape/parseHappyHourWithAnthropic'
import { createSupabaseServiceClient } from '@/lib/supabaseService'
import type { Database } from '@/types/database'
import type { DayOfWeek } from '@/types/venue'
import { toDbTime } from '@/utils/happyHourSlotInput'
import { validateMenuPhotoPayload, type MenuPhotoMediaType, mediaTypeFromStoragePath } from '@/utils/menuPhotoFile'
import {
  submitterLocationDbFields,
  submitterLocationInputSchema,
  type SubmitterLocationInput,
} from '@/utils/submitterLocation'
import type { ParseHappyHourPasteResult, ParsedHappyHourSlot } from '@/utils/parseHappyHourPaste'
import { finalizeParsedSlotDeals, inferDealCategory } from '@/utils/ownerDealRows'
import { reconcileVenueDataStatus } from '@/utils/venueDataStatus'

export interface ApplyParsedSlotsResult {
  slotsTouched: number
  dealsAdded: number
  slotsCreated: number
}

type ExistingVenueSlot = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  deal_summary: string | null
  happy_hour_deals: Array<{
    label: string
    price_text: string | null
    category: Database['public']['Enums']['deal_category']
  }>
}

function normalizeDealKey(label: string, priceText: string | null): string {
  return `${label.trim().toLowerCase()}|${(priceText ?? '').trim().toLowerCase()}`
}

function findParsedSlotForExisting(
  existing: ExistingVenueSlot,
  parsedSlots: ParsedHappyHourSlot[],
): ParsedHappyHourSlot | null {
  const day = existing.day_of_week as DayOfWeek
  const start = toDbTime(existing.start_time.slice(0, 5))
  const end = toDbTime(existing.end_time.slice(0, 5))

  const exact = parsedSlots.find(
    (parsed) =>
      parsed.days.includes(day) &&
      toDbTime(parsed.start_time) === start &&
      toDbTime(parsed.end_time) === end,
  )
  if (exact) {
    return exact
  }

  const hasDeals = existing.happy_hour_deals.some((deal) => deal.label.trim())
  if (hasDeals) {
    return null
  }

  return parsedSlots.find((parsed) => parsed.days.includes(day)) ?? null
}

async function appendDealsToExistingSlot(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  existing: ExistingVenueSlot,
  parsedSlot: ParsedHappyHourSlot,
): Promise<number> {
  const { deals: parsedDeals } = finalizeParsedSlotDeals(parsedSlot.deals, parsedSlot.deal_summary)
  const incoming = (parsedDeals ?? []).filter((deal) => deal.label.trim())
  if (incoming.length === 0) {
    return 0
  }

  const existingKeys = new Set(
    existing.happy_hour_deals.map((deal) =>
      normalizeDealKey(deal.label, deal.price_text),
    ),
  )
  const newDeals = incoming.filter(
    (deal) => !existingKeys.has(normalizeDealKey(deal.label, deal.price_text?.trim() ?? null)),
  )

  if (newDeals.length === 0) {
    return 0
  }

  const { data: lastDeal } = await supabase
    .from('happy_hour_deals')
    .select('sort_order')
    .eq('slot_id', existing.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sortOrder = (lastDeal?.sort_order ?? -1) + 1

  const categories = new Set(existing.happy_hour_deals.map((deal) => deal.category))
  for (const deal of newDeals) {
    categories.add(deal.category ?? inferDealCategory(deal.label))
  }

  const { error: dealsError } = await supabase.from('happy_hour_deals').insert(
    newDeals.map((deal) => ({
      slot_id: existing.id,
      label: deal.label.trim(),
      category: deal.category ?? inferDealCategory(deal.label),
      price_text: deal.price_text?.trim() || null,
      sort_order: sortOrder++,
    })),
  )

  if (dealsError) {
    throw dealsError
  }

  const { error: slotError } = await supabase
    .from('happy_hour_slots')
    .update({
      categories: [...categories],
      deal_summary: null,
      data_status: 'pending_review',
    })
    .eq('id', existing.id)

  if (slotError) {
    throw slotError
  }

  return newDeals.length
}

async function insertParsedSlotDay(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  venueId: string,
  parsedSlot: ParsedHappyHourSlot,
  day: DayOfWeek,
): Promise<number> {
  const { deals: parsedDeals } = finalizeParsedSlotDeals(parsedSlot.deals, parsedSlot.deal_summary)
  const deals = (parsedDeals ?? []).filter((deal) => deal.label.trim())
  const categories: Database['public']['Enums']['deal_category'][] = []
  for (const deal of deals) {
    const category = deal.category ?? inferDealCategory(deal.label)
    if (!categories.includes(category)) {
      categories.push(category)
    }
  }
  if (categories.length === 0) {
    categories.push('other')
  }

  const { data: slotRow, error: slotError } = await supabase
    .from('happy_hour_slots')
    .insert({
      venue_id: venueId,
      day_of_week: day,
      start_time: toDbTime(parsedSlot.start_time),
      end_time: toDbTime(parsedSlot.end_time),
      deal_summary: deals.length > 0 ? null : parsedSlot.deal_summary?.trim() || null,
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
        category: deal.category ?? inferDealCategory(deal.label),
        price_text: deal.price_text?.trim() || null,
        sort_order: index,
      })),
    )

    if (dealsError) {
      throw dealsError
    }
  }

  return deals.length
}

const menuPhotoInputSchema = z.object({
  venueId: z.string().uuid(),
  imageBase64: z.string().min(1),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  submitterLocation: submitterLocationInputSchema.optional(),
})

function toOwnerError(error: unknown): Error {
  if (error instanceof OwnerAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

function toAdminError(error: unknown): Error {
  if (error instanceof AdminAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

function parseMenuPhotoInput(data: z.infer<typeof menuPhotoInputSchema>): {
  venueId: string
  imageBase64: string
  mediaType: MenuPhotoMediaType
  submitterLocation?: SubmitterLocationInput
} {
  const payload = {
    imageBase64: data.imageBase64,
    mediaType: data.mediaType,
  }
  validateMenuPhotoPayload(payload)
  return {
    venueId: data.venueId,
    ...payload,
    submitterLocation: data.submitterLocation,
  }
}

async function assertPublishedVenue(venueId: string): Promise<void> {
  const supabase = createSupabaseServiceClient()
  const { data: venue, error } = await supabase
    .from('venues')
    .select('id, is_published')
    .eq('id', venueId)
    .single()

  if (error || !venue) {
    throw error ?? new Error('Venue not found')
  }

  if (!venue.is_published) {
    throw new Error('This venue is not available for menu submissions.')
  }
}

export async function applyParsedHappyHourSlotsToVenue(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  venueId: string,
  parsedSlots: ParsedHappyHourSlot[],
  mode: 'append' | 'replace',
): Promise<ApplyParsedSlotsResult> {
  if (parsedSlots.length === 0) {
    throw new Error('No happy hour slots to apply.')
  }

  if (mode === 'replace') {
    const { error: deleteError } = await supabase
      .from('happy_hour_slots')
      .delete()
      .eq('venue_id', venueId)

    if (deleteError) {
      throw deleteError
    }
  }

  let slotsTouched = 0
  let dealsAdded = 0
  let slotsCreated = 0

  const { data: existingRows, error: existingError } = await supabase
    .from('happy_hour_slots')
    .select(
      `
      id,
      day_of_week,
      start_time,
      end_time,
      deal_summary,
      happy_hour_deals ( label, price_text, category )
    `,
    )
    .eq('venue_id', venueId)
    .eq('is_active', true)

  if (existingError) {
    throw existingError
  }

  const existingSlots = (existingRows ?? []) as ExistingVenueSlot[]

  if (mode === 'append' && existingSlots.length > 0) {
    for (const existing of existingSlots) {
      const parsedMatch = findParsedSlotForExisting(existing, parsedSlots)
      if (!parsedMatch) {
        continue
      }

      const added = await appendDealsToExistingSlot(supabase, existing, parsedMatch)
      if (added > 0) {
        slotsTouched += 1
        dealsAdded += added
      }
    }
  } else {
    for (const parsedSlot of parsedSlots) {
      for (const day of parsedSlot.days) {
        const createdDeals = await insertParsedSlotDay(supabase, venueId, parsedSlot, day)
        slotsCreated += 1
        slotsTouched += 1
        dealsAdded += createdDeals
      }
    }
  }

  const { count: slotCount, error: countError } = await supabase
    .from('happy_hour_slots')
    .select('id', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .eq('is_active', true)

  if (countError) {
    throw countError
  }

  await supabase
    .from('venues')
    .update({ data_status: reconcileVenueDataStatus('pending_review', slotCount ?? 0) })
    .eq('id', venueId)

  return { slotsTouched, dealsAdded, slotsCreated }
}

async function createMenuPhotoSubmission(params: {
  venueId: string
  userId: string
  source: Database['public']['Enums']['menu_submission_source']
  imageBase64: string
  mediaType: MenuPhotoMediaType
  parsed?: ParseHappyHourPasteResult | null
  submitterLocation?: SubmitterLocationInput
}): Promise<{ submissionId: string }> {
  const supabase = createSupabaseServiceClient()
  const submissionId = crypto.randomUUID()

  const storagePath = await uploadMenuPhotoToStorage(supabase, {
    venueId: params.venueId,
    submissionId,
    imageBase64: params.imageBase64,
    mediaType: params.mediaType,
  })

  const { error } = await supabase.from('venue_menu_submissions').insert({
    id: submissionId,
    venue_id: params.venueId,
    user_id: params.userId,
    storage_path: storagePath,
    source: params.source,
    status: 'pending_review',
    parsed_slots: params.parsed
      ? {
          slots: params.parsed.slots,
          warnings: params.parsed.warnings,
        }
      : null,
    ...submitterLocationDbFields(params.submitterLocation),
  })

  if (error) {
    throw error
  }

  return { submissionId }
}

export const parseHappyHourMenuPhotoOwner = createServerFn({ method: 'POST' })
  .inputValidator(menuPhotoInputSchema)
  .handler(async ({
    data,
  }): Promise<ParseHappyHourPasteResult & { parser: 'ai' }> => {
    try {
      await requireVenueManager(data.venueId)
      const input = parseMenuPhotoInput(data)
      const parsed = await parseHappyHourFromMenuImage(input.imageBase64, input.mediaType)
      return { ...parsed, parser: 'ai' }
    } catch (error) {
      throw toOwnerError(error)
    }
  })

export const parseHappyHourMenuPhotoAdmin = createServerFn({ method: 'POST' })
  .inputValidator(menuPhotoInputSchema)
  .handler(async ({
    data,
  }): Promise<ParseHappyHourPasteResult & { parser: 'ai' }> => {
    try {
      await requireAdmin()
      const input = parseMenuPhotoInput(data)
      const parsed = await parseHappyHourFromMenuImage(input.imageBase64, input.mediaType)
      return { ...parsed, parser: 'ai' }
    } catch (error) {
      throw toAdminError(error)
    }
  })

export const parseHappyHourMenuPhotoCrowd = createServerFn({ method: 'POST' })
  .inputValidator(menuPhotoInputSchema)
  .handler(async ({
    data,
  }): Promise<ParseHappyHourPasteResult & { parser: 'ai' }> => {
    try {
      await requireAuthenticatedUser()
      await assertPublishedVenue(data.venueId)
      const input = parseMenuPhotoInput(data)
      const parsed = await parseHappyHourFromMenuImage(input.imageBase64, input.mediaType)
      return { ...parsed, parser: 'ai' }
    } catch (error) {
      throw toOwnerError(error)
    }
  })

export const submitCrowdMenuPhoto = createServerFn({ method: 'POST' })
  .inputValidator(menuPhotoInputSchema)
  .handler(async ({ data }): Promise<{ submissionId: string; message: string }> => {
    try {
      const { userId } = await requireAuthenticatedUser()
      await assertPublishedVenue(data.venueId)
      const input = parseMenuPhotoInput(data)

      const { submissionId } = await createMenuPhotoSubmission({
        venueId: input.venueId,
        userId,
        source: 'crowd',
        imageBase64: input.imageBase64,
        mediaType: input.mediaType,
        submitterLocation: input.submitterLocation,
      })

      return {
        submissionId,
        message:
          "Nice catch! Consider yourself a certified Happy Hour Fact Checker. We'll review your update shortly.",
      }
    } catch (error) {
      throw toOwnerError(error)
    }
  })

export const recordManagerMenuPhoto = createServerFn({ method: 'POST' })
  .inputValidator(menuPhotoInputSchema)
  .handler(async ({ data }): Promise<{ submissionId: string }> => {
    try {
      const { userId } = await requireVenueManager(data.venueId)
      const input = parseMenuPhotoInput(data)

      return createMenuPhotoSubmission({
        venueId: input.venueId,
        userId,
        source: 'manager',
        imageBase64: input.imageBase64,
        mediaType: input.mediaType,
      })
    } catch (error) {
      throw toOwnerError(error)
    }
  })

export interface AdminMenuSubmissionListItem {
  id: string
  venue_id: string
  user_id: string
  user_email: string | null
  source: Database['public']['Enums']['menu_submission_source']
  status: Database['public']['Enums']['menu_submission_status']
  photo_url: string
  parsed_slots: ParseHappyHourPasteResult | null
  submitter_lat: number | null
  submitter_lng: number | null
  created_at: string
}

export interface AdminCustomerMenuSubmissionItem extends AdminMenuSubmissionListItem {
  venue_name: string
  venue_slug: string
  address_line1: string
}

function parseStoredParsedSlots(value: unknown): ParseHappyHourPasteResult | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as { slots?: ParsedHappyHourSlot[]; warnings?: string[] }
  if (!Array.isArray(record.slots)) {
    return null
  }

  return {
    slots: record.slots,
    warnings: record.warnings ?? [],
    unparsedBlocks: [],
  }
}

export const listVenueMenuSubmissionsForAdmin = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      status: z.enum(['pending_review', 'approved', 'rejected', 'all']).optional(),
    }),
  )
  .handler(async ({ data }): Promise<AdminMenuSubmissionListItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()
    let query = supabase
      .from('venue_menu_submissions')
      .select(
        'id, venue_id, user_id, source, status, storage_path, parsed_slots, submitter_lat, submitter_lng, created_at',
      )
      .eq('venue_id', data.venueId)
      .order('created_at', { ascending: false })

    if (data.status && data.status !== 'all') {
      query = query.eq('status', data.status)
    }

    const { data: rows, error } = await query

    if (error) {
      throw error
    }

    const items: AdminMenuSubmissionListItem[] = []

    for (const row of rows ?? []) {
      const { data: userData } = await supabase.auth.admin.getUserById(row.user_id)
      const photoUrl = await createSignedMenuPhotoUrl(supabase, row.storage_path)
      items.push({
        id: row.id,
        venue_id: row.venue_id,
        user_id: row.user_id,
        user_email: userData.user?.email ?? null,
        source: row.source,
        status: row.status,
        photo_url: photoUrl,
        parsed_slots: parseStoredParsedSlots(row.parsed_slots),
        submitter_lat: row.submitter_lat,
        submitter_lng: row.submitter_lng,
        created_at: row.created_at,
      })
    }

    return items
  })

async function mapMenuSubmissionRows(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  rows: Array<{
    id: string
    venue_id: string
    user_id: string
    source: Database['public']['Enums']['menu_submission_source']
    status: Database['public']['Enums']['menu_submission_status']
    storage_path: string
    parsed_slots: unknown
    submitter_lat: number | null
    submitter_lng: number | null
    created_at: string
    venues?: { name: string; slug: string; address_line1: string } | Array<{
      name: string
      slug: string
      address_line1: string
    }>
  }>,
): Promise<AdminCustomerMenuSubmissionItem[]> {
  const items: AdminCustomerMenuSubmissionItem[] = []

  for (const row of rows) {
    const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues
    if (!venue) {
      continue
    }

    const { data: userData } = await supabase.auth.admin.getUserById(row.user_id)
    const photoUrl = await createSignedMenuPhotoUrl(supabase, row.storage_path)
    items.push({
      id: row.id,
      venue_id: row.venue_id,
      user_id: row.user_id,
      user_email: userData.user?.email ?? null,
      source: row.source,
      status: row.status,
      photo_url: photoUrl,
      parsed_slots: parseStoredParsedSlots(row.parsed_slots),
      submitter_lat: row.submitter_lat,
      submitter_lng: row.submitter_lng,
      created_at: row.created_at,
      venue_name: venue.name,
      venue_slug: venue.slug,
      address_line1: venue.address_line1,
    })
  }

  return items
}

export const listPendingCustomerMenuSubmissions = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      citySlug: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
  )
  .handler(async ({ data }): Promise<AdminCustomerMenuSubmissionItem[]> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()
    const limit = data.limit ?? 20

    let query = supabase
      .from('venue_menu_submissions')
      .select(
        `
        id,
        venue_id,
        user_id,
        source,
        status,
        storage_path,
        parsed_slots,
        submitter_lat,
        submitter_lng,
        created_at,
        venues!inner (
          name,
          slug,
          address_line1,
          city_id
        )
      `,
      )
      .eq('status', 'pending_review')
      .eq('source', 'crowd')
      .order('created_at', { ascending: false })
      .limit(limit)

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

      query = query.eq('venues.city_id', city.id)
    }

    const { data: rows, error } = await query

    if (error) {
      throw error
    }

    return mapMenuSubmissionRows(supabase, rows ?? [])
  })

export const approveVenueMenuSubmission = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      submissionId: z.string().uuid(),
      mode: z.enum(['append', 'replace']).optional().default('append'),
      communityVerified: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data }): Promise<{ slotCount: number; message: string }> => {
    let adminId: string
    try {
      ;({ userId: adminId } = await requireAdmin())
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: submission, error: loadError } = await supabase
      .from('venue_menu_submissions')
      .select('id, venue_id, status, storage_path, parsed_slots')
      .eq('id', data.submissionId)
      .single()

    if (loadError || !submission) {
      throw loadError ?? new Error('Submission not found')
    }

    if (submission.status !== 'pending_review') {
      throw new Error('This submission was already reviewed.')
    }

    const parsed = parseStoredParsedSlots(submission.parsed_slots)
    const hasParsedSlots = parsed != null && parsed.slots.length > 0

    let slotsTouched = 0
    let dealsAdded = 0

    if (hasParsedSlots) {
      const result = await applyParsedHappyHourSlotsToVenue(
        supabase,
        submission.venue_id,
        parsed.slots,
        data.mode,
      )
      slotsTouched = result.slotsTouched
      dealsAdded = result.dealsAdded
    }

    const { error: updateError } = await supabase
      .from('venue_menu_submissions')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submission.id)

    if (updateError) {
      throw updateError
    }

    const { error: venueVerifiedError } = await supabase
      .from('venues')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('id', submission.venue_id)

    if (venueVerifiedError) {
      throw venueVerifiedError
    }

    const { count: existingImageCount, error: countError } = await supabase
      .from('venue_menu_images')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', submission.venue_id)

    if (countError) {
      throw countError
    }

    const { error: venueMenuError } = await supabase.from('venue_menu_images').insert({
      venue_id: submission.venue_id,
      storage_path: submission.storage_path,
      position: existingImageCount ?? 0,
    })

    if (venueMenuError) {
      throw venueMenuError
    }

    if (data.communityVerified) {
      const { error: communityError } = await supabase
        .from('venues')
        .update({ community_verified_at: new Date().toISOString() })
        .eq('id', submission.venue_id)

      if (communityError) {
        throw communityError
      }
    }

    const communityNote = data.communityVerified ? ' Marked as community verified.' : ''

    const message = hasParsedSlots
      ? dealsAdded > 0
        ? `Approved menu photo — added ${dealsAdded} special${dealsAdded === 1 ? '' : 's'} to ${slotsTouched} existing slot${slotsTouched === 1 ? '' : 's'}.${communityNote}`
        : `Approved menu photo — no new specials were added (they may already be on the venue).${communityNote}`
      : `Approved menu photo — enter happy hour details in the venue editor using the image as reference.${communityNote}`

    return {
      slotCount: slotsTouched,
      message,
    }
  })

export const rejectVenueMenuSubmission = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ submissionId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ message: string }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: submission, error: loadError } = await supabase
      .from('venue_menu_submissions')
      .select('id, venue_id, storage_path')
      .eq('id', data.submissionId)
      .eq('status', 'pending_review')
      .single()

    if (loadError || !submission) {
      throw loadError ?? new Error('Submission not found or already reviewed.')
    }

    await deleteMenuPhotoFromStorage(supabase, submission.storage_path)

    const { error: deleteError } = await supabase
      .from('venue_menu_submissions')
      .delete()
      .eq('id', submission.id)

    if (deleteError) {
      throw deleteError
    }

    return { message: 'Menu photo submission rejected and removed.' }
  })

export const reparseVenueMenuSubmission = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ submissionId: z.string().uuid() }))
  .handler(async ({
    data,
  }): Promise<{ message: string; dealCount: number }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAdminError(error)
    }

    const supabase = createSupabaseServiceClient()

    const { data: submission, error: loadError } = await supabase
      .from('venue_menu_submissions')
      .select('id, storage_path, status')
      .eq('id', data.submissionId)
      .single()

    if (loadError || !submission) {
      throw loadError ?? new Error('Submission not found')
    }

    if (submission.status !== 'pending_review') {
      throw new Error('Only pending submissions can be parsed.')
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('menu-photos')
      .download(submission.storage_path)

    if (downloadError || !fileData) {
      throw downloadError ?? new Error('Could not load menu photo.')
    }

    const mediaType = mediaTypeFromStoragePath(submission.storage_path)
    const imageBase64 = Buffer.from(await fileData.arrayBuffer()).toString('base64')
    const parsed = await parseHappyHourFromMenuImage(imageBase64, mediaType)

    const { error: updateError } = await supabase
      .from('venue_menu_submissions')
      .update({
        parsed_slots: {
          slots: parsed.slots,
          warnings: parsed.warnings,
        },
      })
      .eq('id', submission.id)

    if (updateError) {
      throw updateError
    }

    const dealCount = parsed.slots.reduce(
      (total, slot) => total + (slot.deals?.length ?? 0),
      0,
    )

    return {
      dealCount,
      message:
        dealCount > 0
          ? `Parsed menu photo — found ${dealCount} special${dealCount === 1 ? '' : 's'}.`
          : 'Parsed menu photo — no priced specials found. Check the image or enter deals manually.',
    }
  })

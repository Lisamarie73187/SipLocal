import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { OwnerAuthError, requireAuthenticatedUser } from '@/lib/ownerAuth.server'
import { createSupabaseRequestClient } from '@/lib/supabaseRequest'
import type { Database } from '@/types/database'

export interface ProfileCityOption {
  id: string
  slug: string
  name: string
  state: string
}

export interface UserProfileData {
  displayName: string
  preferredCityId: string | null
  preferredCitySlug: string | null
  preferredCityName: string | null
  visitorType: Database['public']['Enums']['profile_visitor_type'] | null
  dateOfBirth: string | null
  gender: Database['public']['Enums']['profile_gender'] | null
  neighborhoodOrZip: string | null
  notifications: {
    favoriteUpdates: boolean
    startingSoon: boolean
    newVenuesInCity: boolean
  }
  cities: ProfileCityOption[]
}

const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.')
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null))

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  preferredCityId: z.string().uuid(),
  visitorType: z.enum(['local', 'visiting']).nullable(),
  dateOfBirth: dateOfBirthSchema,
  gender: z
    .enum(['woman', 'man', 'non_binary', 'prefer_not_to_say'])
    .nullable()
    .optional(),
  neighborhoodOrZip: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  notifications: z.object({
    favoriteUpdates: z.boolean(),
    startingSoon: z.boolean(),
    newVenuesInCity: z.boolean(),
  }),
})

function toProfileError(error: unknown): Error {
  if (error instanceof OwnerAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

function assertValidDateOfBirth(dateOfBirth: string | null): void {
  if (!dateOfBirth) {
    return
  }

  const parsed = new Date(`${dateOfBirth}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Use a valid date of birth.')
  }

  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (parsed > today) {
    throw new Error('Date of birth cannot be in the future.')
  }
}

async function loadActiveCities(
  supabase: ReturnType<typeof createSupabaseRequestClient>,
): Promise<ProfileCityOption[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('id, slug, name, state')
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw error
  }

  return data ?? []
}

export const completeProfileOnboarding = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      visitorType: z.enum(['local', 'visiting']),
    }),
  )
  .handler(async ({ data }): Promise<{ message: string }> => {
    try {
      const { userId } = await requireAuthenticatedUser()
      const supabase = createSupabaseRequestClient()

      const { error } = await supabase
        .from('profiles')
        .update({ visitor_type: data.visitorType })
        .eq('id', userId)

      if (error) {
        throw error
      }

      return { message: 'Welcome aboard!' }
    } catch (error) {
      throw toProfileError(error)
    }
  })

export const getUserProfile = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UserProfileData> => {
    try {
      const { userId } = await requireAuthenticatedUser()
      const supabase = createSupabaseRequestClient()

      const [profileResult, cities] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            `
            display_name,
            preferred_city_id,
            visitor_type,
            date_of_birth,
            gender,
            neighborhood_or_zip,
            notify_favorite_updates,
            notify_starting_soon,
            notify_new_venues_in_city,
            cities:preferred_city_id ( slug, name )
          `,
          )
          .eq('id', userId)
          .single(),
        loadActiveCities(supabase),
      ])

      if (profileResult.error || !profileResult.data) {
        throw profileResult.error ?? new Error('Profile not found.')
      }

      const profile = profileResult.data
      const city = Array.isArray(profile.cities) ? profile.cities[0] : profile.cities

      return {
        displayName: profile.display_name?.trim() || '',
        preferredCityId: profile.preferred_city_id,
        preferredCitySlug: city?.slug ?? null,
        preferredCityName: city?.name ?? null,
        visitorType: profile.visitor_type,
        dateOfBirth: profile.date_of_birth,
        gender: profile.gender,
        neighborhoodOrZip: profile.neighborhood_or_zip?.trim() || null,
        notifications: {
          favoriteUpdates: profile.notify_favorite_updates,
          startingSoon: profile.notify_starting_soon,
          newVenuesInCity: profile.notify_new_venues_in_city,
        },
        cities,
      }
    } catch (error) {
      throw toProfileError(error)
    }
  },
)

export const updateUserProfile = createServerFn({ method: 'POST' })
  .inputValidator(updateProfileSchema)
  .handler(async ({ data }): Promise<{ message: string }> => {
    try {
      const { userId } = await requireAuthenticatedUser()
      assertValidDateOfBirth(data.dateOfBirth ?? null)

      const supabase = createSupabaseRequestClient()

      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('id')
        .eq('id', data.preferredCityId)
        .eq('is_active', true)
        .maybeSingle()

      if (cityError || !city) {
        throw new Error('Choose a valid city.')
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: data.displayName.trim(),
          preferred_city_id: data.preferredCityId,
          visitor_type: data.visitorType,
          date_of_birth: data.dateOfBirth,
          gender: data.gender ?? null,
          neighborhood_or_zip: data.neighborhoodOrZip,
          notify_favorite_updates: data.notifications.favoriteUpdates,
          notify_starting_soon: data.notifications.startingSoon,
          notify_new_venues_in_city: data.notifications.newVenuesInCity,
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      return { message: 'Profile saved.' }
    } catch (error) {
      throw toProfileError(error)
    }
  })

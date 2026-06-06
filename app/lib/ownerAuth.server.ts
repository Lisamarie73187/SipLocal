import { createSupabaseRequestClient } from '@/lib/supabaseRequest'

export class OwnerAuthError extends Error {
  readonly status: 401 | 403

  constructor(message: string, status: 401 | 403) {
    super(message)
    this.name = 'OwnerAuthError'
    this.status = status
  }
}

export async function requireAuthenticatedUser(): Promise<{ userId: string }> {
  const supabase = createSupabaseRequestClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new OwnerAuthError('Sign in required.', 401)
  }

  return { userId: user.id }
}

export async function requireVenueManager(venueId: string): Promise<{ userId: string }> {
  const { userId } = await requireAuthenticatedUser()
  const supabase = createSupabaseRequestClient()

  const { data: row, error } = await supabase
    .from('venue_managers')
    .select('id')
    .eq('venue_id', venueId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!row) {
    throw new OwnerAuthError('You do not manage this venue.', 403)
  }

  return { userId }
}

export async function getManagedVenueIds(userId: string): Promise<string[]> {
  const supabase = createSupabaseRequestClient()
  const { data, error } = await supabase
    .from('venue_managers')
    .select('venue_id')
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => row.venue_id)
}

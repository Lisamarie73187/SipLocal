import { createSupabaseRequestClient } from '@/lib/supabaseRequest'

export class AdminAuthError extends Error {
  readonly status: 401 | 403

  constructor(message: string, status: 401 | 403) {
    super(message)
    this.name = 'AdminAuthError'
    this.status = status
  }
}

export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = createSupabaseRequestClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new AdminAuthError('Sign in required.', 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    throw new AdminAuthError('Admin access required.', 403)
  }

  return { userId: user.id }
}

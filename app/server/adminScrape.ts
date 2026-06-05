import { createServerFn } from '@tanstack/react-start'

import { createSupabaseRequestClient } from '@/lib/supabaseRequest'

export const getCurrentUserAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = createSupabaseRequestClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isAuthenticated: false, isAdmin: false, email: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return {
    isAuthenticated: true,
    isAdmin: profile?.is_admin === true,
    email: user.email ?? null,
  }
})

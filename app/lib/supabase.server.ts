import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

function getServerSupabaseEnv(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment.',
    )
  }

  return { url, serviceRoleKey }
}

export function createSupabaseServerClient(
  cookies: CookieMethodsServer,
): SupabaseClient<Database> {
  const { url, serviceRoleKey } = getServerSupabaseEnv()

  return createServerClient<Database>(url, serviceRoleKey, {
    cookies,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createSupabaseAnonServerClient(
  cookies: CookieMethodsServer,
): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in server environment.')
  }

  return createServerClient<Database>(url, anonKey, { cookies })
}

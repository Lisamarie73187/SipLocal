import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

let serviceClient: SupabaseClient<Database> | null = null

/** Service role client for scrape pipeline writes (bypasses RLS). Server-only. */
export function createSupabaseServiceClient(): SupabaseClient<Database> {
  if (serviceClient) {
    return serviceClient
  }

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment.',
    )
  }

  serviceClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serviceClient
}

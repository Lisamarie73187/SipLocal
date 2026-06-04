import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

let browserClient: SupabaseClient<Database> | null = null

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy values from SUPABASE_URL and SUPABASE_ANON_KEY in .env.local.',
    )
  }

  return { url, anonKey }
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient
  }

  const { url, anonKey } = getSupabaseEnv()
  browserClient = createBrowserClient<Database>(url, anonKey)
  return browserClient
}

import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRequest } from '@tanstack/react-start/server'

import type { Database } from '@/types/database'

function parseCookieHeader(header: string): Array<{ name: string; value: string }> {
  if (!header.trim()) {
    return []
  }

  return header.split(';').flatMap((part) => {
    const trimmed = part.trim()
    if (!trimmed) {
      return []
    }
    const separator = trimmed.indexOf('=')
    if (separator <= 0) {
      return []
    }
    return [
      {
        name: trimmed.slice(0, separator),
        value: decodeURIComponent(trimmed.slice(separator + 1)),
      },
    ]
  })
}

function createCookieMethods(): CookieMethodsServer {
  const request = getRequest()
  const cookieHeader = request.headers.get('cookie') ?? ''

  return {
    getAll() {
      return parseCookieHeader(cookieHeader)
    },
    setAll() {
      // Server functions do not persist auth cookies on this path.
    },
  }
}

/** Session-aware Supabase client from the incoming request (anon key + user cookies). */
export function createSupabaseRequestClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in server environment.')
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: createCookieMethods(),
  })
}

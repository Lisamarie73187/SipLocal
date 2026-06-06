import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export function createUserClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) {
    throw new Error('Supabase environment is not configured.')
  }

  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    throw new Error('Supabase service role is not configured.')
  }

  return createClient(url, serviceKey)
}

export async function requireAuthenticatedUser(
  authHeader: string | null,
): Promise<{ userId: string; userClient: SupabaseClient }> {
  if (!authHeader) {
    throw new Response(JSON.stringify({ error: 'Sign in required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userClient = createUserClient(authHeader)
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser()

  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Sign in required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { userId: user.id, userClient }
}

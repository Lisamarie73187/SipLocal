import { useCallback, useEffect, useState } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'

import { getSupabaseBrowserClient } from '@/lib/supabase'
import { logger } from '@/utils/logger'

export interface UseAuthResult {
  session: Session | null
  user: User | null
  loading: boolean
  error: AuthError | null
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        logger.error('Failed to load auth session', sessionError)
        setError(sessionError)
      } else {
        setSession(data.session)
        setUser(data.session?.user ?? null)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    const supabase = getSupabaseBrowserClient()
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      logger.error('Failed to sign out', signOutError)
      setError(signOutError)
      return
    }

    setSession(null)
    setUser(null)
  }, [])

  return { session, user, loading, error, signOut }
}

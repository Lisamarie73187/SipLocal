import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase'

export interface UseIsAdminResult {
  isAdmin: boolean
  loading: boolean
  refetch: () => void
}

export function useIsAdmin(): UseIsAdminResult {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAdmin = useCallback(async (): Promise<void> => {
    if (!user) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (error) {
      setIsAdmin(false)
    } else {
      setIsAdmin(data?.is_admin === true)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (authLoading) {
      return
    }
    void fetchAdmin()
  }, [authLoading, fetchAdmin])

  return { isAdmin, loading: authLoading || loading, refetch: fetchAdmin }
}

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase'

export interface UseIsManagerResult {
  isManager: boolean
  loading: boolean
  refetch: () => void
}

export function useIsManager(): UseIsManagerResult {
  const { user, loading: authLoading } = useAuth()
  const [isManager, setIsManager] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchManager = useCallback(async (): Promise<void> => {
    if (!user) {
      setIsManager(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { count, error } = await supabase
      .from('venue_managers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) {
      setIsManager(false)
    } else {
      setIsManager((count ?? 0) > 0)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (authLoading) {
      return
    }
    void fetchManager()
  }, [authLoading, fetchManager])

  return { isManager, loading: authLoading || loading, refetch: fetchManager }
}

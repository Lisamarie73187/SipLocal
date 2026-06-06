import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase'

export interface UseProfileOnboardingResult {
  needsOnboarding: boolean
  loading: boolean
  refetch: () => void
}

export function useProfileOnboarding(): UseProfileOnboardingResult {
  const { user, loading: authLoading } = useAuth()
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async (): Promise<void> => {
    if (!user) {
      setNeedsOnboarding(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('visitor_type')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      setNeedsOnboarding(false)
    } else {
      setNeedsOnboarding(data.visitor_type == null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (authLoading) {
      return
    }
    void fetchStatus()
  }, [authLoading, fetchStatus])

  return {
    needsOnboarding,
    loading: authLoading || loading,
    refetch: fetchStatus,
  }
}

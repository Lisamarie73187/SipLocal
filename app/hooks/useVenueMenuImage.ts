import { useCallback, useEffect, useState } from 'react'

import { getVenueHappyHourMenuImage } from '@/server/venueMenuImage'

export interface UseVenueMenuImageResult {
  menuImageUrl: string | null
  loading: boolean
  reload: () => Promise<void>
}

export function useVenueMenuImage(venueId: string): UseVenueMenuImageResult {
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    void getVenueHappyHourMenuImage({ data: { venueId } })
      .then((result) => {
        if (!cancelled) {
          setMenuImageUrl(result.url)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMenuImageUrl(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [venueId, tick])

  const reload = useCallback(async (): Promise<void> => {
    setTick((n) => n + 1)
  }, [])

  return { menuImageUrl, loading, reload }
}

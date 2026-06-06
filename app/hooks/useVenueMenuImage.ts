import { useEffect, useState } from 'react'

import { getVenueHappyHourMenuImage } from '@/server/venueMenuImage'

export interface UseVenueMenuImageResult {
  menuImageUrl: string | null
  loading: boolean
}

export function useVenueMenuImage(venueId: string): UseVenueMenuImageResult {
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
  }, [venueId])

  return { menuImageUrl, loading }
}

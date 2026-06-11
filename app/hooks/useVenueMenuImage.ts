import { useCallback, useEffect, useState } from 'react'

import {
  getAdminVenueMenuImages,
  getVenueHappyHourMenuImages,
  type VenueMenuImageItem,
} from '@/server/venueMenuImage'

export interface UseVenueMenuImagesResult {
  images: VenueMenuImageItem[]
  loading: boolean
  reload: () => Promise<void>
}

function useVenueMenuImagesBase(venueId: string, scope: 'public' | 'admin'): UseVenueMenuImagesResult {
  const [images, setImages] = useState<VenueMenuImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const fetcher =
      scope === 'admin'
        ? getAdminVenueMenuImages({ data: { venueId } })
        : getVenueHappyHourMenuImages({ data: { venueId } })

    void fetcher
      .then((result) => {
        if (!cancelled) {
          setImages(result.images)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImages([])
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
  }, [venueId, tick, scope])

  const reload = useCallback(async (): Promise<void> => {
    setTick((n) => n + 1)
  }, [])

  return { images, loading, reload }
}

export function useVenueMenuImages(venueId: string): UseVenueMenuImagesResult {
  return useVenueMenuImagesBase(venueId, 'public')
}

export function useAdminVenueMenuImages(venueId: string): UseVenueMenuImagesResult {
  return useVenueMenuImagesBase(venueId, 'admin')
}

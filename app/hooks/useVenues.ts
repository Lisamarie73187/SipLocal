import { useCallback, useEffect, useRef, useState } from 'react'

import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { VenueDetail } from '@/types/venue'
import { logger } from '@/utils/logger'

const VENUE_SELECT = `
  *,
  happy_hour_slots (
    *,
    happy_hour_deals ( * )
  )
`

export interface UseVenuesOptions {
  citySlug?: string
}

export interface UseVenuesResult {
  venues: VenueDetail[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface VenueQueryRow {
  happy_hour_slots?: Array<
    VenueDetail['happy_hour_slots'][number] & {
      happy_hour_deals?: VenueDetail['happy_hour_slots'][number]['deals']
    }
  >
}

function normalizeVenues(
  rows: Array<VenueQueryRow & Omit<VenueDetail, 'city' | 'happy_hour_slots'>>,
  city: VenueDetail['city'],
): VenueDetail[] {
  return rows.map((venue) => ({
    ...venue,
    city,
    happy_hour_slots: (venue.happy_hour_slots ?? [])
      .filter((slot) => slot.is_active && slot.data_status === 'live')
      .map((slot) => {
        const { happy_hour_deals, ...rest } = slot
        return {
          ...rest,
          deals: [...(happy_hour_deals ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        }
      })
      .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)),
  }))
}

export function useVenues(options: UseVenuesOptions = {}): UseVenuesResult {
  const citySlug = options.citySlug ?? 'bend-or'
  const [venues, setVenues] = useState<VenueDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  const fetchVenues = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()

      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('id, slug, name, timezone')
        .eq('slug', citySlug)
        .eq('is_active', true)
        .single()

      if (cityError) {
        throw cityError
      }

      const { data, error: fetchError } = await supabase
        .from('venues')
        .select(VENUE_SELECT)
        .eq('city_id', city.id)
        .eq('data_status', 'live')
        .eq('is_published', true)
        .is('archived_at', null)
        .order('name')

      if (fetchError) {
        throw fetchError
      }

      if (requestId !== requestIdRef.current) {
        return
      }

      const cityMeta = { slug: city.slug, name: city.name, timezone: city.timezone }
      setVenues(
        normalizeVenues(
          (data ?? []) as Array<VenueQueryRow & Omit<VenueDetail, 'city' | 'happy_hour_slots'>>,
          cityMeta,
        ),
      )
    } catch (caught) {
      if (requestId !== requestIdRef.current) {
        return
      }
      const nextError =
        caught instanceof Error ? caught : new Error('Failed to load venues')
      logger.error('useVenues fetch failed', nextError)
      setError(nextError)
      setVenues([])
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [citySlug])

  useEffect(() => {
    void fetchVenues()
    return () => {
      requestIdRef.current++
    }
  }, [fetchVenues])

  return { venues, loading, error, refetch: fetchVenues }
}

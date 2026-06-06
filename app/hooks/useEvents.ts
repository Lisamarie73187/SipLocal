import { useCallback, useEffect, useRef, useState } from 'react'

import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { EventDetail, EventVenueSummary } from '@/types/event'
import { logger } from '@/utils/logger'

const EVENT_SELECT = `
  id,
  city_id,
  venue_id,
  title,
  description,
  event_type,
  event_date,
  day_of_week,
  start_time,
  end_time,
  is_published,
  confidence,
  source_urls,
  last_scraped_at,
  last_verified_at,
  created_at,
  updated_at,
  venues!inner (
    id,
    name,
    slug,
    address_line1,
    lat,
    lng,
    price_level,
    venue_type,
    website_url,
    last_verified_at,
    community_verified_at,
    last_scraped_at
  )
`

export interface UseEventsOptions {
  citySlug?: string
  refetchOnFocus?: boolean
}

export interface UseEventsResult {
  events: EventDetail[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface EventQueryRow {
  venues: EventVenueSummary | EventVenueSummary[]
}

function normalizeEvents(
  rows: Array<EventQueryRow & Omit<EventDetail, 'city' | 'venue'>>,
  city: EventDetail['city'],
): EventDetail[] {
  return rows.map((row) => {
    const venueRaw = row.venues
    const venue = Array.isArray(venueRaw) ? venueRaw[0] : venueRaw
    const { venues: _venues, ...event } = row
    return {
      ...event,
      city,
      venue,
    }
  })
}

export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const citySlug = options.citySlug ?? 'bend-or'
  const refetchOnFocus = options.refetchOnFocus === true
  const [events, setEvents] = useState<EventDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  const fetchEvents = useCallback(async (): Promise<void> => {
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
        .from('events')
        .select(EVENT_SELECT)
        .eq('city_id', city.id)
        .eq('is_published', true)
        .order('event_date', { ascending: true, nullsFirst: false })
        .order('day_of_week', { ascending: true, nullsFirst: false })
        .order('start_time', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      if (requestId !== requestIdRef.current) {
        return
      }

      setEvents(normalizeEvents(data ?? [], city))
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) {
        return
      }
      logger.error('Failed to load events', { citySlug, error: fetchError })
      setError(fetchError instanceof Error ? fetchError : new Error('Failed to load events'))
      setEvents([])
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [citySlug])

  useEffect(() => {
    void fetchEvents()
    return () => {
      requestIdRef.current++
    }
  }, [fetchEvents])

  useEffect(() => {
    if (!refetchOnFocus) {
      return
    }
    const onFocus = (): void => {
      void fetchEvents()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchEvents, refetchOnFocus])

  return { events, loading, error, refetch: fetchEvents }
}

import { useCallback, useEffect, useRef, useState } from 'react'

import { debounce } from '@/utils/debounce'
import { GeocodingError, geocodeForwardSearch, type GeocodeResult } from '@/utils/mapboxGeocoding'

export interface UseLocationSearchOptions {
  onSelect: (result: GeocodeResult) => void
  proximity?: { latitude: number; longitude: number } | null
}

export interface UseLocationSearchResult {
  query: string
  setQuery: (query: string) => void
  results: GeocodeResult[]
  loading: boolean
  error: string | null
  selectResult: (result: GeocodeResult) => void
  reset: () => void
}

const DEBOUNCE_MS = 350

export function useLocationSearch(options: UseLocationSearchOptions): UseLocationSearchResult {
  const { onSelect, proximity } = options
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const proximityRef = useRef(proximity)
  proximityRef.current = proximity

  const runSearch = useCallback((searchQuery: string) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    void geocodeForwardSearch(searchQuery, {
      proximity: proximityRef.current ?? undefined,
    })
      .then((found) => {
        if (requestIdRef.current !== requestId) {
          return
        }
        setResults(found)
        setLoading(false)
      })
      .catch((caught) => {
        if (requestIdRef.current !== requestId) {
          return
        }
        setResults([])
        setLoading(false)
        setError(caught instanceof GeocodingError ? caught.message : 'Location search failed.')
      })
  }, [])

  const debouncedRef = useRef(debounce(runSearch, DEBOUNCE_MS))
  useEffect(() => {
    debouncedRef.current = debounce(runSearch, DEBOUNCE_MS)
    return () => debouncedRef.current.cancel()
  }, [runSearch])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      requestIdRef.current += 1
      setResults([])
      setLoading(false)
      setError(null)
      debouncedRef.current.cancel()
      return
    }

    debouncedRef.current.run(trimmed)
  }, [query])

  const selectResult = useCallback(
    (result: GeocodeResult) => {
      onSelect(result)
    },
    [onSelect],
  )

  const reset = useCallback(() => {
    requestIdRef.current += 1
    debouncedRef.current.cancel()
    setQuery('')
    setResults([])
    setLoading(false)
    setError(null)
  }, [])

  return { query, setQuery, results, loading, error, selectResult, reset }
}

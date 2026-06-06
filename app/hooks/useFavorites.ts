import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/utils/logger'

export interface UseFavoritesResult {
  favoriteVenueIds: readonly string[]
  loading: boolean
  error: Error | null
  togglingVenueId: string | null
  isFavorite: (venueId: string) => boolean
  toggleFavorite: (venueId: string) => Promise<void>
  refetch: () => Promise<void>
}

export const FavoritesContext = createContext<UseFavoritesResult | null>(null)

export function useFavorites(): UseFavoritesResult {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider')
  }
  return context
}

export function useFavoritesState(): UseFavoritesResult {
  const { user } = useAuth()
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [togglingVenueId, setTogglingVenueId] = useState<string | null>(null)

  const fetchFavorites = useCallback(async (): Promise<void> => {
    if (!user) {
      setFavoriteVenueIds([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error: fetchError } = await supabase
        .from('favorites')
        .select('venue_id, created_at')
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setFavoriteVenueIds((data ?? []).map((row) => row.venue_id))
    } catch (caught) {
      const nextError =
        caught instanceof Error ? caught : new Error('Failed to load favorites')
      logger.error('useFavorites fetch failed', nextError)
      setError(nextError)
      setFavoriteVenueIds([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchFavorites()
  }, [fetchFavorites])

  const favoriteIdSet = useMemo(() => new Set(favoriteVenueIds), [favoriteVenueIds])

  const isFavorite = useCallback(
    (venueId: string): boolean => favoriteIdSet.has(venueId),
    [favoriteIdSet],
  )

  const toggleFavorite = useCallback(
    async (venueId: string): Promise<void> => {
      if (!user) {
        return
      }

      const wasFavorite = favoriteIdSet.has(venueId)
      setTogglingVenueId(venueId)
      setError(null)

      setFavoriteVenueIds((current) =>
        wasFavorite ? current.filter((id) => id !== venueId) : [venueId, ...current],
      )

      try {
        const supabase = getSupabaseBrowserClient()

        if (wasFavorite) {
          const { error: deleteError } = await supabase
            .from('favorites')
            .delete()
            .eq('venue_id', venueId)

          if (deleteError) {
            throw deleteError
          }
        } else {
          const { error: insertError } = await supabase.from('favorites').insert({
            user_id: user.id,
            venue_id: venueId,
          })

          if (insertError) {
            throw insertError
          }
        }
      } catch (caught) {
        const nextError =
          caught instanceof Error ? caught : new Error('Failed to update favorite')
        logger.error('useFavorites toggle failed', nextError)
        setError(nextError)
        setFavoriteVenueIds((current) =>
          wasFavorite
            ? current.includes(venueId)
              ? current
              : [venueId, ...current]
            : current.filter((id) => id !== venueId),
        )
      } finally {
        setTogglingVenueId(null)
      }
    },
    [favoriteIdSet, user],
  )

  return {
    favoriteVenueIds,
    loading,
    error,
    togglingVenueId,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  }
}

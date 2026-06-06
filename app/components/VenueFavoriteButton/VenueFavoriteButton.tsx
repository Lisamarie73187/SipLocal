import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, Loader2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/utils'

export interface VenueFavoriteButtonProps {
  venueId: string
  /** Used for login redirect when the user is not signed in. */
  redirectTo?: string
  className?: string
  /** Overlay style for map thumbnail; default is header style. */
  variant?: 'header' | 'overlay'
}

export function VenueFavoriteButton({
  venueId,
  redirectTo,
  className,
  variant = 'header',
}: VenueFavoriteButtonProps) {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { isFavorite, toggleFavorite, togglingVenueId } = useFavorites()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const searchStr = useRouterState({ select: (state) => state.location.searchStr })
  const loginRedirect = redirectTo ?? `${pathname}${searchStr}`

  const favorited = user ? isFavorite(venueId) : false
  const busy = authLoading || togglingVenueId === venueId

  const handleClick = (): void => {
    if (busy) {
      return
    }

    if (!user) {
      void navigate({
        to: '/login',
        search: { redirect: loginRedirect, mode: 'sign-in' },
      })
      return
    }

    void toggleFavorite(venueId)
  }

  const label = !user
    ? 'Sign in to save this venue to favorites'
    : favorited
      ? 'Remove from favorites'
      : 'Save to favorites'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={favorited}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60',
        variant === 'overlay'
          ? 'bg-card/90 text-muted-foreground shadow-sm hover:bg-card hover:text-primary'
          : 'border border-border/70 bg-card text-muted-foreground hover:border-primary/30 hover:text-primary',
        favorited && 'text-primary',
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <Heart
          className={cn('size-5', favorited && 'fill-current')}
          strokeWidth={favorited ? 0 : 1.75}
          aria-hidden
        />
      )}
    </button>
  )
}

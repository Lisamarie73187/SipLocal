import type { ReactNode } from 'react'

import { FavoritesContext, useFavoritesState } from '@/hooks/useFavorites'
import { UserLocationContext, useUserLocationState } from '@/hooks/useUserLocation'

export interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps): React.ReactElement {
  const favorites = useFavoritesState()
  const userLocation = useUserLocationState()

  return (
    <UserLocationContext.Provider value={userLocation}>
      <FavoritesContext.Provider value={favorites}>{children}</FavoritesContext.Provider>
    </UserLocationContext.Provider>
  )
}

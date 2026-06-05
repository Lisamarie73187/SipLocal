import type { ViewDayFilter } from '@/hooks/useDiscoveryFilters'
import type { UseMapResult } from '@/hooks/useMap'
import type { EventDetail } from '@/types/event'
import type { VenueDetail } from '@/types/venue'

export type VenueMapVariant = 'fullscreen' | 'embedded'

export interface VenueMapProps {
  venues: VenueDetail[]
  map: UseMapResult
  viewDay?: ViewDayFilter
  loading?: boolean
  variant?: VenueMapVariant
  selectedVenuePanel?: VenueDetail | null
  selectedEvent?: EventDetail | null
  selectedDistanceLabel?: string
  hoveredVenueId?: string | null
  onHoverVenue?: (venueId: string | null) => void
  onVenueSelect?: (venueId: string) => void
  onClearSelection?: () => void
}

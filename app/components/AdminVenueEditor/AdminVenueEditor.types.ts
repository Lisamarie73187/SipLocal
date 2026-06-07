import type {
  AdminVenueEditorData,
  AdminVenueEditorEvent,
  AdminVenueEditorSlot,
} from '@/server/adminVenues'
import type { Database } from '@/types/database'
import type { DayOfWeek } from '@/types/venue'

export interface VenueFormState {
  id: string
  city_id: string
  name: string
  slug: string
  address_line1: string
  address_line2: string
  postal_code: string
  lat: string
  lng: string
  phone: string
  website_url: string
  description: string
  price_level: Database['public']['Enums']['venue_price_level']
  data_status: Database['public']['Enums']['venue_data_status']
  is_published: boolean
  is_featured: boolean
  place_id: string
  venue_types: Database['public']['Enums']['venue_type'][]
  vibes: Database['public']['Enums']['venue_vibe'][]
  last_verified_at: string
  community_verified_at: string
  last_scraped_at: string
  schedule_cadence: Database['public']['Enums']['schedule_cadence'] | ''
  image_url: string
}

export interface SlotFormState extends Omit<AdminVenueEditorSlot, 'day_of_week'> {
  key: string
  days: DayOfWeek[]
}

import type { AdminVenuesListSearch } from '@/utils/adminVenuesListSearch'

export interface AdminVenueEditorProps {
  mode: 'create' | 'edit'
  initialCities: AdminVenueEditorData['cities']
  initialVenue: NonNullable<AdminVenueEditorData['venue']>
  initialSlots: AdminVenueEditorSlot[]
  cityTimezone?: string
  initialEvents?: AdminVenueEditorEvent[]
  onEventsReload?: () => Promise<void>
  returnListSearch?: AdminVenuesListSearch
}

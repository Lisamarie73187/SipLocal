import type { Database } from './supabase'
import type { VenueWithCity } from './venue'

export type EventType = Database['public']['Enums']['event_type']
export type Event = Database['public']['Tables']['events']['Row']

export interface EventVenueSummary {
  id: string
  name: string
  slug: string
  address_line1: string
  lat: number
  lng: number
  price_level: Database['public']['Enums']['venue_price_level']
  venue_types: Database['public']['Enums']['venue_type'][]
  vibes: Database['public']['Enums']['venue_vibe'][]
  website_url: string | null
  last_verified_at: string | null
  community_verified_at: string | null
  last_scraped_at: string | null
}

export interface EventDetail extends Event {
  city: Pick<Database['public']['Tables']['cities']['Row'], 'slug' | 'name' | 'timezone'>
  venue: EventVenueSummary
}

export type { VenueWithCity }

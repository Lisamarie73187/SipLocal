import type { Database } from '@/types/database'

export interface AdminVenueListItem {
  id: string
  name: string
  slug: string
  address_line1: string
  phone: string | null
  data_status: string
  schedule_cadence: Database['public']['Enums']['schedule_cadence'] | null
  is_published: boolean
  city_slug: string
  city_name: string
  place_id: string | null
  happy_hour_slot_count: number
  live_slot_count: number
  event_count: number
  published_event_count: number
  map_visible: boolean
  website_url: string | null
  /** Unique URLs from happy hour slot scrape sources. */
  source_urls: string[]
  /** Lowest confidence across live active slots, or all active slots if none are live. */
  confidence: Database['public']['Enums']['scrape_confidence'] | null
  archived_at: string | null
}

export interface AdminVenueEditorSlot {
  day_of_week: number
  start_time: string
  end_time: string
  deal_summary: string | null
  data_status: Database['public']['Enums']['happy_hour_data_status']
  is_active: boolean
  confidence: Database['public']['Enums']['scrape_confidence'] | null
  source_urls: string[]
  deals: Array<{
    label: string
    category: Database['public']['Enums']['deal_category']
    price_text: string | null
  }>
}

export interface AdminVenueEditorEvent {
  id: string
  title: string
  description: string | null
  event_type: Database['public']['Enums']['event_type']
  event_date: string | null
  day_of_week: number | null
  start_time: string
  end_time: string | null
  is_published: boolean
  confidence: Database['public']['Enums']['scrape_confidence'] | null
  source_urls: string[]
  community_verified_at: string | null
}

export interface AdminVenueEditorData {
  cities: Array<{ id: string; slug: string; name: string; state: string }>
  cityTimezone: string
  venue: {
    id: string
    city_id: string
    name: string
    slug: string
    address_line1: string
    address_line2: string | null
    postal_code: string | null
    lat: number
    lng: number
    phone: string | null
    website_url: string | null
    description: string | null
    price_level: Database['public']['Enums']['venue_price_level']
    data_status: Database['public']['Enums']['venue_data_status']
    is_published: boolean
    is_featured: boolean
    place_id: string | null
    venue_types: Database['public']['Enums']['venue_type'][]
    vibes: Database['public']['Enums']['venue_vibe'][]
    last_verified_at: string | null
    community_verified_at: string | null
    last_scraped_at: string | null
    schedule_cadence: Database['public']['Enums']['schedule_cadence'] | null
    image_url: string | null
  } | null
  slots: AdminVenueEditorSlot[]
  events: AdminVenueEditorEvent[]
}

export interface AdminPendingVenueUpdate {
  id: string
  name: string
  slug: string
  address_line1: string
  data_status: string
  city_slug: string
  city_name: string
  pending_slot_count: number
  updated_at: string
  source: 'manager' | 'staff'
}

export interface AdminPendingUpdatesDashboard {
  managerUpdates: AdminPendingVenueUpdate[]
  staffReview: AdminPendingVenueUpdate[]
}

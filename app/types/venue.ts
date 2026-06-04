import type { Database } from './supabase'

export type DealCategory = Database['public']['Enums']['deal_category']
export type VenuePriceLevel = Database['public']['Enums']['venue_price_level']
export type VenueDataStatus = Database['public']['Enums']['venue_data_status']
export type HappyHourDataStatus = Database['public']['Enums']['happy_hour_data_status']
export type ScrapeConfidence = Database['public']['Enums']['scrape_confidence']

/** 0 = Sunday … 6 = Saturday (JavaScript Date.getDay()) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type City = Database['public']['Tables']['cities']['Row']
export type Venue = Database['public']['Tables']['venues']['Row']
export type HappyHourSlot = Database['public']['Tables']['happy_hour_slots']['Row']
export type HappyHourDeal = Database['public']['Tables']['happy_hour_deals']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export interface VenueWithCity extends Venue {
  city: Pick<City, 'slug' | 'name' | 'timezone'>
}

export interface HappyHourSlotWithDeals extends HappyHourSlot {
  deals: HappyHourDeal[]
}

export interface VenueDetail extends VenueWithCity {
  happy_hour_slots: HappyHourSlotWithDeals[]
}

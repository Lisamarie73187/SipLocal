import type { Database } from './supabase'

export type VenueDataStatus = Database['public']['Enums']['venue_data_status']
export type HappyHourDataStatus = Database['public']['Enums']['happy_hour_data_status']
export type ScrapeConfidence = Database['public']['Enums']['scrape_confidence']
export type ScrapeJobStatus = Database['public']['Enums']['scrape_job_status']

export type ScrapeJob = Database['public']['Tables']['scrape_jobs']['Row']

/** Map viewport bounds stored on scrape_jobs.bounds */
export interface ScrapeBounds {
  north: number
  south: number
  east: number
  west: number
}

/** Claude happy-hour extraction payload (validated in Step 2) */
export interface ClaudeHappyHourExtraction {
  has_happy_hour: boolean
  confidence: ScrapeConfidence
  days: string[]
  start_time: string
  end_time: string
  drink_specials: string[]
  food_specials: string[]
  notes: string | null
  source_urls: string[]
  last_verified: string | null
  conflicts?: Record<string, unknown> | null
}

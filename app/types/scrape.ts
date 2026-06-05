import type { Database } from './supabase'

export type ScrapeJobStatus = Database['public']['Enums']['scrape_job_status']

export type ScrapeJob = Database['public']['Tables']['scrape_jobs']['Row']

/** Map viewport bounds stored on scrape_jobs.bounds */
export interface ScrapeBounds {
  north: number
  south: number
  east: number
  west: number
}

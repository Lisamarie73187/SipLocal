const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface ScrapeCoverageJob {
  status: 'pending' | 'running' | 'complete' | 'failed'
  completed_at: string | null
}

/**
 * True when the city has a successful scrape within the coverage window.
 */
export function isCityCoverageFresh(
  jobs: ScrapeCoverageJob[],
  coverageDays: number,
  now: Date = new Date(),
): boolean {
  if (coverageDays <= 0) {
    return false
  }

  const windowStart = now.getTime() - coverageDays * MS_PER_DAY

  return jobs.some((job) => {
    if (job.status !== 'complete' || !job.completed_at) {
      return false
    }
    const completedAt = new Date(job.completed_at).getTime()
    return Number.isFinite(completedAt) && completedAt >= windowStart
  })
}

export function getDefaultScrapeCoverageDays(): number {
  const parsed = Number.parseInt(process.env.SCRAPE_COVERAGE_DAYS ?? '7', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7
}

export function getDefaultScrapeMaxVenuesPerJob(): number {
  const parsed = Number.parseInt(process.env.SCRAPE_MAX_VENUES_PER_JOB ?? '25', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25
}

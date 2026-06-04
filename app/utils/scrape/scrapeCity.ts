export interface ScrapeCityRecord {
  slug: string
  name: string
  state: string
}

export type CityInputMatchKind = 'slug' | 'name' | 'zip'

export interface ResolvedScrapeCity {
  citySlug: string
  zip: string | null
  matchedBy: CityInputMatchKind
}

/** Bend, OR ZIP codes — extend when new markets launch */
const CITY_ZIP_TO_SLUG: Record<string, string> = {
  '97701': 'bend-or',
  '97702': 'bend-or',
  '97703': 'bend-or',
  '97707': 'bend-or',
  '97708': 'bend-or',
  '97709': 'bend-or',
}

function normalizeCityInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase()
}

function buildNameVariants(city: ScrapeCityRecord): string[] {
  const name = city.name.trim().toLowerCase()
  const state = city.state.trim().toLowerCase()
  return [
    name,
    `${name}, ${state}`,
    `${name} ${state}`,
    `${name},${state}`,
  ]
}

function matchBySlug(input: string, cities: ScrapeCityRecord[]): ResolvedScrapeCity | null {
  const slug = normalizeSlug(input)
  const found = cities.find((city) => city.slug === slug)
  if (!found) {
    return null
  }
  return { citySlug: found.slug, zip: null, matchedBy: 'slug' }
}

function matchByZip(input: string, cities: ScrapeCityRecord[]): ResolvedScrapeCity | null {
  const zip = input.trim().replace(/\D/g, '').slice(0, 5)
  if (zip.length !== 5) {
    return null
  }
  const citySlug = CITY_ZIP_TO_SLUG[zip]
  if (!citySlug) {
    return null
  }
  const found = cities.find((city) => city.slug === citySlug)
  if (!found) {
    return null
  }
  return { citySlug: found.slug, zip, matchedBy: 'zip' }
}

function matchByName(input: string, cities: ScrapeCityRecord[]): ResolvedScrapeCity | null {
  const normalized = normalizeCityInput(input)
  const matches = cities.filter((city) =>
    buildNameVariants(city).some((variant) => variant === normalized),
  )
  if (matches.length !== 1) {
    return null
  }
  return { citySlug: matches[0].slug, zip: null, matchedBy: 'name' }
}

/**
 * Resolves a city name or 5-digit ZIP to an active `cities.slug`.
 * Returns null when input is empty, unknown, or ambiguous.
 */
export function resolveCityInput(
  raw: string,
  cities: ScrapeCityRecord[],
): ResolvedScrapeCity | null {
  const input = raw.trim()
  if (!input || cities.length === 0) {
    return null
  }

  return (
    matchBySlug(input, cities) ??
    matchByZip(input, cities) ??
    matchByName(input, cities)
  )
}

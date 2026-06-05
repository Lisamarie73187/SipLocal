import { ScrapeApiError } from './errors'

export function getGooglePlacesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim()
  if (!key) {
    throw new ScrapeApiError(
      'GOOGLE_PLACES_API_KEY is not set. Add it to .env.local (server-only, no VITE_ prefix).',
      { code: 'missing_config', provider: 'google' },
    )
  }
  return key
}

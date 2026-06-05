import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ScrapeApiError } from './errors'
import { fetchVenuesFromGoogle } from './googlePlaces'

const originalEnv = { ...process.env }

describe('scrape API clients', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  describe('fetchVenuesFromGoogle', () => {
    it('throws when GOOGLE_PLACES_API_KEY is missing', async () => {
      delete process.env.GOOGLE_PLACES_API_KEY
      await expect(
        fetchVenuesFromGoogle({ latitude: 44.05, longitude: -121.31 }),
      ).rejects.toMatchObject({
        code: 'missing_config',
        provider: 'google',
      } satisfies Partial<ScrapeApiError>)
    })

    it('maps Places API response to GooglePlaceVenue', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'test-google-key'

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            places: [
              {
                id: 'places/ChIJtest',
                displayName: { text: 'Test Bar' },
                formattedAddress: '123 Main St, Bend, OR',
                location: { latitude: 44.05, longitude: -121.31 },
                nationalPhoneNumber: '+1 541-555-0100',
                websiteUri: 'https://testbar.example',
                priceLevel: 'PRICE_LEVEL_MODERATE',
                photos: [{ name: 'places/ChIJtest/photos/abc' }],
                primaryType: 'bar',
                types: ['bar', 'point_of_interest'],
              },
            ],
          }),
          { status: 200 },
        ),
      )

      const venues = await fetchVenuesFromGoogle({
        latitude: 44.05,
        longitude: -121.31,
        maxResults: 5,
      })

      expect(venues).toHaveLength(1)
      expect(venues[0]).toMatchObject({
        placeId: 'places/ChIJtest',
        name: 'Test Bar',
        googlePriceLevel: 2,
        websiteUrl: 'https://testbar.example',
      })

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('https://places.googleapis.com/v1/places:searchNearby')
      expect(init?.headers).toMatchObject({
        'X-Goog-Api-Key': 'test-google-key',
      })
    })
  })
})

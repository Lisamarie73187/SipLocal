import type { VenueDetail } from '@/types/venue'

export type VenueTypeFilter =
  | 'bar'
  | 'brewery'
  | 'restaurant'
  | 'wine_bar'
  | 'taproom'

export type AmenityFilter =
  | 'patio'
  | 'dog_friendly'
  | 'live_music'
  | 'sports'
  | 'fire_pit'
  | 'games'
  | 'food_available'

const VENUE_TYPE_KEYWORDS: Record<VenueTypeFilter, string[]> = {
  bar: ['bar', 'saloon', 'pub', 'tavern'],
  brewery: ['brewery', 'brewing', 'fermentation', 'ales'],
  restaurant: ['restaurant', 'kitchen', 'bistro', 'grill'],
  wine_bar: ['wine bar', 'wine', 'vineyard'],
  taproom: ['taproom', 'tap room', 'tasting room'],
}

const AMENITY_KEYWORDS: Record<AmenityFilter, string[]> = {
  patio: ['patio', 'outdoor seating', 'outdoor'],
  dog_friendly: ['dog', 'pet friendly', 'pets welcome'],
  live_music: ['live music', 'live band'],
  sports: ['sports', 'big screen', 'game day', 'screens'],
  fire_pit: ['fire pit', 'firepit'],
  games: ['games', 'pool table', 'darts', 'shuffleboard'],
  food_available: ['food', 'kitchen', 'menu', 'fare'],
}

const VENUE_TYPE_INFER_ORDER: VenueTypeFilter[] = [
  'brewery',
  'taproom',
  'wine_bar',
  'restaurant',
  'bar',
]

export const VENUE_TYPE_EMOJI: Record<VenueTypeFilter, string> = {
  bar: '🍸',
  brewery: '🍺',
  restaurant: '🍽️',
  wine_bar: '🍷',
  taproom: '🍻',
}

const DEFAULT_VENUE_EMOJI = '📍'

export function getVenueHaystack(
  venue: Pick<VenueDetail, 'name' | 'description' | 'address_line1'>,
): string {
  return [venue.name, venue.description, venue.address_line1].filter(Boolean).join(' ').toLowerCase()
}

export function getVenueTypeHaystack(venue: Pick<VenueDetail, 'name' | 'description'>): string {
  return `${venue.name} ${venue.description ?? ''}`.toLowerCase()
}

export function inferVenueType(
  venue: Pick<VenueDetail, 'name' | 'description'>,
): VenueTypeFilter | null {
  const haystack = getVenueTypeHaystack(venue)
  for (const type of VENUE_TYPE_INFER_ORDER) {
    if (VENUE_TYPE_KEYWORDS[type].some((keyword) => haystack.includes(keyword))) {
      return type
    }
  }
  return null
}

export function venueMatchesVenueType(
  venue: Pick<VenueDetail, 'name' | 'description'>,
  types: VenueTypeFilter[],
): boolean {
  if (types.length === 0) {
    return true
  }
  const haystack = getVenueTypeHaystack(venue)
  return types.some((type) =>
    VENUE_TYPE_KEYWORDS[type].some((keyword) => haystack.includes(keyword)),
  )
}

export function venueMatchesAmenities(
  venue: Pick<VenueDetail, 'name' | 'description' | 'address_line1'>,
  amenities: AmenityFilter[],
): boolean {
  if (amenities.length === 0) {
    return true
  }
  const haystack = getVenueHaystack(venue)
  return amenities.every((amenity) =>
    AMENITY_KEYWORDS[amenity].some((keyword) => haystack.includes(keyword)),
  )
}

export function getVenueCategoryEmoji(venue: Pick<VenueDetail, 'name' | 'description'>): string {
  const type = inferVenueType(venue)
  return type ? VENUE_TYPE_EMOJI[type] : DEFAULT_VENUE_EMOJI
}

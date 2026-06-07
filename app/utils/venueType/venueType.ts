import type { Database } from '@/types/database'
import type { VenueDetail } from '@/types/venue'

export type VenueType = Database['public']['Enums']['venue_type']
export type VenueTypeFilter = VenueType

export type AmenityFilter =
  | 'patio'
  | 'dog_friendly'
  | 'live_music'
  | 'sports'
  | 'fire_pit'
  | 'games'
  | 'food_available'

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  bar: 'Bar',
  brewery: 'Brewery',
  taproom: 'Taproom',
  restaurant: 'Restaurant',
  gastropub: 'Gastropub',
  wine_bar: 'Wine bar',
  cocktail_bar: 'Cocktail bar',
  sports_bar: 'Sports bar',
  pub: 'Pub',
  distillery: 'Distillery',
}

export const VENUE_TYPE_ADMIN_OPTIONS: Array<{ value: VenueType; label: string }> = [
  { value: 'bar', label: VENUE_TYPE_LABELS.bar },
  { value: 'brewery', label: VENUE_TYPE_LABELS.brewery },
  { value: 'taproom', label: VENUE_TYPE_LABELS.taproom },
  { value: 'restaurant', label: VENUE_TYPE_LABELS.restaurant },
  { value: 'gastropub', label: VENUE_TYPE_LABELS.gastropub },
  { value: 'wine_bar', label: VENUE_TYPE_LABELS.wine_bar },
  { value: 'cocktail_bar', label: VENUE_TYPE_LABELS.cocktail_bar },
  { value: 'sports_bar', label: VENUE_TYPE_LABELS.sports_bar },
  { value: 'pub', label: VENUE_TYPE_LABELS.pub },
  { value: 'distillery', label: VENUE_TYPE_LABELS.distillery },
]

const VENUE_TYPE_KEYWORDS: Record<VenueType, string[]> = {
  bar: ['bar', 'saloon', 'tavern'],
  brewery: ['brewery', 'brewing', 'fermentation', 'ales'],
  restaurant: ['restaurant', 'kitchen', 'bistro', 'grill', 'eatery'],
  wine_bar: ['wine bar', 'wine', 'vineyard'],
  taproom: ['taproom', 'tap room', 'tasting room'],
  gastropub: ['gastropub', 'gastro pub'],
  cocktail_bar: ['cocktail', 'mixology', 'speakeasy'],
  sports_bar: ['sports bar', 'sports', 'game day'],
  pub: ['pub', 'public house'],
  distillery: ['distillery', 'spirits'],
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

const VENUE_TYPE_INFER_ORDER: VenueType[] = [
  'distillery',
  'brewery',
  'taproom',
  'cocktail_bar',
  'wine_bar',
  'gastropub',
  'sports_bar',
  'pub',
  'restaurant',
  'bar',
]

export const VENUE_TYPE_EMOJI: Record<VenueType, string> = {
  bar: '🍸',
  brewery: '🍺',
  restaurant: '🍽️',
  wine_bar: '🍷',
  taproom: '🍻',
  gastropub: '🍽️',
  cocktail_bar: '🍸',
  sports_bar: '📺',
  pub: '🍺',
  distillery: '🥃',
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
): VenueType | null {
  const haystack = getVenueTypeHaystack(venue)
  for (const type of VENUE_TYPE_INFER_ORDER) {
    if (VENUE_TYPE_KEYWORDS[type].some((keyword) => haystack.includes(keyword))) {
      return type
    }
  }
  return null
}

export function resolveVenueTypes(
  venue: Pick<VenueDetail, 'name' | 'description' | 'venue_types'>,
): VenueType[] {
  if (venue.venue_types.length > 0) {
    return venue.venue_types
  }
  const inferred = inferVenueType(venue)
  return inferred ? [inferred] : []
}

export function getVenueTypeLabel(type: VenueType): string {
  return VENUE_TYPE_LABELS[type]
}

export function venueMatchesVenueType(
  venue: Pick<VenueDetail, 'name' | 'description' | 'venue_types'>,
  types: VenueTypeFilter[],
): boolean {
  if (types.length === 0) {
    return true
  }

  const resolved = resolveVenueTypes(venue)
  if (resolved.length > 0) {
    return types.some((type) => resolved.includes(type))
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

export function getVenueCategoryEmoji(
  venue: Pick<VenueDetail, 'name' | 'description' | 'venue_types'>,
): string {
  const [type] = resolveVenueTypes(venue)
  return type ? VENUE_TYPE_EMOJI[type] : DEFAULT_VENUE_EMOJI
}

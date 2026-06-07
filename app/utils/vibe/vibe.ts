import type { Database } from '@/types/database'
import type { VenueDetail } from '@/types/venue'

export type Vibe = Database['public']['Enums']['venue_vibe']
export type VibeFilter = Vibe

export const VIBE_LABELS: Record<Vibe, string> = {
  upscale: 'Upscale',
  rooftop: 'Rooftop',
  patio: 'Patio',
  sports_viewing: 'Sports viewing',
  group_friendly: 'Group friendly',
  family_friendly: 'Family friendly',
  dog_friendly: 'Dog friendly',
}

export const VIBE_EMOJI: Record<Vibe, string> = {
  upscale: '✨',
  rooftop: '🏙️',
  patio: '🌿',
  sports_viewing: '📺',
  group_friendly: '🎉',
  family_friendly: '👨‍👩‍👧',
  dog_friendly: '🐶',
}

export const VIBE_ADMIN_OPTIONS: Array<{ value: Vibe; label: string }> = [
  { value: 'upscale', label: VIBE_LABELS.upscale },
  { value: 'rooftop', label: VIBE_LABELS.rooftop },
  { value: 'patio', label: VIBE_LABELS.patio },
  { value: 'sports_viewing', label: VIBE_LABELS.sports_viewing },
  { value: 'group_friendly', label: VIBE_LABELS.group_friendly },
  { value: 'family_friendly', label: VIBE_LABELS.family_friendly },
  { value: 'dog_friendly', label: VIBE_LABELS.dog_friendly },
]

export function getVibeLabel(vibe: Vibe): string {
  return VIBE_LABELS[vibe]
}

export function getVibeEmoji(vibe: Vibe): string {
  return VIBE_EMOJI[vibe]
}

export function venueMatchesVibes(
  venue: Pick<VenueDetail, 'vibes'>,
  vibes: VibeFilter[],
): boolean {
  if (vibes.length === 0) {
    return true
  }
  return vibes.some((vibe) => venue.vibes.includes(vibe))
}

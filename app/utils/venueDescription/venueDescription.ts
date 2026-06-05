/** Public venue blurb length — kept short for map cards and scrape storage. */
export const MAX_VENUE_DESCRIPTION_LENGTH = 120

export function truncateVenueDescription(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_VENUE_DESCRIPTION_LENGTH) {
    return trimmed
  }

  const slice = trimmed.slice(0, MAX_VENUE_DESCRIPTION_LENGTH).trimEnd()
  const lastSpace = slice.lastIndexOf(' ')
  const base =
    lastSpace > MAX_VENUE_DESCRIPTION_LENGTH * 0.6 ? slice.slice(0, lastSpace) : slice
  return `${base}…`
}

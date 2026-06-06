export interface SubmitterLocationInput {
  lat: number
  lng: number
}

export function parseSubmitterLocation(value: unknown): SubmitterLocationInput | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const record = value as { lat?: unknown; lng?: unknown }
  if (typeof record.lat !== 'number' || typeof record.lng !== 'number') {
    return undefined
  }

  if (record.lat < -90 || record.lat > 90 || record.lng < -180 || record.lng > 180) {
    throw new Error('Invalid submitter location.')
  }

  return { lat: record.lat, lng: record.lng }
}

export function submitterLocationDbFields(
  location: SubmitterLocationInput | undefined,
): { submitter_lat: number | null; submitter_lng: number | null } {
  if (!location) {
    return { submitter_lat: null, submitter_lng: null }
  }

  return { submitter_lat: location.lat, submitter_lng: location.lng }
}

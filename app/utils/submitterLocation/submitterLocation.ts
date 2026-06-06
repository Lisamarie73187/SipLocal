import { z } from 'zod'

export const submitterLocationInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export type SubmitterLocationInput = z.infer<typeof submitterLocationInputSchema>

export interface UserLocationCoords {
  latitude: number
  longitude: number
}

export function userLocationToSubmitterInput(
  userLocation: UserLocationCoords | null,
): SubmitterLocationInput | undefined {
  if (!userLocation) {
    return undefined
  }

  return { lat: userLocation.latitude, lng: userLocation.longitude }
}

export function submitterLocationDbFields(
  location: SubmitterLocationInput | undefined,
): { submitter_lat: number | null; submitter_lng: number | null } {
  if (!location) {
    return { submitter_lat: null, submitter_lng: null }
  }

  return { submitter_lat: location.lat, submitter_lng: location.lng }
}

export function formatSubmitterLocation(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function submitterLocationMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

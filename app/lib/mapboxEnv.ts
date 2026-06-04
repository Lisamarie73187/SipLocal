export function getMapboxAccessToken(): string | undefined {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token || token === 'your-mapbox-public-token') {
    return undefined
  }
  return token
}

export function validateMapboxToken(token: string): string | null {
  if (!token.startsWith('pk.')) {
    return 'VITE_MAPBOX_TOKEN must be a public token starting with pk. (not a secret sk. token).'
  }
  return null
}

export const MENU_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export const MENU_PHOTO_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type MenuPhotoMediaType = (typeof MENU_PHOTO_MEDIA_TYPES)[number]

export interface MenuPhotoPayload {
  imageBase64: string
  mediaType: MenuPhotoMediaType
}

export function isMenuPhotoMediaType(value: string): value is MenuPhotoMediaType {
  return (MENU_PHOTO_MEDIA_TYPES as readonly string[]).includes(value)
}

export function validateMenuPhotoPayload(payload: MenuPhotoPayload): void {
  if (!isMenuPhotoMediaType(payload.mediaType)) {
    throw new Error('Use a JPEG, PNG, or WebP image.')
  }

  const byteLength = estimateBase64ByteLength(payload.imageBase64)
  if (byteLength > MENU_PHOTO_MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.')
  }

  if (byteLength < 32) {
    throw new Error('Image file looks empty.')
  }
}

export function estimateBase64ByteLength(base64: string): number {
  const normalized = base64.replace(/\s/g, '')
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  return Math.floor((normalized.length * 3) / 4) - padding
}

export async function readMenuPhotoFile(file: File): Promise<MenuPhotoPayload> {
  if (!isMenuPhotoMediaType(file.type)) {
    throw new Error('Use a JPEG, PNG, or WebP photo.')
  }

  if (file.size > MENU_PHOTO_MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read image.'))
        return
      }

      const match = reader.result.match(/^data:([^;]+);base64,(.+)$/)
      if (!match?.[1] || !match[2] || !isMenuPhotoMediaType(match[1])) {
        reject(new Error('Unsupported image format.'))
        return
      }

      resolve({
        mediaType: match[1],
        imageBase64: match[2],
      })
    }
    reader.onerror = () => reject(new Error('Could not read image.'))
    reader.readAsDataURL(file)
  })
}

export function menuPhotoExtension(mediaType: MenuPhotoMediaType): 'jpg' | 'png' | 'webp' {
  switch (mediaType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'jpg'
  }
}

export function mediaTypeFromStoragePath(storagePath: string): MenuPhotoMediaType {
  if (storagePath.endsWith('.png')) {
    return 'image/png'
  }
  if (storagePath.endsWith('.webp')) {
    return 'image/webp'
  }
  return 'image/jpeg'
}

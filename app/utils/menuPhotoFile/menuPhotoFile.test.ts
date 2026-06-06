import { describe, expect, it } from 'vitest'

import {
  estimateBase64ByteLength,
  isMenuPhotoMediaType,
  validateMenuPhotoPayload,
} from './menuPhotoFile'

describe('menuPhotoFile', () => {
  it('accepts supported media types', () => {
    expect(isMenuPhotoMediaType('image/jpeg')).toBe(true)
    expect(isMenuPhotoMediaType('image/gif')).toBe(false)
  })

  it('estimates base64 size', () => {
    expect(estimateBase64ByteLength('YWJj')).toBe(3)
  })

  it('rejects oversized payloads', () => {
    expect(() =>
      validateMenuPhotoPayload({
        mediaType: 'image/jpeg',
        imageBase64: 'a'.repeat(8_000_000),
      }),
    ).toThrow(/5 MB/)
  })
})

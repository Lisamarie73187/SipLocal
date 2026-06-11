import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { AdminAuthError, requireAdmin } from '@/lib/adminAuth.server'
import { fetchPageText } from '@/lib/scrape/fetchPageText'
import {
  parseEventsFromPageText,
  parseEventsFromPasteText,
  parseEventsFromPhoto,
  type ParseEventsResult,
} from '@/lib/scrape/parseEventsWithAnthropic'
import { MENU_PHOTO_MEDIA_TYPES } from '@/utils/menuPhotoFile'

function toAuthError(error: unknown): Error {
  if (error instanceof AdminAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

export const scrubEventsFromUrl = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      sourceUrl: z.string().url(),
    }),
  )
  .handler(async ({ data }): Promise<ParseEventsResult & { sourceUrl: string }> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    const pageText = await fetchPageText(data.sourceUrl)
    const result = await parseEventsFromPageText(pageText)
    return { ...result, sourceUrl: data.sourceUrl }
  })

export const parseEventsFromPaste = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      pasteText: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<ParseEventsResult> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    return parseEventsFromPasteText(data.pasteText)
  })

export const scrubEventsFromPhoto = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      imageBase64: z.string().min(1),
      mediaType: z.enum(MENU_PHOTO_MEDIA_TYPES),
    }),
  )
  .handler(async ({ data }): Promise<ParseEventsResult> => {
    try {
      await requireAdmin()
    } catch (error) {
      throw toAuthError(error)
    }

    return parseEventsFromPhoto(data.imageBase64, data.mediaType)
  })

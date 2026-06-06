import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { OwnerAuthError, requireAuthenticatedUser, requireVenueManager } from '@/lib/ownerAuth.server'
import { createSupabaseRequestClient } from '@/lib/supabaseRequest'
import { parseHappyHourWithAnthropic } from '@/lib/scrape/parseHappyHourWithAnthropic'
import type { ParseHappyHourPasteResult } from '@/utils/parseHappyHourPaste'

function toOwnerError(error: unknown): Error {
  if (error instanceof OwnerAuthError) {
    return error
  }
  return error instanceof Error ? error : new Error('Unexpected error')
}

export const parseHappyHourPasteOwner = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      pasteText: z.string().min(1),
    }),
  )
  .handler(async ({
    data,
  }): Promise<ParseHappyHourPasteResult & { parser: 'ai' }> => {
    try {
      await requireVenueManager(data.venueId)
    } catch (error) {
      throw toOwnerError(error)
    }

    const ai = await parseHappyHourWithAnthropic(data.pasteText)
    return { ...ai, parser: 'ai' }
  })

export const submitVenueClaimRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      venueId: z.string().uuid(),
      message: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      const { userId } = await requireAuthenticatedUser()
      const client = createSupabaseRequestClient()

      const { data: existingManager } = await client
        .from('venue_managers')
        .select('id')
        .eq('venue_id', data.venueId)
        .eq('user_id', userId)
        .maybeSingle()

      if (existingManager) {
        throw new Error('You already manage this venue.')
      }

      const { error } = await client.from('venue_claim_requests').insert({
        venue_id: data.venueId,
        user_id: userId,
        message: data.message?.trim() || null,
        status: 'pending',
      })

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already have a pending claim for this venue.')
        }
        throw error
      }

      return { ok: true }
    } catch (error) {
      throw toOwnerError(error)
    }
  })

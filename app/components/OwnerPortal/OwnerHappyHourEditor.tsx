import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { HappyHourPastePanel } from '@/components/HappyHourPastePanel/HappyHourPastePanel'
import { HappyHourMenuPhotoPanel } from '@/components/HappyHourMenuPhotoPanel/HappyHourMenuPhotoPanel'
import { HappyHourSlotsEditor } from '@/components/HappyHourSlotsEditor/HappyHourSlotsEditor'
import type { HappyHourSlotFormState } from '@/components/HappyHourSlotsEditor/HappyHourSlotsEditor.types'
import { OwnerVenuePreview } from '@/components/OwnerPortal/OwnerVenuePreview'
import { Button } from '@/components/ui/button'
import { parseHappyHourPasteOwner } from '@/server/ownerHappyHourPaste'
import { parseHappyHourMenuPhotoOwner, recordManagerMenuPhoto } from '@/server/menuPhotoSubmissions'
import { saveOwnerVenueHappyHours, type OwnerVenueDetail, type OwnerVenueEditorSlot } from '@/server/ownerVenues'
import { groupSlotsForEditor } from '@/utils/happyHourEditorSlots'
import { dealsFromParsedSlot, emptyOwnerDealRow } from '@/utils/ownerDealRows'
import type { ParsedHappyHourSlot } from '@/utils/parseHappyHourPaste'
import type { MenuPhotoPayload } from '@/utils/menuPhotoFile'
import { getStoredVenueDescription } from '@/utils/venueDisplay'

export interface OwnerHappyHourEditorProps {
  venue: OwnerVenueDetail
  initialSlots: OwnerVenueEditorSlot[]
}

function slotsToFormState(slots: OwnerVenueEditorSlot[]): HappyHourSlotFormState[] {
  return groupSlotsForEditor(
    slots.map((slot) => ({
      ...slot,
      data_status: 'pending_review' as const,
      is_active: true,
      confidence: null,
      source_urls: [] as string[],
    })),
  ).map((slot, index) => ({
    key: `slot-${index}`,
    days: slot.days,
    start_time: slot.start_time,
    end_time: slot.end_time,
    deal_summary: slot.deals.length > 0 ? null : slot.deal_summary,
    deals:
      slot.deals.length > 0
        ? slot.deals
        : [{ label: '', category: 'drinks' as const, price_text: null }],
  }))
}

function parsedSlotsToFormState(parsed: ParsedHappyHourSlot[]): HappyHourSlotFormState[] {
  return parsed.map((slot) => {
    const deals = dealsFromParsedSlot(slot)
    const hasDealRows = deals.some((deal) => deal.label.trim())

    return {
      key: `slot-${crypto.randomUUID()}`,
      days: slot.days,
      start_time: slot.start_time,
      end_time: slot.end_time,
      deal_summary: hasDealRows ? null : slot.deal_summary,
      deals: hasDealRows ? deals : [emptyOwnerDealRow()],
    }
  })
}

export function OwnerHappyHourEditor({ venue, initialSlots }: OwnerHappyHourEditorProps) {
  const [slots, setSlots] = useState<HappyHourSlotFormState[]>(() => slotsToFormState(initialSlots))
  const [pendingMenuPhoto, setPendingMenuPhoto] = useState<MenuPhotoPayload | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const parsePaste = useMemo(
    () => (pasteText: string) =>
      parseHappyHourPasteOwner({
        data: { venueId: venue.id, pasteText },
      }),
    [venue.id],
  )
  const venueDescription =
    getStoredVenueDescription(venue.description) ??
    (venue.previewSubtitle !== 'Happy hour spot' ? venue.previewSubtitle : null)

  const handleSave = async (): Promise<void> => {
    if (slots.some((slot) => slot.days.length === 0)) {
      setError('Each happy hour slot needs at least one day selected.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const groupedSlots = slots
        .filter((slot) => slot.start_time && slot.end_time && slot.days.length > 0)
        .map((slot) => {
          const dealRows = slot.deals.filter((deal) => deal.label.trim())
          return {
            days: slot.days,
            start_time: slot.start_time,
            end_time: slot.end_time,
            deal_summary: slot.deal_summary?.trim() || null,
            deals: dealRows,
          }
        })

      const result = await saveOwnerVenueHappyHours({
        data: {
          venueId: venue.id,
          slots: [],
          groupedSlots,
        },
      })

      if (pendingMenuPhoto) {
        await recordManagerMenuPhoto({
          data: {
            venueId: venue.id,
            imageBase64: pendingMenuPhoto.imageBase64,
            mediaType: pendingMenuPhoto.mediaType,
          },
        })
        setPendingMenuPhoto(null)
      }

      setSuccess(result.message)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:items-start">
      <div className="space-y-8 min-w-0">
        <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-dark">{venue.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{venue.address_line1}</p>
          {venueDescription ? (
            <p className="mt-2 text-sm leading-snug text-dark">{venueDescription}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {venue.city_name} · Changes are reviewed before appearing on the map
          </p>
        </section>

        <HappyHourPastePanel
          applyLabel="Apply to slots"
          appendModeLabel="Add more"
          parseMode="ai-only"
          parsePaste={parsePaste}
          onApply={(result, mode) => {
            if (result.slots.length === 0) {
              throw new Error(result.warnings[0] ?? 'Could not parse any happy hour slots.')
            }
            const nextSlots = parsedSlotsToFormState(result.slots)
            setSlots((current) => (mode === 'replace' ? nextSlots : [...current, ...nextSlots]))
            setError(null)
          }}
        />

        <HappyHourMenuPhotoPanel
          flow="manager"
          applyLabel="Apply to slots"
          appendModeLabel="Add more"
          saving={saving}
          parseMenuPhoto={(payload) =>
            parseHappyHourMenuPhotoOwner({
              data: {
                venueId: venue.id,
                imageBase64: payload.imageBase64,
                mediaType: payload.mediaType,
              },
            })
          }
          onPhotoStored={setPendingMenuPhoto}
          onApply={(result, mode) => {
            if (result.slots.length === 0) {
              throw new Error(result.warnings[0] ?? 'Could not parse any happy hour slots.')
            }
            const nextSlots = parsedSlotsToFormState(result.slots)
            setSlots((current) => (mode === 'replace' ? nextSlots : [...current, ...nextSlots]))
            setError(null)
          }}
        />

        <HappyHourSlotsEditor slots={slots} onChange={setSlots} showDealRows />

        <div className="space-y-3">
          <Button type="button" className="min-h-11 w-full" disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save for review
          </Button>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-dark" role="status">
              {success}
            </p>
          ) : null}
        </div>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-8">
        <OwnerVenuePreview venue={venue} slots={slots} />
      </aside>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatHappyHourDayLabel } from '@/utils/happyHourSchedule'
import { formatDealDisplayText } from '@/utils/dealChips'
import { dealsFromParsedSlot } from '@/utils/ownerDealRows'
import { readMenuPhotoFile, type MenuPhotoPayload } from '@/utils/menuPhotoFile'
import type { ParseHappyHourPasteResult } from '@/utils/parseHappyHourPaste'
import { cn } from '@/utils'

export interface HappyHourMenuPhotoPanelProps {
  flow: 'manager' | 'crowd'
  applyLabel?: string
  appendModeLabel?: string
  showModeToggle?: boolean
  saving?: boolean
  parseMenuPhoto: (payload: MenuPhotoPayload) => Promise<ParseHappyHourPasteResult & { parser: 'ai' }>
  onApply?: (result: ParseHappyHourPasteResult, mode: 'append' | 'replace') => void | Promise<void>
  submitCrowdPhoto?: (payload: MenuPhotoPayload) => Promise<{ message: string }>
  onPhotoStored?: (payload: MenuPhotoPayload) => void
}

export function HappyHourMenuPhotoPanel({
  flow,
  applyLabel = 'Apply to slots',
  appendModeLabel = 'Add more',
  showModeToggle = flow === 'manager',
  saving = false,
  parseMenuPhoto,
  onApply,
  submitCrowdPhoto,
  onPhotoStored,
}: HappyHourMenuPhotoPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoPayload, setPhotoPayload] = useState<MenuPhotoPayload | null>(null)
  const [parsedPreview, setParsedPreview] = useState<
    (ParseHappyHourPasteResult & { parser: 'ai' }) | null
  >(null)
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const busy = saving || scanning || submitting

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setError(null)
    setMessage(null)
    setParsedPreview(null)

    void readMenuPhotoFile(file)
      .then((payload) => {
        setPhotoPayload(payload)
        onPhotoStored?.(payload)
        setPreviewUrl(URL.createObjectURL(file))
      })
      .catch((readError) => {
        setPhotoPayload(null)
        setPreviewUrl(null)
        setError(readError instanceof Error ? readError.message : 'Could not read photo.')
      })
  }

  const handleScan = (): void => {
    if (!photoPayload) {
      setError('Choose a menu photo first.')
      return
    }

    setScanning(true)
    setError(null)
    setMessage(null)

    void parseMenuPhoto(photoPayload)
      .then((result) => {
        if (result.slots.length === 0) {
          throw new Error(result.warnings[0] ?? 'Could not read a happy hour schedule from that photo.')
        }
        setParsedPreview(result)
      })
      .catch((scanError) => {
        setParsedPreview(null)
        setError(scanError instanceof Error ? scanError.message : 'Menu scan failed.')
      })
      .finally(() => {
        setScanning(false)
      })
  }

  const handleApply = (): void => {
    if (!parsedPreview || !onApply) {
      return
    }

    setError(null)
    setMessage(null)
    setSubmitting(true)

    void Promise.resolve(onApply(parsedPreview, mode))
      .then(() => {
        setMessage(
          flow === 'manager'
            ? `Applied ${parsedPreview.slots.length} slot group${parsedPreview.slots.length === 1 ? '' : 's'} from the menu photo.`
            : 'Applied menu photo.',
        )
        setPhotoPayload(null)
        setParsedPreview(null)
        setPreviewUrl(null)
      })
      .catch((applyError) => {
        setError(applyError instanceof Error ? applyError.message : 'Apply failed.')
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handleCrowdSubmit = (): void => {
    if (!photoPayload || !submitCrowdPhoto) {
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    void submitCrowdPhoto(photoPayload)
      .then((result) => {
        setMessage(result.message)
        setPhotoPayload(null)
        setParsedPreview(null)
        setPreviewUrl(null)
      })
      .catch((submitError) => {
        setError(submitError instanceof Error ? submitError.message : 'Submit failed.')
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const preview = parsedPreview
  const previewSlots = useMemo(() => preview?.slots ?? [], [preview?.slots])

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-dark">Photo of happy hour menu</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {flow === 'manager'
            ? 'Take or upload a photo of your printed menu or board. We use AI to pull out days, times, and deals.'
            : 'Spotted an outdated listing? Upload a photo of the happy hour menu and we will review it.'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" />
          {photoPayload ? 'Choose another photo' : 'Take or upload photo'}
        </Button>

        {photoPayload ? (
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={busy}
            onClick={handleScan}
          >
            {scanning ? <Loader2 className="size-4 animate-spin" /> : null}
            Scan menu
          </Button>
        ) : null}
      </div>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Selected happy hour menu"
          className="max-h-56 w-full rounded-xl border border-border/70 object-contain bg-muted/30"
        />
      ) : null}

      {previewSlots.length > 0 ? (
        <ul className="space-y-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-dark">
          {previewSlots.map((slot, index) => {
            const dealRows = dealsFromParsedSlot(slot).filter((deal) => deal.label.trim())

            return (
              <li key={`${slot.start_time}-${slot.end_time}-${index}`}>
                <p className="font-medium">
                  {formatHappyHourDayLabel(slot.days)} · {slot.start_time}–{slot.end_time}
                </p>
                {dealRows.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 pl-2 text-muted-foreground">
                    {dealRows.map((deal, dealIndex) => (
                      <li key={`${index}-${dealIndex}`}>
                        {formatDealDisplayText(deal.label, deal.price_text)}
                      </li>
                    ))}
                  </ul>
                ) : slot.deal_summary?.trim() ? (
                  <p className="mt-1 pl-2 text-muted-foreground">{slot.deal_summary.trim()}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {flow === 'manager' && preview && onApply ? (
        <div className="space-y-2">
          {showModeToggle ? (
            <div
              className="inline-flex rounded-xl border border-border/70 bg-muted/40 p-1"
              role="group"
              aria-label="How to apply scanned slots"
            >
              <button
                type="button"
                onClick={() => setMode('append')}
                className={cn(
                  'min-h-9 rounded-lg px-3 text-sm font-medium transition-colors',
                  mode === 'append'
                    ? 'bg-card text-dark shadow-sm'
                    : 'text-muted-foreground hover:text-dark',
                )}
                aria-pressed={mode === 'append'}
              >
                {appendModeLabel}
              </button>
              <button
                type="button"
                onClick={() => setMode('replace')}
                className={cn(
                  'min-h-9 rounded-lg px-3 text-sm font-medium transition-colors',
                  mode === 'replace'
                    ? 'bg-card text-dark shadow-sm'
                    : 'text-muted-foreground hover:text-dark',
                )}
                aria-pressed={mode === 'replace'}
              >
                Replace all
              </button>
            </div>
          ) : null}

          <Button type="button" size="sm" className="min-h-11" disabled={busy} onClick={handleApply}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {applyLabel}
          </Button>
        </div>
      ) : null}

      {flow === 'crowd' && photoPayload && submitCrowdPhoto ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={busy}
          onClick={handleCrowdSubmit}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit menu photo for review
        </Button>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="text-xs text-dark" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}

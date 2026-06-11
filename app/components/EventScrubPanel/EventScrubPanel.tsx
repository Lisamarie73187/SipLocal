import { useRef, useState } from 'react'
import { Camera, ImagePlus, Link2, Loader2, Sparkles, Type } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { parseEventsFromPaste, scrubEventsFromPhoto, scrubEventsFromUrl } from '@/server/adminEventScrub'
import type { ParsedEvent } from '@/lib/scrape/parseEventsWithAnthropic'
import { readMenuPhotoFile, type MenuPhotoPayload } from '@/utils/menuPhotoFile'
import { getEventTypeLabel } from '@/utils/eventType'
import { getDayName } from '@/utils/happyHour'
import type { DayOfWeek } from '@/types/venue'
import { cn } from '@/utils'

const inputClassName =
  'h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-base text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

const textareaClassName =
  'min-h-32 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-base text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

export interface EventScrubPanelProps {
  onAdd: (events: ParsedEvent[], sourceUrl: string | null) => void | Promise<void>
}

function describeSchedule(event: ParsedEvent): string {
  const when =
    event.schedule_mode === 'dated' && event.event_date
      ? event.event_date
      : event.day_of_week != null
        ? `Every ${getDayName(event.day_of_week as DayOfWeek)}`
        : 'Unknown date'
  const time = event.end_time ? `${event.start_time}–${event.end_time}` : event.start_time
  return `${when} · ${time}`
}

export function EventScrubPanel({ onAdd }: EventScrubPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sourceUrl, setSourceUrl] = useState('')
  const [photoPayload, setPhotoPayload] = useState<MenuPhotoPayload | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')

  const [found, setFound] = useState<ParsedEvent[] | null>(null)
  const [foundSourceUrl, setFoundSourceUrl] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [warnings, setWarnings] = useState<string[]>([])

  const [scrubbing, setScrubbing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const busy = scrubbing || adding

  const resetResults = (): void => {
    setFound(null)
    setFoundSourceUrl(null)
    setSelected(new Set())
    setWarnings([])
    setMessage(null)
    setError(null)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setError(null)
    resetResults()

    void readMenuPhotoFile(file)
      .then((payload) => {
        setPhotoPayload(payload)
        setPhotoPreviewUrl(URL.createObjectURL(file))
      })
      .catch((readError) => {
        setPhotoPayload(null)
        setPhotoPreviewUrl(null)
        setError(readError instanceof Error ? readError.message : 'Could not read photo.')
      })
  }

  const applyResult = (result: { events: ParsedEvent[]; warnings: string[] }, fromUrl: string | null): void => {
    if (result.events.length === 0) {
      throw new Error(result.warnings[0] ?? 'No events found.')
    }
    setFound(result.events)
    setFoundSourceUrl(fromUrl)
    setSelected(new Set(result.events.map((_, index) => index)))
    setWarnings(result.warnings)
  }

  const handleScrubUrl = (): void => {
    const trimmed = sourceUrl.trim()
    if (!trimmed) {
      setError('Enter a source URL first.')
      return
    }

    setScrubbing(true)
    resetResults()

    void scrubEventsFromUrl({ data: { sourceUrl: trimmed } })
      .then((result) => applyResult(result, result.sourceUrl))
      .catch((scrubError) => {
        setError(scrubError instanceof Error ? scrubError.message : 'Could not scrub that URL.')
      })
      .finally(() => setScrubbing(false))
  }

  const handleParsePaste = (): void => {
    const trimmed = pasteText.trim()
    if (!trimmed) {
      setError('Paste some event info first.')
      return
    }

    setScrubbing(true)
    resetResults()

    void parseEventsFromPaste({ data: { pasteText: trimmed } })
      .then((result) => applyResult(result, null))
      .catch((parseError) => {
        setError(parseError instanceof Error ? parseError.message : 'Could not parse that text.')
      })
      .finally(() => setScrubbing(false))
  }

  const handleScrubPhoto = (): void => {
    if (!photoPayload) {
      setError('Choose a photo first.')
      return
    }

    setScrubbing(true)
    resetResults()

    void scrubEventsFromPhoto({ data: photoPayload })
      .then((result) => applyResult(result, null))
      .catch((scrubError) => {
        setError(scrubError instanceof Error ? scrubError.message : 'Could not read that photo.')
      })
      .finally(() => setScrubbing(false))
  }

  const toggleSelected = (index: number): void => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleAddSelected = (): void => {
    if (!found) {
      return
    }
    const chosen = found.filter((_, index) => selected.has(index))
    if (chosen.length === 0) {
      setError('Select at least one event to add.')
      return
    }

    setAdding(true)
    setError(null)
    setMessage(null)

    void Promise.resolve(onAdd(chosen, foundSourceUrl))
      .then(() => {
        setMessage(`Added ${chosen.length} event${chosen.length === 1 ? '' : 's'} to the list below. Review and save.`)
        setFound(null)
        setFoundSourceUrl(null)
        setSelected(new Set())
        setSourceUrl('')
        setPhotoPayload(null)
        setPhotoPreviewUrl(null)
        setPasteText('')
      })
      .catch((addError) => {
        setError(addError instanceof Error ? addError.message : 'Could not add events.')
      })
      .finally(() => setAdding(false))
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-dark">Scrub events from a source</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste a link to the venue's events page, upload a photo of a flyer or calendar, or paste
          event details directly — AI will pull out individual events for you to review and add.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-dark">Source URL</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={sourceUrl}
              onChange={(change) => setSourceUrl(change.target.value)}
              className={inputClassName}
              placeholder="https://venue.com/events"
              inputMode="url"
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 shrink-0"
              disabled={busy || !sourceUrl.trim()}
              onClick={handleScrubUrl}
            >
              {scrubbing ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Scrub URL
            </Button>
          </div>
        </label>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <span className="text-sm font-medium text-dark">Or upload a photo</span>
        <input
          ref={fileInputRef}
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
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="size-4" />
            {photoPayload ? (
              <>
                <ImagePlus className="size-4" />
                Choose another photo
              </>
            ) : (
              <>
                <Camera className="size-4" />
                Take or upload photo
              </>
            )}
          </Button>
          {photoPayload ? (
            <Button type="button" size="sm" className="min-h-11" disabled={busy} onClick={handleScrubPhoto}>
              {scrubbing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Scan photo
            </Button>
          ) : null}
        </div>
        {photoPreviewUrl ? (
          <img
            src={photoPreviewUrl}
            alt="Selected events flyer or calendar"
            className="max-h-56 w-full rounded-xl border border-border/70 object-contain bg-muted/30"
          />
        ) : null}
      </div>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-dark">Or paste event info</span>
          <textarea
            value={pasteText}
            onChange={(change) => setPasteText(change.target.value)}
            className={textareaClassName}
            placeholder={'Trivia Night every Tuesday 7-9pm\nLive music Saturday 6/14 at 8pm with The Locals'}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={busy || !pasteText.trim()}
          onClick={handleParsePaste}
        >
          {scrubbing ? <Loader2 className="size-4 animate-spin" /> : <Type className="size-4" />}
          Parse with AI
        </Button>
      </div>

      {found && found.length > 0 ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-sm font-medium text-dark">
            Found {found.length} event{found.length === 1 ? '' : 's'} — select which to add
          </p>
          <ul className="space-y-2">
            {found.map((event, index) => (
              <li key={`${event.title}-${index}`}>
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                    selected.has(index)
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/70 bg-background',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(index)}
                    onChange={() => toggleSelected(index)}
                    className="mt-0.5 size-5 shrink-0 rounded border-border"
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium text-dark">{event.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {getEventTypeLabel(event.event_type)} · {describeSchedule(event)}
                    </span>
                    {event.description ? (
                      <span className="block text-xs text-muted-foreground">{event.description}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <Button type="button" className="min-h-11" disabled={busy || selected.size === 0} onClick={handleAddSelected}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : null}
            Add {selected.size || ''} selected event{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <p className="text-xs text-secondary" role="status">
          {warnings.join(' ')}
        </p>
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

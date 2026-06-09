import { useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  scrubVenueAll,
  scrubVenueEvents,
  scrubVenueHappyHours,
  scrubVenueInfo,
  type RescrubSource,
} from '@/server/adminVenueRescrub'
import type { ParsedEvent } from '@/lib/scrape/parseEventsWithAnthropic'
import type { ParsedHappyHourSlot } from '@/utils/parseHappyHourPaste'

export interface AdminVenueRescrubCardProps {
  venueId: string
  hasWebsite: boolean
  hasPlaceId: boolean
  onVenueInfoApplied: () => Promise<void>
  onHappyHoursScraped: (slots: ParsedHappyHourSlot[]) => void
  onEventsScraped: (events: ParsedEvent[]) => void
}

type ScrubType = 'venue' | 'happyhour' | 'events' | 'all'

interface ScrubState {
  running: ScrubType | null
  error: string | null
  lastSource: RescrubSource | null
  lastFields: string[]
  lastSlotCount: number | null
  lastEventCount: number | null
}

export function AdminVenueRescrubCard({
  venueId,
  hasWebsite,
  hasPlaceId,
  onVenueInfoApplied,
  onHappyHoursScraped,
  onEventsScraped,
}: AdminVenueRescrubCardProps) {
  const [state, setState] = useState<ScrubState>({
    running: null,
    error: null,
    lastSource: null,
    lastFields: [],
    lastSlotCount: null,
    lastEventCount: null,
  })

  if (!hasWebsite && !hasPlaceId) {
    return null
  }

  const canScrubHhOrEvents = hasWebsite

  const handleScrub = (type: ScrubType): void => {
    setState((s) => ({ ...s, running: type, error: null, lastSource: null, lastFields: [], lastSlotCount: null, lastEventCount: null }))

    void (async () => {
      try {
        if (type === 'venue') {
          const result = await scrubVenueInfo({ data: { venueId } })
          setState((s) => ({ ...s, running: null, lastSource: result.source, lastFields: result.fieldsUpdated }))
          await onVenueInfoApplied()
        } else if (type === 'happyhour') {
          const result = await scrubVenueHappyHours({ data: { venueId } })
          setState((s) => ({ ...s, running: null, lastSource: result.source, lastSlotCount: result.slots.length }))
          onHappyHoursScraped(result.slots)
        } else if (type === 'events') {
          const result = await scrubVenueEvents({ data: { venueId } })
          setState((s) => ({ ...s, running: null, lastEventCount: result.events.length }))
          onEventsScraped(result.events)
        } else {
          const result = await scrubVenueAll({ data: { venueId } })
          setState((s) => ({
            ...s,
            running: null,
            lastSource: result.venueInfo.source,
            lastFields: result.venueInfo.fieldsUpdated,
            lastSlotCount: result.slots.length,
            lastEventCount: result.events.length,
          }))
          await onVenueInfoApplied()
          if (result.slots.length > 0) {
            onHappyHoursScraped(result.slots)
          }
          if (result.events.length > 0) {
            onEventsScraped(result.events)
          }
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          running: null,
          error: err instanceof Error ? err.message : 'Scrub failed.',
        }))
      }
    })()
  }

  const isRunning = state.running !== null

  const showResult =
    state.lastSource !== null ||
    state.lastSlotCount !== null ||
    state.lastEventCount !== null

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <RefreshCw className="size-4 text-muted-foreground" />
        <h2 className="font-heading text-lg font-semibold text-dark">Rescrub</h2>
      </div>

      {!hasWebsite ? (
        <div className="flex items-start gap-2 rounded-xl border border-secondary/50 bg-secondary/10 px-4 py-3 text-sm text-dark">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-secondary" />
          <span>No website set — venue info will be pulled from Google instead.</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9 gap-1.5"
          disabled={isRunning}
          onClick={() => handleScrub('venue')}
        >
          {state.running === 'venue' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Venue info
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9 gap-1.5"
          disabled={isRunning || !canScrubHhOrEvents}
          title={canScrubHhOrEvents ? undefined : 'Requires a website URL'}
          onClick={() => handleScrub('happyhour')}
        >
          {state.running === 'happyhour' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Happy hours
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9 gap-1.5"
          disabled={isRunning || !canScrubHhOrEvents}
          title={canScrubHhOrEvents ? undefined : 'Requires a website URL'}
          onClick={() => handleScrub('events')}
        >
          {state.running === 'events' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Events
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-h-9 gap-1.5"
          disabled={isRunning}
          onClick={() => handleScrub('all')}
        >
          {state.running === 'all' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          All three
        </Button>
      </div>

      {isRunning ? (
        <p className="text-sm text-muted-foreground">
          Scrubbing{' '}
          {state.running === 'venue'
            ? 'venue info'
            : state.running === 'happyhour'
              ? 'happy hours'
              : state.running === 'events'
                ? 'events'
                : 'venue info, happy hours, and events'}
          …
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      {showResult && !isRunning ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          {state.lastSource === 'google' ? (
            <div className="flex items-start gap-2 rounded-xl border border-secondary/50 bg-secondary/10 px-4 py-2 text-sm text-dark">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-secondary" />
              <span>No website found — venue data was pulled from Google.</span>
            </div>
          ) : null}
          {state.lastFields.length > 0 ? (
            <p>Venue fields updated: {state.lastFields.join(', ')}</p>
          ) : null}
          {state.lastSlotCount !== null ? (
            <p>
              Found {state.lastSlotCount} happy hour slot{state.lastSlotCount === 1 ? '' : 's'} — review in the happy hours section below.
            </p>
          ) : null}
          {state.lastEventCount !== null ? (
            <p>
              Found {state.lastEventCount} event{state.lastEventCount === 1 ? '' : 's'} — review in the events section below.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

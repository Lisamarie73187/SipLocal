import { useEffect, useState } from 'react'
import { Copy, Loader2, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { VenueSourceLinks } from '@/components/VenueSourceLinks/VenueSourceLinks'
import { saveAdminVenueEvents } from '@/server/adminVenues'
import type { AdminVenueEditorEvent } from '@/server/adminVenues'
import type { EventType } from '@/types/event'
import type { DayOfWeek, ScrapeConfidence } from '@/types/venue'
import { getDayName } from '@/utils/happyHour'
import { EVENT_TYPE_ADMIN_OPTIONS } from '@/utils/eventType'
import { SCRAPE_CONFIDENCE_ADMIN_OPTIONS } from '@/utils/venueTrust'
import { cn } from '@/utils'

const inputClassName =
  'h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-base text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

const labelClassName = 'text-sm font-medium text-dark'

const WEEKDAY_OPTIONS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]

type EventScheduleMode = 'recurring' | 'dated'

export interface EventFormState {
  key: string
  id: string | null
  title: string
  description: string
  event_type: EventType
  schedule_mode: EventScheduleMode
  event_date: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  is_published: boolean
  confidence: ScrapeConfidence | null
  source_urls: string[]
}

export function eventsToFormState(events: AdminVenueEditorEvent[]): EventFormState[] {
  return events.map((event) => ({
    key: event.id,
    id: event.id,
    title: event.title,
    description: event.description ?? '',
    event_type: event.event_type,
    schedule_mode: event.event_date ? 'dated' : 'recurring',
    event_date: event.event_date ?? '',
    day_of_week: (event.day_of_week ?? 4) as DayOfWeek,
    start_time: event.start_time,
    end_time: event.end_time ?? '',
    is_published: event.is_published,
    confidence: event.confidence,
    source_urls: event.source_urls,
  }))
}

function newEmptyEvent(): EventFormState {
  return {
    key: `event-${crypto.randomUUID()}`,
    id: null,
    title: '',
    description: '',
    event_type: 'other',
    schedule_mode: 'dated',
    event_date: '',
    day_of_week: 4,
    start_time: '19:00',
    end_time: '',
    is_published: false,
    confidence: null,
    source_urls: [],
  }
}

function duplicateEvent(event: EventFormState): EventFormState {
  return {
    ...event,
    key: `event-${crypto.randomUUID()}`,
    id: null,
    source_urls: [...event.source_urls],
  }
}

interface AdminVenueEventsSectionProps {
  venueId: string
  cityId: string
  cityTimezone: string
  initialEvents: AdminVenueEditorEvent[]
  onReload: () => Promise<void>
}

export function AdminVenueEventsSection({
  venueId,
  cityId,
  cityTimezone,
  initialEvents,
  onReload,
}: AdminVenueEventsSectionProps) {
  const [events, setEvents] = useState<EventFormState[]>(() => eventsToFormState(initialEvents))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  useEffect(() => {
    setEvents(eventsToFormState(initialEvents))
  }, [initialEvents])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    setSavedNotice(null)

    try {
      for (const event of events) {
        if (!event.title.trim()) {
          throw new Error('Every event needs a title (or remove empty rows).')
        }
        if (!event.start_time.trim()) {
          throw new Error(`Invalid start time for “${event.title}”.`)
        }
      }

      const result = await saveAdminVenueEvents({
        data: {
          venueId,
          cityId,
          events: events.map((event) => ({
            id: event.id ?? undefined,
            title: event.title.trim(),
            description: event.description.trim() || null,
            event_type: event.event_type,
            event_date:
              event.schedule_mode === 'dated' && event.event_date.trim()
                ? event.event_date.trim()
                : undefined,
            day_of_week: event.schedule_mode === 'recurring' ? event.day_of_week : undefined,
            start_time: event.start_time,
            end_time: event.end_time.trim() || undefined,
            is_published: event.is_published,
            confidence: event.confidence,
          })),
        },
      })

      await onReload()
      setSavedNotice(
        `Saved ${result.saved} event${result.saved === 1 ? '' : 's'}. Published events appear on the discovery map.`,
      )
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save events')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-secondary/30 bg-secondary/5 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dark">Events</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Weekly or dated happenings (trivia, live music, etc.). Times are in{' '}
            <span className="font-medium text-dark">{cityTimezone}</span>. Publish to show on the
            public map.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEvents((current) => [...current, newEmptyEvent()])}>
          <Plus className="size-4" />
          Add event
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events yet. Add one manually below.
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((event, index) => (
            <li
              key={event.key}
              className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-dark">
                  Event {index + 1}
                  {event.is_published ? (
                    <span className="ml-2 rounded-full bg-open/15 px-2 py-0.5 text-xs font-semibold text-open">
                      Published
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      Draft
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Duplicate event"
                    onClick={() =>
                      setEvents((current) => {
                        const index = current.findIndex((row) => row.key === event.key)
                        if (index === -1) {
                          return current
                        }
                        const copy = duplicateEvent(event)
                        return [
                          ...current.slice(0, index + 1),
                          copy,
                          ...current.slice(index + 1),
                        ]
                      })
                    }
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-dark"
                  >
                    <Copy className="size-4 shrink-0" aria-hidden />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    aria-label="Remove event"
                    onClick={() =>
                      setEvents((current) => current.filter((row) => row.key !== event.key))
                    }
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              <label className="block space-y-2">
                <span className={labelClassName}>Title</span>
                <input
                  value={event.title}
                  onChange={(change) =>
                    setEvents((current) =>
                      current.map((row) =>
                        row.key === event.key ? { ...row, title: change.target.value } : row,
                      ),
                    )
                  }
                  className={inputClassName}
                  placeholder="Trivia Night"
                />
              </label>

              <label className="block space-y-2">
                <span className={labelClassName}>Description (optional)</span>
                <textarea
                  value={event.description}
                  onChange={(change) =>
                    setEvents((current) =>
                      current.map((row) =>
                        row.key === event.key
                          ? { ...row, description: change.target.value }
                          : row,
                      ),
                    )
                  }
                  rows={2}
                  className={cn(inputClassName, 'min-h-[4.5rem] resize-y py-2')}
                  placeholder="Weekly pub trivia with prizes"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className={labelClassName}>Type</span>
                  <select
                    value={event.event_type}
                    onChange={(change) =>
                      setEvents((current) =>
                        current.map((row) =>
                          row.key === event.key
                            ? { ...row, event_type: change.target.value as EventType }
                            : row,
                        ),
                      )
                    }
                    className={inputClassName}
                  >
                    {EVENT_TYPE_ADMIN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border/70 bg-background px-3">
                  <input
                    type="checkbox"
                    checked={event.is_published}
                    onChange={(change) =>
                      setEvents((current) =>
                        current.map((row) =>
                          row.key === event.key
                            ? { ...row, is_published: change.target.checked }
                            : row,
                        ),
                      )
                    }
                    className="size-5 rounded border-border"
                  />
                  <span className="text-sm font-medium text-dark">Published on map</span>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className={labelClassName}>Schedule</span>
                  <select
                    value={event.schedule_mode}
                    onChange={(change) =>
                      setEvents((current) =>
                        current.map((row) =>
                          row.key === event.key
                            ? {
                                ...row,
                                schedule_mode: change.target.value as EventScheduleMode,
                              }
                            : row,
                        ),
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="dated">Specific date</option>
                    <option value="recurring">Every week</option>
                  </select>
                </label>

                {event.schedule_mode === 'dated' ? (
                  <label className="block space-y-2">
                    <span className={labelClassName}>Date</span>
                    <input
                      type="date"
                      required
                      value={event.event_date}
                      onChange={(change) =>
                        setEvents((current) =>
                          current.map((row) =>
                            row.key === event.key
                              ? { ...row, event_date: change.target.value }
                              : row,
                          ),
                        )
                      }
                      className={inputClassName}
                    />
                  </label>
                ) : (
                  <label className="block space-y-2">
                    <span className={labelClassName}>Day of week</span>
                    <select
                      value={event.day_of_week}
                      onChange={(change) =>
                        setEvents((current) =>
                          current.map((row) =>
                            row.key === event.key
                              ? {
                                  ...row,
                                  day_of_week: Number(change.target.value) as DayOfWeek,
                                }
                              : row,
                          ),
                        )
                      }
                      className={inputClassName}
                    >
                      {WEEKDAY_OPTIONS.map((day) => (
                        <option key={day} value={day}>
                          {getDayName(day)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <label className="block space-y-2">
                <span className={labelClassName}>Confidence</span>
                <select
                  value={event.confidence ?? ''}
                  onChange={(change) =>
                    setEvents((current) =>
                      current.map((row) =>
                        row.key === event.key
                          ? {
                              ...row,
                              confidence:
                                change.target.value === ''
                                  ? null
                                  : (change.target.value as ScrapeConfidence),
                            }
                          : row,
                      ),
                    )
                  }
                  className={inputClassName}
                >
                  {SCRAPE_CONFIDENCE_ADMIN_OPTIONS.map((option) => (
                    <option key={option.value || 'unset'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {event.source_urls.length > 0 ? (
                <VenueSourceLinks sourceUrls={event.source_urls} />
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className={labelClassName}>Start time</span>
                  <input
                    type="time"
                    required
                    value={event.start_time}
                    onChange={(change) =>
                      setEvents((current) =>
                        current.map((row) =>
                          row.key === event.key
                            ? { ...row, start_time: change.target.value }
                            : row,
                        ),
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="block space-y-2">
                  <span className={labelClassName}>End time (optional)</span>
                  <input
                    type="time"
                    value={event.end_time}
                    onChange={(change) =>
                      setEvents((current) =>
                        current.map((row) =>
                          row.key === event.key
                            ? { ...row, end_time: change.target.value }
                            : row,
                        ),
                      )
                    }
                    className={inputClassName}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void handleSave()}
          className="min-h-11"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Saving events…
            </>
          ) : (
            'Save events'
          )}
        </Button>
      </div>

      {savedNotice ? (
        <p className="rounded-xl border border-open/40 bg-open/10 px-4 py-3 text-sm text-dark" role="status">
          {savedNotice}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}

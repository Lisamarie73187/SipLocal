import type { DayOfWeek } from '@/types/venue'
import {
  formatTime12h,
  getDayName,
  getDayOfWeekInTimezone,
  getMinutesInTimezone,
  timeToMinutes,
} from '@/utils/happyHour'
import type { ViewDayFilter } from '@/hooks/useDiscoveryFilters'

export type EventTimelineSectionId =
  | 'happening_now'
  | 'starting_soon'
  | 'later_tonight'
  | 'upcoming'
  | 'search_results'

export interface EventTimelinePlacement {
  sectionId: EventTimelineSectionId
  sectionTitle: string
  sectionSortKey: number
  badgeTone: 'open' | 'soon' | 'scheduled'
  badgeLabel: string
  timeWindow: string
}

export interface EventSchedule {
  event_date: string | null
  day_of_week: number | null
  start_time: string
  end_time: string | null
}

const STARTING_SOON_MINUTES = 120

function eventEndMinutes(startMinutes: number, endTime: string | null): number {
  if (endTime) {
    return timeToMinutes(endTime)
  }
  return startMinutes + STARTING_SOON_MINUTES
}

export function formatEventDateLabel(
  schedule: Pick<EventSchedule, 'event_date' | 'day_of_week'>,
  options?: { long?: boolean },
): string {
  if (schedule.event_date) {
    const parsed = new Date(`${schedule.event_date}T12:00:00`)
    if (Number.isNaN(parsed.getTime())) {
      return schedule.event_date
    }
    return new Intl.DateTimeFormat('en-US', {
      weekday: options?.long ? 'long' : 'short',
      month: 'short',
      day: 'numeric',
    }).format(parsed)
  }
  if (schedule.day_of_week != null) {
    const dayName = getDayName(schedule.day_of_week as DayOfWeek)
    return options?.long ? `Every ${dayName}` : `Every ${dayName}`
  }
  return ''
}

export function formatEventTimeRange(
  schedule: Pick<EventSchedule, 'start_time' | 'end_time'>,
): string {
  const startLabel = formatTime12h(schedule.start_time)
  const endLabel = schedule.end_time ? formatTime12h(schedule.end_time) : null
  return endLabel ? `${startLabel} – ${endLabel}` : startLabel
}

function formatEventTimeWindow(schedule: EventSchedule): string {
  const timeOnly = formatEventTimeRange(schedule)
  const dateLabel = formatEventDateLabel(schedule)
  if (dateLabel) {
    return `${dateLabel} · ${timeOnly}`
  }
  return timeOnly
}

function formatShortDate(eventDate: string): string {
  return formatEventDateLabel({ event_date: eventDate, day_of_week: null })
}

export function getTodayDateString(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const part = (type: string): string =>
    parts.find((entry) => entry.type === type)?.value ?? '00'

  return `${part('year')}-${part('month')}-${part('day')}`
}

function dayOfWeekFromDateString(eventDate: string, timeZone: string): DayOfWeek {
  const noonUtc = new Date(`${eventDate}T12:00:00Z`)
  return getDayOfWeekInTimezone(noonUtc, timeZone)
}

function resolveScheduleDay(schedule: EventSchedule, timeZone: string): DayOfWeek | null {
  if (schedule.event_date) {
    return dayOfWeekFromDateString(schedule.event_date, timeZone)
  }
  if (schedule.day_of_week != null) {
    return schedule.day_of_week as DayOfWeek
  }
  return null
}

export function isEventOnViewDay(
  schedule: EventSchedule,
  viewDay: ViewDayFilter,
  now: Date,
  timeZone: string,
): boolean {
  const todayIso = getTodayDateString(now, timeZone)
  const scheduleDay = resolveScheduleDay(schedule, timeZone)
  if (scheduleDay == null) {
    return false
  }

  if (schedule.event_date) {
    if (schedule.event_date < todayIso) {
      return false
    }
    if (viewDay === 'any') {
      return schedule.event_date === todayIso
    }
    return scheduleDay === viewDay
  }

  if (viewDay === 'any') {
    const today = getDayOfWeekInTimezone(now, timeZone)
    return schedule.day_of_week === today
  }
  return schedule.day_of_week === viewDay
}

export function eventMatchesTimeAt(
  schedule: EventSchedule,
  viewDay: ViewDayFilter,
  timeAtMinutes: number,
  now: Date,
  timeZone: string,
): boolean {
  if (!isEventOnViewDay(schedule, viewDay, now, timeZone)) {
    return false
  }

  const startMinutes = timeToMinutes(schedule.start_time)
  const endMinutes = eventEndMinutes(startMinutes, schedule.end_time)
  return startMinutes <= timeAtMinutes && endMinutes >= timeAtMinutes
}

export function getEventTimelinePlacement(
  schedule: EventSchedule,
  viewDay: ViewDayFilter,
  now: Date,
  timeZone: string,
): EventTimelinePlacement | null {
  const todayIso = getTodayDateString(now, timeZone)
  const today = getDayOfWeekInTimezone(now, timeZone)
  const scheduleDay = resolveScheduleDay(schedule, timeZone)
  const timeWindow = formatEventTimeWindow(schedule)

  if (scheduleDay == null) {
    return null
  }

  if (schedule.event_date && schedule.event_date < todayIso) {
    return null
  }

  const targetDay = viewDay === 'any' ? today : viewDay

  if (schedule.event_date) {
    const isToday = schedule.event_date === todayIso

    if (!isToday) {
      if (viewDay === 'any') {
        return null
      }
      if (scheduleDay !== targetDay) {
        return null
      }
      return {
        sectionId: 'upcoming',
        sectionTitle: 'Upcoming',
        sectionSortKey: 3,
        badgeTone: 'scheduled',
        badgeLabel: formatShortDate(schedule.event_date),
        timeWindow,
      }
    }

    return placementForTodayTimes(schedule, timeZone, now, timeWindow)
  }

  if (schedule.day_of_week !== targetDay) {
    if (viewDay === 'any') {
      return null
    }
    return {
      sectionId: 'upcoming',
      sectionTitle: 'Upcoming',
      sectionSortKey: 3,
      badgeTone: 'scheduled',
      badgeLabel: getDayName(schedule.day_of_week as DayOfWeek),
      timeWindow,
    }
  }

  const isCalendarToday = schedule.day_of_week === today
  if (!isCalendarToday) {
    return {
      sectionId: 'upcoming',
      sectionTitle: 'Upcoming',
      sectionSortKey: 3,
      badgeTone: 'scheduled',
      badgeLabel: getDayName(schedule.day_of_week as DayOfWeek),
      timeWindow,
    }
  }

  return placementForTodayTimes(schedule, timeZone, now, timeWindow)
}

function placementForTodayTimes(
  schedule: EventSchedule,
  timeZone: string,
  now: Date,
  timeWindow: string,
): EventTimelinePlacement | null {
  const current = getMinutesInTimezone(now, timeZone)
  const start = timeToMinutes(schedule.start_time)
  const end = eventEndMinutes(start, schedule.end_time)
  const startLabel = formatTime12h(schedule.start_time)

  if (current >= start && current < end) {
    return {
      sectionId: 'happening_now',
      sectionTitle: 'Happening now',
      sectionSortKey: 0,
      badgeTone: 'open',
      badgeLabel: 'Now',
      timeWindow,
    }
  }

  const minutesUntilStart = start - current
  if (minutesUntilStart > 0 && minutesUntilStart <= STARTING_SOON_MINUTES) {
    return {
      sectionId: 'starting_soon',
      sectionTitle: 'Starting soon',
      sectionSortKey: 1,
      badgeTone: 'soon',
      badgeLabel: `Starts in ${minutesUntilStart} min`,
      timeWindow,
    }
  }

  if (minutesUntilStart > 0) {
    return {
      sectionId: 'later_tonight',
      sectionTitle: 'Later tonight',
      sectionSortKey: 2,
      badgeTone: 'scheduled',
      badgeLabel: startLabel,
      timeWindow,
    }
  }

  return null
}

export function isViewingTodayForEvents(viewDay: ViewDayFilter, now: Date, timeZone: string): boolean {
  if (viewDay === 'any') {
    return true
  }
  return viewDay === getDayOfWeekInTimezone(now, timeZone)
}

import type { DayOfWeek, DealCategory, HappyHourSlot, HappyHourSlotWithDeals } from '@/types/venue'

const WEEKDAY_TO_DAY: Record<string, DayOfWeek> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export type HappyHourStatusKind = 'active' | 'later_today' | 'ended_today' | 'none_today'

export interface HappyHourStatus {
  kind: HappyHourStatusKind
  label: string
  activeSlot: HappyHourSlot | null
}

export function getDayOfWeekInTimezone(date: Date, timeZone: string): DayOfWeek {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)
  return WEEKDAY_TO_DAY[weekday] ?? (date.getDay() as DayOfWeek)
}

export function getMinutesInTimezone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

export function formatTime12h(time: string): string {
  const total = timeToMinutes(time)
  const hours24 = Math.floor(total / 60)
  const minutes = total % 60
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return minutes === 0
    ? `${hours12} ${period}`
    : `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

export function isOvernightSlot(slot: Pick<HappyHourSlot, 'start_time' | 'end_time'>): boolean {
  return timeToMinutes(slot.end_time) <= timeToMinutes(slot.start_time)
}

export function isSlotActiveNow(
  slot: Pick<HappyHourSlot, 'day_of_week' | 'start_time' | 'end_time' | 'is_active'>,
  now: Date,
  timeZone: string,
): boolean {
  if (!slot.is_active) {
    return false
  }

  const today = getDayOfWeekInTimezone(now, timeZone)
  const current = getMinutesInTimezone(now, timeZone)
  const start = timeToMinutes(slot.start_time)
  const end = timeToMinutes(slot.end_time)

  if (isOvernightSlot(slot)) {
    // Overnight slot: active from start on its day through end on the next day.
    // Check if we're past start on the slot's day, or before end on the following day.
    const yesterday = ((today - 1 + 7) % 7) as typeof today
    if (slot.day_of_week === today && current >= start) return true
    if (slot.day_of_week === yesterday && current < end) return true
    return false
  }

  if (slot.day_of_week !== today) {
    return false
  }
  return current >= start && current < end
}

export function getSlotsForDay(
  slots: HappyHourSlot[],
  day: DayOfWeek,
): HappyHourSlot[] {
  return slots.filter((slot) => slot.is_active && slot.day_of_week === day)
}

export function getVenueCategoryLabel(categories: DealCategory[]): string {
  const set = new Set(categories)
  if (set.has('both') || (set.has('drinks') && set.has('food'))) {
    return 'Drinks & food'
  }
  if (set.has('drinks')) {
    return 'Drinks'
  }
  if (set.has('food')) {
    return 'Food'
  }
  if (set.has('other')) {
    return 'Specials'
  }
  return 'Happy hour'
}

export function collectVenueCategories(slots: HappyHourSlot[]): DealCategory[] {
  return [...new Set(slots.flatMap((slot) => slot.categories))]
}

export function getHappyHourStatus(
  slots: HappyHourSlot[],
  now: Date,
  timeZone: string,
): HappyHourStatus {
  const today = getDayOfWeekInTimezone(now, timeZone)
  const yesterday = ((today - 1 + 7) % 7) as DayOfWeek
  const todaySlots = getSlotsForDay(slots, today).sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
  )
  const yesterdayOvernightSlots = getSlotsForDay(slots, yesterday).filter(isOvernightSlot)
  const allRelevantSlots = [...yesterdayOvernightSlots, ...todaySlots]

  if (allRelevantSlots.length === 0) {
    return { kind: 'none_today', label: 'No happy hour today', activeSlot: null }
  }

  const currentMinutes = getMinutesInTimezone(now, timeZone)
  const activeSlot =
    allRelevantSlots.find((slot) => isSlotActiveNow(slot, now, timeZone)) ?? null

  if (activeSlot) {
    return {
      kind: 'active',
      label: `Happy hour now · ends ${formatTime12h(activeSlot.end_time)}`,
      activeSlot,
    }
  }

  const upcoming = todaySlots.find((slot) => timeToMinutes(slot.start_time) > currentMinutes)
  if (upcoming) {
    return {
      kind: 'later_today',
      label: `Starts ${formatTime12h(upcoming.start_time)}`,
      activeSlot: null,
    }
  }

  return { kind: 'ended_today', label: 'Happy hour ended for today', activeSlot: null }
}

export function isVenueActiveNow(
  slots: HappyHourSlot[],
  now: Date,
  timeZone: string,
): boolean {
  return slots.some((slot) => slot.is_active && isSlotActiveNow(slot, now, timeZone))
}

/** Map pin timing status — live tiers, other-weekday, or hidden. */
export type MapPinStatus =
  | 'happening_now'
  | 'starting_soon'
  | 'later_tonight'
  | 'other_day'
  | 'none'

export const MAP_PIN_STATUS_PRIORITY: Record<MapPinStatus, number> = {
  happening_now: 3,
  starting_soon: 2,
  later_tonight: 1,
  other_day: 1,
  none: 0,
}

export function getVenueMapPinStatus(
  slots: HappyHourSlot[],
  now: Date,
  timeZone: string,
  viewDay: 'any' | DayOfWeek = 'any',
): MapPinStatus {
  const today = getDayOfWeekInTimezone(now, timeZone)

  if (viewDay !== 'any' && viewDay !== today) {
    return getSlotsForDay(slots, viewDay).length > 0 ? 'other_day' : 'none'
  }

  const placement = getVenueTimelinePlacement(slots, now, timeZone)
  if (!placement) {
    return 'none'
  }

  if (placement.sectionId === 'happening_now') {
    return 'happening_now'
  }
  if (placement.sectionId === 'starting_soon') {
    return 'starting_soon'
  }
  return 'later_tonight'
}

export function highestMapPinStatus(statuses: MapPinStatus[]): MapPinStatus {
  let best: MapPinStatus = 'none'
  let bestPriority = MAP_PIN_STATUS_PRIORITY.none

  for (const status of statuses) {
    const priority = MAP_PIN_STATUS_PRIORITY[status]
    if (priority > bestPriority) {
      best = status
      bestPriority = priority
    }
  }

  return best
}

export type TimelineBadgeTone = 'open' | 'soon' | 'scheduled'

export interface VenueTimelinePlacement {
  sectionId: 'happening_now' | 'starting_soon' | 'later_tonight' | `time_${number}`
  sectionTitle: string
  sectionSortKey: number
  focusSlot: HappyHourSlot
  badgeTone: TimelineBadgeTone
  badgeLabel: string
  hhWindow: string
  minutesUntilStart: number | null
}

const STARTING_SOON_MINUTES = 60
const LATER_TONIGHT_START_MINUTES = 20 * 60

export function isStartsInBadgeLabel(label: string): boolean {
  return label.startsWith('Starts') || label === 'Starting now'
}

/** Hide relative “Starts in …” copy when browsing a day other than today. */
export function resolveDisplayStatusBadgeLabel(
  badgeLabel: string | undefined,
  isLiveDay: boolean,
): string | null {
  if (!badgeLabel) {
    return null
  }
  if (isStartsInBadgeLabel(badgeLabel) && !isLiveDay) {
    return null
  }
  return badgeLabel
}

export function formatStartsInLabel(minutesUntil: number): string {
  if (minutesUntil <= 0) {
    return 'Starting now'
  }
  if (minutesUntil < 60) {
    return `Starts in ${minutesUntil} min`
  }
  const hours = Math.floor(minutesUntil / 60)
  const remainder = minutesUntil % 60
  if (remainder === 0) {
    return hours === 1 ? 'Starts in 1 hr' : `Starts in ${hours} hr`
  }
  return hours === 1
    ? `Starts in 1 hr ${remainder} min`
    : `Starts in ${hours} hr ${remainder} min`
}

export function formatHappyHourWindow(
  slot: Pick<HappyHourSlot, 'start_time' | 'end_time'>,
): string {
  return `${formatTime12h(slot.start_time)} – ${formatTime12h(slot.end_time)}`
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function getDayName(day: DayOfWeek): string {
  return DAY_NAMES[day] ?? 'Day'
}

export function isViewingToday(viewDay: 'any' | DayOfWeek, today: DayOfWeek): boolean {
  return viewDay === 'any' || viewDay === today
}

export function resolveViewDayForSlots(
  viewDay: 'any' | DayOfWeek,
  now: Date,
  timeZone: string,
): DayOfWeek {
  if (viewDay === 'any') {
    return getDayOfWeekInTimezone(now, timeZone)
  }
  return viewDay
}

export function getDealSummaryForSlot(
  slots: HappyHourSlotWithDeals[],
  slot: HappyHourSlot,
): string {
  const slotWithDeals = slots.find((item) => item.id === slot.id)
  if (slotWithDeals?.deal_summary) {
    return slotWithDeals.deal_summary
  }

  if (slotWithDeals?.deals?.length) {
    return slotWithDeals.deals
      .slice(0, 3)
      .map((deal) => (deal.price_text ? `${deal.label} ${deal.price_text}` : deal.label))
      .join(' · ')
  }

  return 'See details for specials.'
}

export function getVenueTimelinePlacementForViewDay(
  slots: HappyHourSlot[],
  viewDay: 'any' | DayOfWeek,
  now: Date,
  timeZone: string,
): VenueTimelinePlacement | null {
  if (viewDay === 'any') {
    return getVenueTimelinePlacement(slots, now, timeZone)
  }

  const daySlots = getSlotsForDay(slots, viewDay).sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
  )

  if (daySlots.length === 0) {
    return null
  }

  const focusSlot = daySlots[0]
  const startMinutes = timeToMinutes(focusSlot.start_time)
  const hhWindow = formatHappyHourWindow(focusSlot)

  if (startMinutes >= LATER_TONIGHT_START_MINUTES) {
    return {
      sectionId: 'later_tonight',
      sectionTitle: 'Later Tonight',
      sectionSortKey: 10_000,
      focusSlot,
      badgeTone: 'scheduled',
      badgeLabel: hhWindow,
      hhWindow,
      minutesUntilStart: null,
    }
  }

  return {
    sectionId: `time_${startMinutes}`,
    sectionTitle: formatTime12h(focusSlot.start_time),
    sectionSortKey: startMinutes,
    focusSlot,
    badgeTone: 'scheduled',
    badgeLabel: getDayName(viewDay),
    hhWindow,
    minutesUntilStart: null,
  }
}

export function getVenueTimelinePlacement(
  slots: HappyHourSlot[],
  now: Date,
  timeZone: string,
): VenueTimelinePlacement | null {
  const today = getDayOfWeekInTimezone(now, timeZone)
  const yesterday = ((today - 1 + 7) % 7) as DayOfWeek
  const todaySlots = getSlotsForDay(slots, today).sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
  )
  const yesterdayOvernightSlots = getSlotsForDay(slots, yesterday).filter(isOvernightSlot)

  if (todaySlots.length === 0 && yesterdayOvernightSlots.length === 0) {
    return null
  }

  const currentMinutes = getMinutesInTimezone(now, timeZone)
  const activeSlot =
    [...yesterdayOvernightSlots, ...todaySlots].find((slot) =>
      isSlotActiveNow(slot, now, timeZone),
    ) ?? null

  if (activeSlot) {
    return {
      sectionId: 'happening_now',
      sectionTitle: 'Happening Now',
      sectionSortKey: 0,
      focusSlot: activeSlot,
      badgeTone: 'open',
      badgeLabel: 'Open now',
      hhWindow: formatHappyHourWindow(activeSlot),
      minutesUntilStart: null,
    }
  }

  const upcoming = todaySlots.find((slot) => timeToMinutes(slot.start_time) > currentMinutes)
  if (!upcoming) {
    return null
  }

  const startMinutes = timeToMinutes(upcoming.start_time)
  const minutesUntilStart = startMinutes - currentMinutes
  const hhWindow = formatHappyHourWindow(upcoming)

  if (minutesUntilStart <= STARTING_SOON_MINUTES) {
    return {
      sectionId: 'starting_soon',
      sectionTitle: 'Starting Soon',
      sectionSortKey: 1,
      focusSlot: upcoming,
      badgeTone: 'soon',
      badgeLabel: formatStartsInLabel(minutesUntilStart),
      hhWindow,
      minutesUntilStart,
    }
  }

  if (startMinutes >= LATER_TONIGHT_START_MINUTES) {
    return {
      sectionId: 'later_tonight',
      sectionTitle: 'Later Tonight',
      sectionSortKey: 10_000,
      focusSlot: upcoming,
      badgeTone: 'scheduled',
      badgeLabel: formatStartsInLabel(minutesUntilStart),
      hhWindow,
      minutesUntilStart,
    }
  }

  return {
    sectionId: `time_${startMinutes}`,
    sectionTitle: formatTime12h(upcoming.start_time),
    sectionSortKey: startMinutes,
    focusSlot: upcoming,
    badgeTone: 'scheduled',
    badgeLabel: formatStartsInLabel(minutesUntilStart),
    hhWindow,
    minutesUntilStart,
  }
}

export function getMatchingSlotForTimeAt(
  slots: HappyHourSlot[],
  viewDay: 'any' | DayOfWeek,
  timeAtMinutes: number,
  now: Date,
  timeZone: string,
): HappyHourSlot | null {
  const targetDay = resolveViewDayForSlots(viewDay, now, timeZone)
  const daySlots = getSlotsForDay(slots, targetDay)
  return daySlots.find((slot) => slotMatchesTimeAt(slot, timeAtMinutes)) ?? null
}

/** Timeline placement when the user filters by a specific time of day. */
export function getVenueTimelinePlacementForTimeAt(
  slots: HappyHourSlot[],
  viewDay: 'any' | DayOfWeek,
  timeAtMinutes: number,
  now: Date,
  timeZone: string,
): VenueTimelinePlacement | null {
  const slot = getMatchingSlotForTimeAt(slots, viewDay, timeAtMinutes, now, timeZone)
  if (!slot) {
    return null
  }

  const today = getDayOfWeekInTimezone(now, timeZone)
  const targetDay = resolveViewDayForSlots(viewDay, now, timeZone)
  const startMinutes = timeToMinutes(slot.start_time)
  const hhWindow = formatHappyHourWindow(slot)
  const atTimeLabel = formatTime12h(
    `${String(Math.floor(timeAtMinutes / 60)).padStart(2, '0')}:${String(timeAtMinutes % 60).padStart(2, '0')}`,
  )
  const isActiveAtFilterTime =
    isViewingToday(viewDay, today) &&
    targetDay === today &&
    isSlotActiveNow(slot, now, timeZone) &&
    slotMatchesTimeAt(slot, timeAtMinutes)

  return {
    sectionId: `time_${startMinutes}`,
    sectionTitle: atTimeLabel,
    sectionSortKey: startMinutes,
    focusSlot: slot,
    badgeTone: isActiveAtFilterTime ? 'open' : 'scheduled',
    badgeLabel: isActiveAtFilterTime ? 'Open now' : `At ${atTimeLabel}`,
    hhWindow,
    minutesUntilStart: null,
  }
}

export interface TimeRangeMinutes {
  startMinutes: number
  endMinutes: number
}

export const FULL_DAY_TIME_RANGE: TimeRangeMinutes = {
  startMinutes: 0,
  endMinutes: 23 * 60 + 59,
}

export function slotMatchesTimeRange(
  slot: Pick<HappyHourSlot, 'start_time' | 'end_time'>,
  range: TimeRangeMinutes,
): boolean {
  if (
    range.startMinutes === FULL_DAY_TIME_RANGE.startMinutes &&
    range.endMinutes === FULL_DAY_TIME_RANGE.endMinutes
  ) {
    return true
  }

  const slotStart = timeToMinutes(slot.start_time)
  const slotEnd = timeToMinutes(slot.end_time)

  if (isOvernightSlot(slot)) {
    // Overnight: active from slotStart to midnight, and from midnight to slotEnd.
    // Overlaps with range if range starts before midnight (slotStart..1439) or ends after midnight (0..slotEnd).
    return range.startMinutes <= 1439 && range.endMinutes >= slotStart ||
      range.startMinutes <= slotEnd
  }

  return slotStart <= range.endMinutes && slotEnd >= range.startMinutes
}

/** Slot has started by this time and has not ended yet. */
export function slotMatchesTimeAt(
  slot: Pick<HappyHourSlot, 'start_time' | 'end_time'>,
  timeAtMinutes: number,
): boolean {
  const slotStart = timeToMinutes(slot.start_time)
  const slotEnd = timeToMinutes(slot.end_time)

  if (isOvernightSlot(slot)) {
    return timeAtMinutes >= slotStart || timeAtMinutes < slotEnd
  }

  return slotStart <= timeAtMinutes && slotEnd > timeAtMinutes
}

export function slotMatchesDealFilter(
  slot: HappyHourSlot,
  deal: 'drinks' | 'food',
): boolean {
  const categories = new Set(slot.categories)
  if (deal === 'drinks') {
    return categories.has('drinks') || categories.has('both')
  }
  return categories.has('food') || categories.has('both')
}

export function getTodayDealSummary(
  slots: HappyHourSlotWithDeals[],
  now: Date,
  timeZone: string,
): string {
  const status = getHappyHourStatus(slots, now, timeZone)
  const focusSlot =
    status.activeSlot ??
    getSlotsForDay(slots, getDayOfWeekInTimezone(now, timeZone)).sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
    )[0]

  if (!focusSlot) {
    return 'Check the full schedule for upcoming specials.'
  }

  const slotWithDeals = slots.find((s) => s.id === focusSlot.id)
  if (slotWithDeals?.deal_summary) {
    return slotWithDeals.deal_summary
  }

  if (slotWithDeals?.deals?.length) {
    return slotWithDeals.deals
      .slice(0, 3)
      .map((deal) => (deal.price_text ? `${deal.label} ${deal.price_text}` : deal.label))
      .join(' · ')
  }

  return 'See details for today’s specials.'
}

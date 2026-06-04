import { cn } from '@/utils'
import type { MapPinStatus } from '@/utils/happyHour'

export interface VenuePinState {
  pinStatus: MapPinStatus
  isSelected: boolean
  isHovered: boolean
}

const PIN_STATUS_CLASS: Record<Exclude<MapPinStatus, 'none'>, string> = {
  happening_now: 'venue-pin--happening-now',
  starting_soon: 'venue-pin--starting-soon',
  later_tonight: 'venue-pin--later-tonight',
  other_day: 'venue-pin--other-day',
}

const CLUSTER_STATUS_CLASS: Record<Exclude<MapPinStatus, 'none'>, string> = {
  happening_now: 'venue-cluster--happening-now',
  starting_soon: 'venue-cluster--starting-soon',
  later_tonight: 'venue-cluster--later-tonight',
  other_day: 'venue-cluster--other-day',
}

function pinIconMarkup(status: Exclude<MapPinStatus, 'none'>): string {
  switch (status) {
    case 'happening_now':
      return `
        <svg class="venue-pin__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 8v4l2.5 2.5"/>
        </svg>
      `
    case 'starting_soon':
      return `
        <svg class="venue-pin__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 13V9"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 3h4"/>
        </svg>
      `
    case 'later_tonight':
      return `
        <svg class="venue-pin__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"/>
        </svg>
      `
    case 'other_day':
      return `
        <svg class="venue-pin__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 10h18"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 3v4M16 3v4"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 14h2M12 14h2M16 14h2"/>
        </svg>
      `
  }
}

function buildPinMarkup(status: Exclude<MapPinStatus, 'none'>): string {
  return `
    <span class="venue-pin__shape" aria-hidden="true">
      <svg class="venue-pin__svg" viewBox="0 0 44 56" width="44" height="56" focusable="false">
        <path
          class="venue-pin__body"
          d="M22 4c10.5 0 19 8.5 19 19 0 8-8 17.2-19 31C11 40.2 3 31 3 23 3 12.5 11.5 4 22 4z"
        />
      </svg>
      <span class="venue-pin__icon-wrap">${pinIconMarkup(status)}</span>
    </span>
  `
}

export function getVenuePinClassName({ pinStatus, isSelected, isHovered }: VenuePinState): string {
  const statusClass =
    pinStatus !== 'none' ? PIN_STATUS_CLASS[pinStatus] : 'venue-pin--later-tonight'

  return cn(
    'venue-pin',
    statusClass,
    isSelected && 'venue-pin--selected',
    isHovered && !isSelected && 'venue-pin--hover',
  )
}

function effectivePinStatus(pinStatus: MapPinStatus): Exclude<MapPinStatus, 'none'> {
  return pinStatus === 'none' ? 'later_tonight' : pinStatus
}

export function createVenueMarkerElement(
  venueId: string,
  venueName: string,
  pinStatus: MapPinStatus,
  state: VenuePinState,
): HTMLButtonElement {
  const status = effectivePinStatus(pinStatus)

  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.venueId = venueId
  button.className = getVenuePinClassName(state)
  button.setAttribute('aria-label', `${venueName} — ${pinStatusLabel(status)}`)
  button.innerHTML = buildPinMarkup(status)
  return button
}

export function updateVenueMarkerElement(element: HTMLElement, state: VenuePinState): void {
  const status = effectivePinStatus(state.pinStatus)
  element.className = getVenuePinClassName(state)

  const iconWrap = element.querySelector('.venue-pin__icon-wrap')
  if (iconWrap) {
    iconWrap.innerHTML = pinIconMarkup(status)
  }
}

function pinStatusLabel(status: Exclude<MapPinStatus, 'none'>): string {
  switch (status) {
    case 'happening_now':
      return 'Happy hour happening now'
    case 'starting_soon':
      return 'Happy hour starting soon'
    case 'later_tonight':
      return 'Happy hour later tonight'
    case 'other_day':
      return 'Happy hour on selected day'
  }
}

export function createClusterMarkerElement(
  count: number,
  pinStatus: Exclude<MapPinStatus, 'none'>,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = cn('venue-cluster', CLUSTER_STATUS_CLASS[pinStatus])
  button.setAttribute('aria-label', `${count} venues — ${pinStatusLabel(pinStatus)}`)
  button.innerHTML = `<span class="venue-cluster__count">${count}</span>`
  return button
}

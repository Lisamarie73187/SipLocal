import { useCallback, useId } from 'react'

import {
  TIME_FILTER_MAX_MINUTES,
  TIME_FILTER_MIN_MINUTES,
} from '@/hooks/useDiscoveryFilters'
import { formatMinutesLabel } from '@/utils/discoveryFilters'
import { cn } from '@/utils'

const STEP_MINUTES = 15

export interface TimePointSliderProps {
  value: number
  onChange: (value: number) => void
}

function clampTime(value: number): number {
  const stepped = Math.round(value / STEP_MINUTES) * STEP_MINUTES
  return Math.min(TIME_FILTER_MAX_MINUTES, Math.max(TIME_FILTER_MIN_MINUTES, stepped))
}

export function TimePointSlider({ value, onChange }: TimePointSliderProps) {
  const inputId = useId()
  const minutes = value
  const percent =
    ((minutes - TIME_FILTER_MIN_MINUTES) /
      (TIME_FILTER_MAX_MINUTES - TIME_FILTER_MIN_MINUTES)) *
    100

  const handleChange = useCallback(
    (next: number): void => {
      onChange(clampTime(next))
    },
    [onChange],
  )

  return (
    <div className="time-point-slider">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{formatMinutesLabel(TIME_FILTER_MIN_MINUTES)}</span>
        <span className="font-semibold text-dark">{formatMinutesLabel(minutes)}</span>
        <span>{formatMinutesLabel(TIME_FILTER_MAX_MINUTES)}</span>
      </div>
      <div className="time-point-slider__track-wrap">
        <div className="time-point-slider__track" aria-hidden />
        <div
          className="time-point-slider__fill"
          style={{ width: `${percent}%` }}
          aria-hidden
        />
        <input
          id={inputId}
          type="range"
          min={TIME_FILTER_MIN_MINUTES}
          max={TIME_FILTER_MAX_MINUTES}
          step={STEP_MINUTES}
          value={minutes}
          onInput={(event) => handleChange(Number(event.currentTarget.value))}
          onChange={(event) => handleChange(Number(event.currentTarget.value))}
          className={cn('time-point-slider__input')}
          aria-valuemin={TIME_FILTER_MIN_MINUTES}
          aria-valuemax={TIME_FILTER_MAX_MINUTES}
          aria-valuenow={minutes}
          aria-label="Filter by time"
        />
      </div>
    </div>
  )
}

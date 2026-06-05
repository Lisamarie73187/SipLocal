import type { ViewDayFilter } from '@/hooks/useDiscoveryFilters'
import type { DayOfWeek } from '@/types/venue'
import { getDayName } from '@/utils/happyHour'

export const WEEKDAY_PICKER_OPTIONS: { id: DayOfWeek; label: string }[] = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
]

export function getViewDayButtonLabel(viewDay: ViewDayFilter): string {
  if (viewDay === 'any') {
    return 'Any day'
  }
  const option = WEEKDAY_PICKER_OPTIONS.find((item) => item.id === viewDay)
  return option?.label ?? getDayName(viewDay)
}

export function isViewDayOptionActive(viewDay: ViewDayFilter, optionId: ViewDayFilter): boolean {
  return viewDay === optionId
}

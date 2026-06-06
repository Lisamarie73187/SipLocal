import { Copy, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatHappyHourDayLabel } from '@/utils/happyHourSchedule'
import { getDayName } from '@/utils/happyHour'
import type { DayOfWeek } from '@/types/venue'
import { cn } from '@/utils'

import type { HappyHourSlotFormState } from './HappyHourSlotsEditor.types'
import { duplicateHappyHourSlot, newEmptyHappyHourSlot } from './HappyHourSlotsEditor.types'

const inputClassName =
  'h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-base text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

export interface HappyHourSlotsEditorProps {
  slots: HappyHourSlotFormState[]
  onChange: (slots: HappyHourSlotFormState[]) => void
  showDealRows?: boolean
}

export function HappyHourSlotsEditor({
  slots,
  onChange,
  showDealRows = false,
}: HappyHourSlotsEditorProps): React.ReactElement {
  const setSlots = (updater: (current: HappyHourSlotFormState[]) => HappyHourSlotFormState[]): void => {
    onChange(updater(slots))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg font-semibold text-dark">Happy hours</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSlots((current) => [...current, newEmptyHappyHourSlot()])}
        >
          <Plus className="size-4" />
          Add slot
        </Button>
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No happy hour slots yet. Add at least one window with days and times.
        </p>
      ) : (
        <ul className="space-y-4">
          {slots.map((slot, slotIndex) => (
            <li
              key={slot.key}
              className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-dark">
                  Slot {slotIndex + 1}
                  {slot.days.length > 0 ? (
                    <span className="ml-2 font-normal text-muted-foreground">
                      · {formatHappyHourDayLabel(slot.days)}
                    </span>
                  ) : null}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Duplicate slot"
                    onClick={() =>
                      setSlots((current) => {
                        const index = current.findIndex((row) => row.key === slot.key)
                        if (index === -1) {
                          return current
                        }
                        const copy = duplicateHappyHourSlot(slot)
                        return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)]
                      })
                    }
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-dark"
                  >
                    <Copy className="size-4 shrink-0" aria-hidden />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    aria-label="Remove slot"
                    onClick={() => setSlots((current) => current.filter((row) => row.key !== slot.key))}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-dark">Days</legend>
                <div className="flex flex-wrap gap-2">
                  {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => {
                    const checked = slot.days.includes(day)
                    return (
                      <label
                        key={day}
                        className={cn(
                          'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm',
                          checked
                            ? 'border-primary/40 bg-primary/10 text-dark'
                            : 'border-border/70 bg-background text-muted-foreground',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSlots((current) =>
                              current.map((row) => {
                                if (row.key !== slot.key) {
                                  return row
                                }
                                const days = checked
                                  ? row.days.filter((value) => value !== day)
                                  : ([...row.days, day].sort((a, b) => a - b) as DayOfWeek[])
                                return { ...row, days }
                              }),
                            )
                          }
                          className="size-4 rounded border-border"
                        />
                        {getDayName(day).slice(0, 3)}
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-dark">Start</span>
                  <input
                    type="time"
                    required
                    value={slot.start_time}
                    onChange={(event) =>
                      setSlots((current) =>
                        current.map((row) =>
                          row.key === slot.key ? { ...row, start_time: event.target.value } : row,
                        ),
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-dark">End</span>
                  <input
                    type="time"
                    required
                    value={slot.end_time}
                    onChange={(event) =>
                      setSlots((current) =>
                        current.map((row) =>
                          row.key === slot.key ? { ...row, end_time: event.target.value } : row,
                        ),
                      )
                    }
                    className={inputClassName}
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-dark">Deal summary (optional)</span>
                <input
                  value={slot.deal_summary ?? ''}
                  onChange={(event) =>
                    setSlots((current) =>
                      current.map((row) =>
                        row.key === slot.key
                          ? { ...row, deal_summary: event.target.value || null }
                          : row,
                      ),
                    )
                  }
                  className={inputClassName}
                  placeholder="e.g. $5 pints, half-off apps"
                />
              </label>

              {showDealRows ? (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-dark">Deals</span>
                  {slot.deals.some((deal) => deal.label.trim()) ? (
                    <p className="text-xs text-muted-foreground">
                      Deal line items appear as chips under Specials; the summary above shows under
                      the happy hour schedule.
                    </p>
                  ) : null}
                  {slot.deals.map((deal, dealIndex) => (
                    <div
                      key={`${slot.key}-deal-${dealIndex}`}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                    >
                      <input
                        value={deal.label}
                        onChange={(event) =>
                          setSlots((current) =>
                            current.map((row) => {
                              if (row.key !== slot.key) {
                                return row
                              }
                              const deals = row.deals.map((item, index) =>
                                index === dealIndex
                                  ? { ...item, label: event.target.value }
                                  : item,
                              )
                              return { ...row, deals }
                            }),
                          )
                        }
                        className={inputClassName}
                        placeholder="Deal label"
                      />
                      <select
                        value={deal.category}
                        onChange={(event) =>
                          setSlots((current) =>
                            current.map((row) => {
                              if (row.key !== slot.key) {
                                return row
                              }
                              const deals = row.deals.map((item, index) =>
                                index === dealIndex
                                  ? {
                                      ...item,
                                      category: event.target
                                        .value as HappyHourSlotFormState['deals'][number]['category'],
                                    }
                                  : item,
                              )
                              return { ...row, deals }
                            }),
                          )
                        }
                        className={inputClassName}
                      >
                        <option value="drinks">Drinks</option>
                        <option value="food">Food</option>
                        <option value="both">Both</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        value={deal.price_text ?? ''}
                        onChange={(event) =>
                          setSlots((current) =>
                            current.map((row) => {
                              if (row.key !== slot.key) {
                                return row
                              }
                              const deals = row.deals.map((item, index) =>
                                index === dealIndex
                                  ? { ...item, price_text: event.target.value || null }
                                  : item,
                              )
                              return { ...row, deals }
                            }),
                          )
                        }
                        className={inputClassName}
                        placeholder="Price text"
                      />
                      <button
                        type="button"
                        aria-label={`Remove deal ${dealIndex + 1}`}
                        onClick={() =>
                          setSlots((current) =>
                            current.map((row) =>
                              row.key === slot.key
                                ? {
                                    ...row,
                                    deals: row.deals.filter((_, index) => index !== dealIndex),
                                  }
                                : row,
                            ),
                          )
                        }
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      setSlots((current) =>
                        current.map((row) =>
                          row.key === slot.key
                            ? {
                                ...row,
                                deals: [
                                  ...row.deals,
                                  { label: '', category: 'drinks', price_text: null },
                                ],
                              }
                            : row,
                        ),
                      )
                    }
                  >
                    Add deal line
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

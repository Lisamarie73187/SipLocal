import { z } from 'zod'

export const timeSchema = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use HH:MM or HH:MM:SS')

export function toDbTime(value: string): string {
  const parts = value.trim().split(':')
  if (parts.length === 3) {
    return value
  }
  return `${parts[0]}:${parts[1]}:00`
}

export const dealInputSchema = z.object({
  label: z.string().min(1),
  category: z.enum(['drinks', 'food', 'both', 'other']),
  price_text: z.string().nullable().optional(),
})

export const ownerSlotInputSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: timeSchema,
  end_time: timeSchema,
  deal_summary: z.string().nullable().optional(),
  deals: z.array(dealInputSchema).optional(),
})

export const groupedOwnerSlotSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1),
  start_time: timeSchema,
  end_time: timeSchema,
  deal_summary: z.string().nullable(),
  deals: z.array(dealInputSchema).optional(),
})

export type OwnerSlotInput = z.infer<typeof ownerSlotInputSchema>
export type GroupedOwnerSlotInput = z.infer<typeof groupedOwnerSlotSchema>

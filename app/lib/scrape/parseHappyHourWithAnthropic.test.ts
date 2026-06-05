import { describe, expect, it } from 'vitest'

import { normalizeAnthropicHappyHourResponse } from './parseHappyHourWithAnthropic'

describe('normalizeAnthropicHappyHourResponse', () => {
  it('normalizes integer day slots with 24-hour times', () => {
    const result = normalizeAnthropicHappyHourResponse({
      slots: [
        {
          days: [1, 2, 3, 4, 5],
          start_time: '16:00',
          end_time: '18:00',
          deal_summary: '$5 pints',
        },
      ],
    })

    expect(result.slots).toEqual([
      {
        days: [1, 2, 3, 4, 5],
        start_time: '16:00',
        end_time: '18:00',
        deal_summary: '$5 pints',
      },
    ])
  })

  it('normalizes day names and 12-hour times', () => {
    const result = normalizeAnthropicHappyHourResponse({
      slots: [
        {
          days: ['Mon', 'Tue', 'Wed'],
          start_time: '4:00 PM',
          end_time: '6:00 PM',
          deal_summary: 'Discounted apps',
        },
      ],
    })

    expect(result.slots[0]?.days).toEqual([1, 2, 3])
    expect(result.slots[0]?.start_time).toBe('16:00')
    expect(result.slots[0]?.end_time).toBe('18:00')
  })

  it('returns warnings when response shape is invalid', () => {
    const result = normalizeAnthropicHappyHourResponse({ not: 'valid' })

    expect(result.slots).toHaveLength(0)
    expect(result.warnings[0]).toContain('expected schedule format')
  })
})

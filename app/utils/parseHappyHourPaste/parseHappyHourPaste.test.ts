import { describe, expect, it } from 'vitest'

import {
  parseDayExpression,
  parseHappyHourPaste,
  parseTimeToken,
} from './parseHappyHourPaste'

describe('parseDayExpression', () => {
  it('parses weekday ranges', () => {
    expect(parseDayExpression('Mon-Fri')).toEqual([1, 2, 3, 4, 5])
    expect(parseDayExpression('Monday – Friday')).toEqual([1, 2, 3, 4, 5])
  })

  it('parses comma-separated days', () => {
    expect(parseDayExpression('Mon, Wed, Fri')).toEqual([1, 3, 5])
  })

  it('parses shortcuts', () => {
    expect(parseDayExpression('weekdays')).toEqual([1, 2, 3, 4, 5])
    expect(parseDayExpression('weekends')).toEqual([0, 6])
    expect(parseDayExpression('daily')).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('parseTimeToken', () => {
  it('parses 12-hour times', () => {
    expect(parseTimeToken('4pm')).toBe('16:00')
    expect(parseTimeToken('4:30 PM')).toBe('16:30')
    expect(parseTimeToken('12am')).toBe('00:00')
  })

  it('parses 24-hour times', () => {
    expect(parseTimeToken('16:00')).toBe('16:00')
  })
})

describe('parseHappyHourPaste', () => {
  it('parses a range with trailing deal lines', () => {
    const result = parseHappyHourPaste(`Mon–Fri 4:00–6:00 PM
$5 pints
$7 appetizers`)

    expect(result.slots).toHaveLength(1)
    expect(result.slots[0]).toEqual({
      days: [1, 2, 3, 4, 5],
      start_time: '16:00',
      end_time: '18:00',
      deal_summary: '$5 pints\n$7 appetizers',
    })
  })

  it('parses multiple blocks', () => {
    const result = parseHappyHourPaste(`Mon-Fri 4pm-6pm
Draft specials

Sat-Sun 3:00-5:00 PM
Half off wine`)

    expect(result.slots).toHaveLength(2)
    expect(result.slots[0]?.days).toEqual([1, 2, 3, 4, 5])
    expect(result.slots[1]?.days).toEqual([0, 6])
  })

  it('parses inline deal text', () => {
    const result = parseHappyHourPaste('Tuesday 4:00-6:00 PM: $5 drafts')

    expect(result.slots).toHaveLength(1)
    expect(result.slots[0]?.deal_summary).toBe('$5 drafts')
  })

  it('reports unparsed blocks', () => {
    const result = parseHappyHourPaste('Not a schedule block')

    expect(result.slots).toHaveLength(0)
    expect(result.unparsedBlocks).toHaveLength(1)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

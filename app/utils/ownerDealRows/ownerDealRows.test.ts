import { describe, expect, it } from 'vitest'

import { dealSummaryToDealRows, dealsFromParsedSlot, finalizeParsedSlotDeals } from './ownerDealRows'

describe('ownerDealRows', () => {
  it('splits comma-separated specials into deal rows', () => {
    expect(dealSummaryToDealRows('$5 draft pints, $7 apps, half-off wine')).toEqual([
      { label: 'draft pints', category: 'drinks', price_text: '$5' },
      { label: 'apps', category: 'food', price_text: '$7' },
      { label: 'half-off wine', category: 'drinks', price_text: null },
    ])
  })

  it('splits deal summary lines into deal rows', () => {
    expect(dealSummaryToDealRows('$5 pints\n$7 appetizers')).toEqual([
      { label: 'pints', category: 'drinks', price_text: '$5' },
      { label: 'appetizers', category: 'food', price_text: '$7' },
    ])
  })

  it('prefers parsed deal rows over summary text', () => {
    expect(
      dealsFromParsedSlot({
        days: [1],
        start_time: '16:00',
        end_time: '18:00',
        deal_summary: 'Should not use this',
        deals: [{ label: 'House wine', category: 'drinks', price_text: '$6' }],
      }),
    ).toEqual([{ label: 'House wine', category: 'drinks', price_text: '$6' }])
  })

  it('clears deal_summary when comma-separated specials are finalized', () => {
    const result = finalizeParsedSlotDeals(undefined, '$5 pints, $7 apps')
    expect(result.deal_summary).toBeNull()
    expect(result.deals).toEqual([
      { label: 'pints', category: 'drinks', price_text: '$5' },
      { label: 'apps', category: 'food', price_text: '$7' },
    ])
  })
})

import { describe, expect, it } from 'vitest'

import {
  buildAdminVenuesListSearch,
  parseAdminVenuesListSearch,
} from './adminVenuesListSearch'

describe('parseAdminVenuesListSearch', () => {
  it('parses list filters from search params', () => {
    expect(
      parseAdminVenuesListSearch({
        city: 'bend-or',
        tab: 'published',
        q: ' ale ',
        hasEvents: '1',
        archived: 'true',
        notice: 'Saved',
      }),
    ).toEqual({
      city: 'bend-or',
      tab: 'published',
      q: 'ale',
      hasEvents: true,
      archived: true,
      notice: 'Saved',
    })
  })

  it('omits empty values and normalizes all tab', () => {
    expect(parseAdminVenuesListSearch({ tab: 'all', q: '  ' })).toEqual({
      city: undefined,
      tab: undefined,
      q: undefined,
      hasEvents: false,
      archived: false,
      notice: undefined,
    })
  })
})

describe('buildAdminVenuesListSearch', () => {
  it('serializes active filters for the URL', () => {
    expect(
      buildAdminVenuesListSearch({
        city: 'bend-or',
        tab: 'live',
        q: 'bar',
        hasEvents: true,
        notice: 'Done',
      }),
    ).toEqual({
      city: 'bend-or',
      tab: 'live',
      q: 'bar',
      hasEvents: true,
      archived: undefined,
      notice: 'Done',
    })
  })
})

export type AdminVenueListTab = 'all' | 'published' | 'pending_review' | 'live'

const VENUE_LIST_TABS: AdminVenueListTab[] = ['all', 'published', 'pending_review', 'live']

function isVenueListTab(value: string): value is AdminVenueListTab {
  return VENUE_LIST_TABS.includes(value as AdminVenueListTab)
}

export interface AdminVenuesListSearch {
  city?: string
  tab?: AdminVenueListTab
  q?: string
  hasEvents?: boolean
  archived?: boolean
  notice?: string
}

export function parseAdminVenuesListSearch(
  search: Record<string, unknown>,
): AdminVenuesListSearch {
  const tabRaw = typeof search.tab === 'string' ? search.tab : undefined
  const tab = tabRaw && isVenueListTab(tabRaw) ? tabRaw : undefined

  return {
    city: typeof search.city === 'string' && search.city.trim() ? search.city.trim() : undefined,
    tab: tab === 'all' ? undefined : tab,
    q: typeof search.q === 'string' && search.q.trim() ? search.q.trim() : undefined,
    hasEvents: search.hasEvents === true || search.hasEvents === '1' || search.hasEvents === 'true',
    archived: search.archived === true || search.archived === '1' || search.archived === 'true',
    notice: typeof search.notice === 'string' && search.notice.trim() ? search.notice.trim() : undefined,
  }
}

export function buildAdminVenuesListSearch(
  params: AdminVenuesListSearch,
): AdminVenuesListSearch {
  return {
    city: params.city,
    tab: params.tab && params.tab !== 'all' ? params.tab : undefined,
    q: params.q,
    hasEvents: params.hasEvents || undefined,
    archived: params.archived || undefined,
    notice: params.notice,
  }
}

export function adminVenuesListSearchWithoutNotice(
  params: AdminVenuesListSearch,
): AdminVenuesListSearch {
  return {
    city: params.city,
    tab: params.tab,
    q: params.q,
    hasEvents: params.hasEvents,
    archived: params.archived,
  }
}

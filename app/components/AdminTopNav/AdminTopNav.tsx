import { Link, useRouterState } from '@tanstack/react-router'
import { Map } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Map', icon: Map },
  { to: '/admin', label: 'Discover' },
  { to: '/admin/venues', label: 'Venues' },
  { to: '/admin/review', label: 'Needs review' },
  { to: '/admin/claims', label: 'Claims' },
] as const

function isNavActive(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/'
  }
  if (to === '/admin') {
    return pathname === '/admin' || pathname === '/admin/'
  }
  if (to === '/admin/venues') {
    return pathname.startsWith('/admin/venues')
  }
  if (to === '/admin/review') {
    return pathname.startsWith('/admin/review')
  }
  if (to === '/admin/claims') {
    return pathname.startsWith('/admin/claims')
  }
  return false
}

export function AdminTopNav() {
  const { signOut } = useAuth()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3"
      aria-label="Admin navigation"
    >
      <div className="grid min-h-11 w-full min-w-0 flex-1 grid-cols-5 gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-sm">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.to)
          const Icon = 'icon' in item ? item.icon : null

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'inline-flex min-h-9 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 text-xs font-semibold transition-colors sm:gap-1.5 sm:px-2 sm:text-sm',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-dark',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
              {item.label}
            </Link>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-11 shrink-0 px-2 text-sm text-muted-foreground hover:text-dark"
      >
        Sign out
      </button>
    </nav>
  )
}

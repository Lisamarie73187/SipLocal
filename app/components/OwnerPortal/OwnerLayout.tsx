import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useIsManager } from '@/hooks/useIsManager'
import { cn } from '@/utils'

export interface OwnerLayoutProps {
  title: string
  description?: string
  children: ReactNode
  backTo?: { to: string; label: string }
  requireManager?: boolean
  contentClassName?: string
}

export function OwnerLayout({
  title,
  description,
  children,
  backTo,
  requireManager = true,
  contentClassName,
}: OwnerLayoutProps) {
  const { user, loading: authLoading } = useAuth()
  const { isManager, loading: managerLoading } = useIsManager()
  const loginRedirect =
    typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/manage'

  const checking = authLoading || (requireManager && Boolean(user) && managerLoading)
  const accessDenied = requireManager && Boolean(user) && !managerLoading && !isManager

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
        <h1 className="font-heading text-2xl font-semibold text-dark">Manage your listing</h1>
        <p className="text-sm text-muted-foreground">Sign in to update your happy hour on SipLocal.</p>
        <Link
          to="/login"
          search={{ redirect: loginRedirect }}
          className="btn-gradient inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold"
        >
          Sign in
        </Link>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Back to map
        </Link>
      </div>
    )
  }

  if (requireManager && accessDenied) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
        <h1 className="font-heading text-2xl font-semibold text-dark">No managed venues</h1>
        <p className="text-sm text-muted-foreground">
          This account is not linked to a venue yet. Contact SipLocal if you need access, or claim
          your listing from the public venue page.
        </p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Back to map
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className={cn('mx-auto px-6 py-8 pb-16', contentClassName ?? 'max-w-2xl')}>
        <header className="border-b border-border/60 pb-4">
          <Link to="/" className="font-heading text-sm font-semibold text-primary hover:underline">
            SipLocal
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Venue manager</p>
        </header>

        {backTo ? (
          <Link
            to={backTo.to}
            className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-dark"
          >
            ← {backTo.label}
          </Link>
        ) : null}

        <h1 className="mt-6 font-heading text-2xl font-semibold text-dark">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}

        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}

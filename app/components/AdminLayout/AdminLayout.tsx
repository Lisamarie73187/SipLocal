import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { AdminTopNav } from '@/components/AdminTopNav/AdminTopNav'
import { useAuth } from '@/hooks/useAuth'
import { getCurrentUserAdmin } from '@/server/adminScrape'
import type { AdminVenuesListSearch } from '@/utils/adminVenuesListSearch'
import { cn } from '@/utils'

export interface AdminLayoutProps {
  title: string
  description?: string
  children: ReactNode
  backTo?: { to: string; label: string; search?: AdminVenuesListSearch }
}

export function AdminLayout({ title, description, children, backTo }: AdminLayoutProps) {
  const { user, loading } = useAuth()
  const [accessDenied, setAccessDenied] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    if (!user) {
      setCheckingAdmin(false)
      return
    }
    void getCurrentUserAdmin()
      .then((result) => setAccessDenied(!result.isAdmin))
      .catch(() => setAccessDenied(true))
      .finally(() => setCheckingAdmin(false))
  }, [user])

  if (loading || checkingAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
        <h1 className="font-heading text-2xl font-semibold text-dark">Admin</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage venues.</p>
        <Link
          to="/login"
          search={{ redirect: '/admin/venues' }}
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

  if (accessDenied) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
        <h1 className="font-heading text-2xl font-semibold text-dark">Admin</h1>
        <p className="text-sm text-muted-foreground">
          This account does not have admin access.
        </p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Back to map
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-6 py-8 pb-16">
        <AdminTopNav />

        {backTo ? (
          <Link
            to={backTo.to}
            search={backTo.search}
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-dark"
          >
            <ArrowLeft className="size-4" />
            {backTo.label}
          </Link>
        ) : null}

        <h1 className={cn('font-heading text-2xl font-semibold text-dark', backTo ? 'mt-4' : 'mt-8')}>
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}

        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}

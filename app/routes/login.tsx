import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { AuthForm } from '@/components/AuthForm/AuthForm'
import { useAuth } from '@/hooks/useAuth'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(['sign-in', 'sign-up']).optional(),
})

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: loginSearchSchema,
  beforeLoad: ({ search }) => {
    const redirectTo = search.redirect?.trim()
    if (redirectTo?.startsWith('/')) {
      return
    }
    if (redirectTo) {
      throw redirect({
        to: '/login',
        search: { mode: search.mode },
      })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { redirect: redirectTo, mode } = Route.useSearch()
  const safeRedirect = redirectTo?.startsWith('/') ? redirectTo : '/'

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: safeRedirect })
    }
  }, [loading, user, navigate, safeRedirect])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return <AuthForm redirectTo={safeRedirect} initialMode={mode ?? 'sign-in'} />
}

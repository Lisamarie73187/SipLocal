import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

import { ResetPasswordForm } from '@/components/ResetPasswordForm/ResetPasswordForm'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/reset-password')({
  ssr: false,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: '/login', search: { mode: 'sign-in' } })
    }
  }, [loading, user, navigate])

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return <ResetPasswordForm />
}

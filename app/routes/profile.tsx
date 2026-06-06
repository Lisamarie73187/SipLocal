import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useEffect } from 'react'

import { AccountMenu } from '@/components/AccountMenu/AccountMenu'
import { ProfileForm } from '@/components/ProfileForm/ProfileForm'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useProfileOnboarding } from '@/hooks/useProfileOnboarding'

export const Route = createFileRoute('/profile')({
  ssr: false,
  component: ProfilePage,
})

function ProfilePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, loading: onboardingLoading } = useProfileOnboarding()

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: '/login', search: { redirect: '/profile', mode: 'sign-in' } })
      return
    }

    if (!user || onboardingLoading) {
      return
    }

    if (needsOnboarding) {
      void navigate({ to: '/welcome', search: { redirect: '/profile' } })
    }
  }, [authLoading, navigate, needsOnboarding, onboardingLoading, user])

  if (!user && !authLoading) {
    return null
  }

  return (
    <main className="min-h-dvh bg-background pb-8">
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Map
              </Link>
            </Button>
            <h1 className="font-heading text-2xl font-bold text-dark">Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalize discovery and notification preferences.
            </p>
          </div>
          <AccountMenu />
        </div>
      </header>

      <section className="mx-auto max-w-lg px-4 pt-6">
        {authLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <ProfileForm />
        )}
      </section>
    </main>
  )
}

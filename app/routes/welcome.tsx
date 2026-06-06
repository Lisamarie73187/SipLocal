import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { VisitorTypePicker } from '@/components/VisitorTypePicker/VisitorTypePicker'
import { SipSocialLogo } from '@/components/SipSocialLogo/SipSocialLogo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useProfileOnboarding } from '@/hooks/useProfileOnboarding'
import { completeProfileOnboarding } from '@/server/profile'
import type { ProfileVisitorType } from '@/types/venue'

const welcomeSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/welcome')({
  ssr: false,
  validateSearch: welcomeSearchSchema,
  component: WelcomePage,
})

function WelcomePage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, loading: onboardingLoading } = useProfileOnboarding()
  const { redirect: redirectTo } = Route.useSearch()
  const safeRedirect = redirectTo?.startsWith('/') ? redirectTo : '/'

  const [visitorType, setVisitorType] = useState<ProfileVisitorType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || onboardingLoading) {
      return
    }

    if (!user) {
      void navigate({ to: '/login', search: { redirect: safeRedirect, mode: 'sign-in' } })
      return
    }

    if (!needsOnboarding) {
      void navigate({ to: safeRedirect })
    }
  }, [authLoading, navigate, needsOnboarding, onboardingLoading, safeRedirect, user])

  const handleContinue = (): void => {
    if (!visitorType) {
      setError('Choose local or tourist to continue.')
      return
    }

    setSubmitting(true)
    setError(null)

    void completeProfileOnboarding({ data: { visitorType } })
      .then(() => {
        void navigate({ to: safeRedirect })
      })
      .catch((submitError) => {
        setError(submitError instanceof Error ? submitError.message : 'Could not save your choice')
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  if (authLoading || onboardingLoading || (user && !needsOnboarding)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
        <div className="mb-10 flex justify-center">
          <SipSocialLogo variant="full" />
        </div>

        <h1 className="font-heading text-center text-2xl font-semibold text-dark">
          Welcome to SipSocial
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          One quick question so we can tailor happy hour discovery for you.
        </p>

        <fieldset className="mt-10 space-y-3">
          <legend className="text-sm font-medium text-dark">Are you local or visiting?</legend>
          <VisitorTypePicker
            value={visitorType}
            onChange={setVisitorType}
            allowClear={false}
          />
        </fieldset>

        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          className="mt-8 h-12 w-full text-base"
          disabled={submitting}
          onClick={handleContinue}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </div>
  )
}

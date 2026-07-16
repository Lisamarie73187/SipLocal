import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { SipSocialLogo } from '@/components/SipSocialLogo/SipSocialLogo'
import { Button } from '@/components/ui/button'
import { useAuthActions } from '@/hooks/useAuthActions'

const inputClassName =
  'h-12 w-full rounded-xl border border-border/70 bg-card px-4 text-base text-dark shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const { submitPasswordUpdate, submitting, formError, clearFormError } = useAuthActions()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setLocalError(null)
    clearFormError()

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    const result = await submitPasswordUpdate(password)

    if (result.ok) {
      void navigate({ to: '/' })
    }
  }

  const displayError = localError ?? formError

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
        <div className="mb-10 flex justify-center">
          <SipSocialLogo variant="full" />
        </div>

        <h1 className="font-heading text-center text-2xl font-semibold text-dark">
          Set a new password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>

        <form className="mt-8 space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-dark">New password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-dark">Confirm password</span>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder="Repeat password"
              minLength={8}
              required
            />
          </label>

          {displayError ? (
            <p className="text-sm text-destructive" role="alert">
              {displayError}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting} className="h-12 w-full text-base">
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

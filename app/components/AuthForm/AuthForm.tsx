import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SipSocialLogo } from '@/components/SipSocialLogo/SipSocialLogo'
import { type AuthFormMode, useAuthActions } from '@/hooks/useAuthActions'
import { cn } from '@/utils'

export interface AuthFormProps {
  redirectTo: string
  initialMode?: AuthFormMode
}

const inputClassName =
  'h-12 w-full rounded-xl border border-border/70 bg-card px-4 text-base text-dark shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

type DisplayMode = AuthFormMode | 'forgot-password'

export function AuthForm({ redirectTo, initialMode = 'sign-in' }: AuthFormProps) {
  const navigate = useNavigate()
  const { submitAuth, submitPasswordReset, submitting, formError, clearFormError } =
    useAuthActions()
  const [mode, setMode] = useState<DisplayMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const switchMode = (next: DisplayMode): void => {
    setMode(next)
    setLocalError(null)
    setSuccessMessage(null)
    clearFormError()
    setConfirmPassword('')
  }

  const handleForgotPasswordSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)

    if (!email.trim()) {
      setLocalError('Enter your email.')
      return
    }

    const result = await submitPasswordReset(email)

    if (result.message) {
      setSuccessMessage(result.message)
    }
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)

    if (mode === 'forgot-password') {
      return handleForgotPasswordSubmit(event)
    }

    if (!email.trim()) {
      setLocalError('Enter your email.')
      return
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }

    if (mode === 'sign-up' && password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    const result = await submitAuth(mode, { email, password })

    if (result.message && result.needsEmailConfirmation) {
      setSuccessMessage(result.message)
      setMode('sign-in')
      return
    }

    if (result.ok && !result.needsEmailConfirmation) {
      void navigate({ to: '/welcome', search: { redirect: redirectTo } })
      return
    }
  }

  const displayError = localError ?? formError

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
        <Link
          to="/"
          className="mb-10 text-sm font-medium text-muted-foreground hover:text-dark"
        >
          ← Back to discovery
        </Link>

        <div className="mb-8 flex justify-center">
          <SipSocialLogo variant="full" />
        </div>

        <h1 className="font-heading text-center text-2xl font-semibold text-dark">
          {mode === 'sign-in'
            ? 'Welcome back'
            : mode === 'sign-up'
              ? 'Create your account'
              : 'Reset your password'}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === 'sign-in'
            ? 'Sign in to save favorites and access admin tools.'
            : mode === 'sign-up'
              ? 'Join SipSocial to track happy hours in your city.'
              : "Enter your email and we'll send you a link to reset your password."}
        </p>

        {mode !== 'forgot-password' ? (
          <div
            className="mt-8 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-card p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sign-in'}
              onClick={() => switchMode('sign-in')}
              className={cn(
                'h-11 rounded-lg text-sm font-semibold transition-colors',
                mode === 'sign-in'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-dark',
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sign-up'}
              onClick={() => switchMode('sign-up')}
              className={cn(
                'h-11 rounded-lg text-sm font-semibold transition-colors',
                mode === 'sign-up'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-dark',
              )}
            >
              Sign up
            </button>
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-dark">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
              placeholder="you@example.com"
              required
            />
          </label>

          {mode !== 'forgot-password' ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-dark">Password</span>
              <input
                type="password"
                name="password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </label>
          ) : null}

          {mode === 'sign-in' ? (
            <button
              type="button"
              onClick={() => switchMode('forgot-password')}
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </button>
          ) : null}

          {mode === 'sign-up' ? (
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
          ) : null}

          {displayError ? (
            <p className="text-sm text-destructive" role="alert">
              {displayError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="text-sm text-dark" role="status">
              {successMessage}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting} className="h-12 w-full text-base">
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                {mode === 'sign-in'
                  ? 'Signing in…'
                  : mode === 'sign-up'
                    ? 'Creating account…'
                    : 'Sending link…'}
              </>
            ) : mode === 'sign-in' ? (
              'Sign in'
            ) : mode === 'sign-up' ? (
              'Create account'
            ) : (
              'Send reset link'
            )}
          </Button>

          {mode === 'forgot-password' ? (
            <button
              type="button"
              onClick={() => switchMode('sign-in')}
              className="w-full text-center text-sm font-medium text-muted-foreground hover:text-dark"
            >
              ← Back to sign in
            </button>
          ) : null}
        </form>
      </div>
    </div>
  )
}

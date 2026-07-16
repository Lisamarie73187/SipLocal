import { useCallback, useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'

import { getSupabaseBrowserClient } from '@/lib/supabase'
import { logger } from '@/utils/logger'

export type AuthFormMode = 'sign-in' | 'sign-up'

export interface AuthFormResult {
  ok: boolean
  needsEmailConfirmation: boolean
  message: string | null
}

export interface UseAuthActionsResult {
  submitAuth: (
    mode: AuthFormMode,
    input: { email: string; password: string },
  ) => Promise<AuthFormResult>
  submitPasswordReset: (email: string) => Promise<AuthFormResult>
  submitPasswordUpdate: (password: string) => Promise<AuthFormResult>
  submitting: boolean
  formError: string | null
  clearFormError: () => void
}

function formatAuthError(error: AuthError): string {
  if (error.message === 'Invalid login credentials') {
    return 'Email or password is incorrect.'
  }
  return error.message
}

export function useAuthActions(): UseAuthActionsResult {
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const clearFormError = useCallback((): void => {
    setFormError(null)
  }, [])

  const submitAuth = useCallback(
    async (
      mode: AuthFormMode,
      input: { email: string; password: string },
    ): Promise<AuthFormResult> => {
      setSubmitting(true)
      setFormError(null)

      const email = input.email.trim().toLowerCase()
      const password = input.password

      try {
        const supabase = getSupabaseBrowserClient()

        if (mode === 'sign-in') {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })

          if (error) {
            const message = formatAuthError(error)
            setFormError(message)
            return { ok: false, needsEmailConfirmation: false, message }
          }

          if (!data.session) {
            const message = 'Sign in did not create a session. Confirm your email or try again.'
            setFormError(message)
            return { ok: false, needsEmailConfirmation: true, message }
          }

          return { ok: true, needsEmailConfirmation: false, message: null }
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        })

        if (error) {
          const message = formatAuthError(error)
          setFormError(message)
          return { ok: false, needsEmailConfirmation: false, message }
        }

        if (data.session) {
          return { ok: true, needsEmailConfirmation: false, message: null }
        }

        const message =
          'Account created. Check your email to confirm your address, then sign in.'
        return { ok: true, needsEmailConfirmation: true, message }
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Something went wrong. Try again.'
        logger.error('Auth submit failed', caught)
        setFormError(message)
        return { ok: false, needsEmailConfirmation: false, message }
      } finally {
        setSubmitting(false)
      }
    },
    [],
  )

  const submitPasswordReset = useCallback(async (email: string): Promise<AuthFormResult> => {
    setSubmitting(true)
    setFormError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        const message = error.message
        setFormError(message)
        return { ok: false, needsEmailConfirmation: false, message }
      }

      return {
        ok: true,
        needsEmailConfirmation: false,
        message: "If an account exists for that email, we've sent a link to reset your password.",
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Something went wrong. Try again.'
      logger.error('Password reset request failed', caught)
      setFormError(message)
      return { ok: false, needsEmailConfirmation: false, message }
    } finally {
      setSubmitting(false)
    }
  }, [])

  const submitPasswordUpdate = useCallback(async (password: string): Promise<AuthFormResult> => {
    setSubmitting(true)
    setFormError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        const message = error.message
        setFormError(message)
        return { ok: false, needsEmailConfirmation: false, message }
      }

      return { ok: true, needsEmailConfirmation: false, message: null }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Something went wrong. Try again.'
      logger.error('Password update failed', caught)
      setFormError(message)
      return { ok: false, needsEmailConfirmation: false, message }
    } finally {
      setSubmitting(false)
    }
  }, [])

  return {
    submitAuth,
    submitPasswordReset,
    submitPasswordUpdate,
    submitting,
    formError,
    clearFormError,
  }
}

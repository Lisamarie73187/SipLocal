import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { submitVenueClaimRequest } from '@/server/ownerHappyHourPaste'

export interface VenueClaimButtonProps {
  venueId: string
  venueSlug: string
}

export function VenueClaimButton({ venueId, venueSlug }: VenueClaimButtonProps) {
  const { user, loading } = useAuth()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return null
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <p className="text-sm font-medium text-dark">Manage this listing</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bar or restaurant staff can request access to update happy hours.
        </p>
        <Link
          to="/login"
          search={{ redirect: `/venues/${venueSlug}` }}
          className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
        >
          Sign in to claim
        </Link>
      </div>
    )
  }

  const handleSubmit = (): void => {
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    void submitVenueClaimRequest({
      data: { venueId, message: message.trim() || undefined },
    })
      .then(() => {
        setFeedback('Claim submitted. We will review and email you when approved.')
        setMessage('')
      })
      .catch((submitError) => {
        setError(submitError instanceof Error ? submitError.message : 'Claim failed')
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <p className="text-sm font-medium text-dark">Manage this listing</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Work here? Request access to update happy hours on SipLocal.
      </p>
      <label className="mt-3 block space-y-1">
        <span className="text-xs text-muted-foreground">Optional note</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-20 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm"
          placeholder="Your role at this venue"
        />
      </label>
      <Button
        type="button"
        className="mt-3 min-h-11 w-full"
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Request manager access
      </Button>
      {feedback ? (
        <p className="mt-2 text-sm text-dark" role="status">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Link
        to="/manage/$slug"
        params={{ slug: venueSlug }}
        className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
      >
        Already a manager? Open your panel
      </Link>
    </div>
  )
}

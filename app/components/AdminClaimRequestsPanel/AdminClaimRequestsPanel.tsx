import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  listVenueClaimRequests,
  reviewVenueClaimRequest,
  type VenueClaimRequestListItem,
} from '@/server/adminVenues'

export function AdminClaimRequestsPanel() {
  const [claims, setClaims] = useState<VenueClaimRequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const loadClaims = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const rows = await listVenueClaimRequests({ data: { status: 'pending' } })
      setClaims(rows)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load claims')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadClaims()
  }, [loadClaims])

  const review = (claimId: string, action: 'approve' | 'reject'): void => {
    setReviewingId(claimId)
    void reviewVenueClaimRequest({ data: { claimId, action } })
      .then(() => loadClaims())
      .catch((reviewError) => {
        setError(reviewError instanceof Error ? reviewError.message : 'Review failed')
      })
      .finally(() => setReviewingId(null))
  }

  return (
    <section className="space-y-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : claims.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending claim requests.</p>
      ) : (
        <ul className="space-y-3">
          {claims.map((claim) => (
            <li
              key={claim.id}
              className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <p className="font-medium text-dark">{claim.venue_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {claim.user_email ?? claim.user_id}
              </p>
              {claim.message ? (
                <p className="mt-2 text-sm text-dark">{claim.message}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="min-h-9"
                  disabled={reviewingId === claim.id}
                  onClick={() => review(claim.id, 'approve')}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-9"
                  disabled={reviewingId === claim.id}
                  onClick={() => review(claim.id, 'reject')}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { AdminMenuSubmissionReviewCard } from '@/components/AdminMenuSubmissionReviewCard/AdminMenuSubmissionReviewCard'
import {
  approveVenueMenuSubmission,
  listVenueMenuSubmissionsForAdmin,
  reparseVenueMenuSubmission,
  rejectVenueMenuSubmission,
  type AdminMenuSubmissionListItem,
} from '@/server/menuPhotoSubmissions'

export interface AdminMenuSubmissionsPanelProps {
  venueId: string
  onApproved?: () => void | Promise<void>
}

export function AdminMenuSubmissionsPanel({ venueId, onApproved }: AdminMenuSubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<AdminMenuSubmissionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadSubmissions = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const rows = await listVenueMenuSubmissionsForAdmin({
        data: { venueId, status: 'pending_review' },
      })
      setSubmissions(rows)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load menu photos')
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    void loadSubmissions()
  }, [loadSubmissions])

  const review = (
    submissionId: string,
    action: 'approve' | 'reject' | 'parse',
    options?: { communityVerified?: boolean },
  ): void => {
    setReviewingId(submissionId)
    setFeedback(null)

    const request =
      action === 'approve'
        ? approveVenueMenuSubmission({
            data: {
              submissionId,
              mode: 'append',
              communityVerified: options?.communityVerified ?? false,
            },
          })
        : action === 'reject'
          ? rejectVenueMenuSubmission({ data: { submissionId } })
          : reparseVenueMenuSubmission({ data: { submissionId } })

    void request
      .then(async (result) => {
        setFeedback('message' in result ? result.message : 'Updated submission.')
        if (action === 'approve') {
          await onApproved?.()
        }
        return loadSubmissions()
      })
      .catch((reviewError) => {
        setError(reviewError instanceof Error ? reviewError.message : 'Review failed')
      })
      .finally(() => {
        setReviewingId(null)
      })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <section className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div>
        <h2 className="font-heading text-lg font-semibold text-dark">Menu photo submissions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Crowdsourced and manager menu photos waiting for review.
        </p>
      </div>

      {feedback ? (
        <p className="text-sm text-dark" role="status">
          {feedback}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending menu photos.</p>
      ) : (
        <ul className="space-y-4">
          {submissions.map((submission) => (
            <AdminMenuSubmissionReviewCard
              key={submission.id}
              submission={submission}
              reviewingId={reviewingId}
              onApprove={(submissionId, options) => review(submissionId, 'approve', options)}
              onReject={(submissionId) => review(submissionId, 'reject')}
              onParse={(submissionId) => review(submissionId, 'parse')}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

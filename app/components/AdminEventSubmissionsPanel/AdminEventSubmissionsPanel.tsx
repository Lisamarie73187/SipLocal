import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  approveVenueEventSubmission,
  listVenueEventSubmissionsForAdmin,
  rejectVenueEventSubmission,
  type AdminEventSubmissionListItem,
} from '@/server/eventSubmissions'

export interface AdminEventSubmissionsPanelProps {
  venueId: string
  onApprove?: (submission: AdminEventSubmissionListItem) => void
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function statusLabel(status: AdminEventSubmissionListItem['status']): string {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return 'Pending review'
  }
}

function statusClassName(status: AdminEventSubmissionListItem['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-open/15 text-open'
    case 'rejected':
      return 'bg-destructive/15 text-destructive'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function AdminEventSubmissionsPanel({ venueId, onApprove }: AdminEventSubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<AdminEventSubmissionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadSubmissions = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const rows = await listVenueEventSubmissionsForAdmin({ data: { venueId } })
      setSubmissions(rows)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load event submissions')
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    void loadSubmissions()
  }, [loadSubmissions])

  const handleApprove = (submission: AdminEventSubmissionListItem): void => {
    setReviewingId(submission.id)
    setFeedback(null)
    setError(null)

    void approveVenueEventSubmission({ data: { submissionId: submission.id } })
      .then(async (result) => {
        setFeedback(result.message)
        onApprove?.(submission)
        await loadSubmissions()
      })
      .catch((reviewError) => {
        setError(reviewError instanceof Error ? reviewError.message : 'Review failed')
      })
      .finally(() => {
        setReviewingId(null)
      })
  }

  const handleReject = (submission: AdminEventSubmissionListItem): void => {
    setReviewingId(submission.id)
    setFeedback(null)
    setError(null)

    void rejectVenueEventSubmission({ data: { submissionId: submission.id } })
      .then(async (result) => {
        setFeedback(result.message)
        await loadSubmissions()
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
        <h2 className="font-heading text-lg font-semibold text-dark">User-submitted events</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Events submitted from the mobile app for this venue. Approving prefills a draft event
          below for you to schedule and publish.
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
        <p className="text-sm text-muted-foreground">No user-submitted events for this venue.</p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((submission) => (
            <li
              key={submission.id}
              className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-dark">{submission.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClassName(submission.status)}`}
                >
                  {statusLabel(submission.status)}
                </span>
              </div>

              {submission.description ? (
                <p className="text-sm text-muted-foreground">{submission.description}</p>
              ) : null}

              {submission.photo_url ? (
                <img
                  src={submission.photo_url}
                  alt={`Photo submitted with ${submission.title}`}
                  className="max-h-56 w-full rounded-lg border border-border/70 object-contain bg-muted/30"
                />
              ) : null}

              <p className="text-xs text-muted-foreground">
                {submission.user_email ?? 'Unknown user'}
                {submission.created_at ? ` · ${formatSubmittedAt(submission.created_at)}` : ''}
              </p>

              {submission.status === 'pending_review' ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    disabled={reviewingId !== null}
                    onClick={() => handleApprove(submission)}
                  >
                    {reviewingId === submission.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    disabled={reviewingId !== null}
                    onClick={() => handleReject(submission)}
                  >
                    {reviewingId === submission.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Reject
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

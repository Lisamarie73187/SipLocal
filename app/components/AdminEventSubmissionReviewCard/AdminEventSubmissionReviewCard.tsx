import { Link } from '@tanstack/react-router'
import { Loader2, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { AdminPendingEventSubmissionItem } from '@/server/eventSubmissions'

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

export interface AdminEventSubmissionReviewCardProps {
  submission: AdminPendingEventSubmissionItem
  reviewingId: string | null
  onApprove: (submissionId: string) => void
  onReject: (submissionId: string) => void
}

export function AdminEventSubmissionReviewCard({
  submission,
  reviewingId,
  onApprove,
  onReject,
}: AdminEventSubmissionReviewCardProps) {
  const isReviewing = reviewingId === submission.id

  return (
    <li className="rounded-xl border border-border/70 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-dark">{submission.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {submission.venue_name}
            {submission.address_line1 ? ` · ${submission.address_line1}` : ''}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {submission.user_email ?? 'Unknown user'}
            {submission.created_at ? ` · ${formatSubmittedAt(submission.created_at)}` : ''}
          </p>
          <p className="mt-1 text-xs text-secondary">User-submitted event</p>
        </div>
        {submission.venue_id ? (
          <Link
            to="/admin/venues/$venueId"
            params={{ venueId: submission.venue_id }}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 text-sm font-semibold text-dark hover:bg-muted"
          >
            <Pencil className="size-4" aria-hidden />
            Open venue
          </Link>
        ) : null}
      </div>

      {submission.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{submission.description}</p>
      ) : null}

      {submission.photo_url ? (
        <img
          src={submission.photo_url}
          alt={`Photo submitted with ${submission.title}`}
          className="mt-2 max-h-56 w-full rounded-lg border border-border/70 bg-muted/30 object-contain"
        />
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          disabled={reviewingId !== null}
          onClick={() => onApprove(submission.id)}
        >
          {isReviewing ? <Loader2 className="size-4 animate-spin" /> : null}
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={reviewingId !== null}
          onClick={() => onReject(submission.id)}
        >
          {isReviewing ? <Loader2 className="size-4 animate-spin" /> : null}
          Reject
        </Button>
      </div>
    </li>
  )
}

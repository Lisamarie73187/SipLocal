import { useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { formatHappyHourDayLabel } from '@/utils/happyHourSchedule'
import { formatDealDisplayText } from '@/utils/dealChips'
import { dealsFromParsedSlot } from '@/utils/ownerDealRows'
import {
  formatSubmitterLocation,
  submitterLocationMapsUrl,
} from '@/utils/submitterLocation'
import type {
  AdminCustomerMenuSubmissionItem,
  AdminMenuSubmissionListItem,
} from '@/server/menuPhotoSubmissions'

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

export interface AdminMenuSubmissionReviewCardProps {
  submission: AdminMenuSubmissionListItem | AdminCustomerMenuSubmissionItem
  showVenue?: boolean
  reviewingId: string | null
  onApprove: (submissionId: string, options?: { communityVerified?: boolean }) => void
  onReject: (submissionId: string) => void
  onParse?: (submissionId: string) => void
}

function hasVenueDetails(
  submission: AdminMenuSubmissionListItem | AdminCustomerMenuSubmissionItem,
): submission is AdminCustomerMenuSubmissionItem {
  return 'venue_name' in submission
}

export function AdminMenuSubmissionReviewCard({
  submission,
  showVenue = false,
  reviewingId,
  onApprove,
  onReject,
  onParse,
}: AdminMenuSubmissionReviewCardProps) {
  const venueDetails = hasVenueDetails(submission) ? submission : null
  const hasParsedSlots = (submission.parsed_slots?.slots.length ?? 0) > 0
  const [communityVerified, setCommunityVerified] = useState(submission.source === 'crowd')

  return (
    <li className="rounded-xl border border-border/70 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {showVenue && venueDetails ? (
            <>
              <p className="font-medium text-dark">{venueDetails.venue_name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{venueDetails.address_line1}</p>
            </>
          ) : (
            <p className="text-sm font-medium text-dark">
              {submission.source === 'manager' ? 'Manager upload' : 'Customer upload'}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {submission.user_email ?? submission.user_id}
            {submission.created_at ? ` · ${formatSubmittedAt(submission.created_at)}` : ''}
          </p>
          {submission.submitter_lat != null && submission.submitter_lng != null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Submitter location:{' '}
              <a
                href={submitterLocationMapsUrl(submission.submitter_lat, submission.submitter_lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {formatSubmitterLocation(submission.submitter_lat, submission.submitter_lng)}
              </a>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {showVenue && venueDetails ? (
            <Link
              to="/admin/venues/$venueId"
              params={{ venueId: submission.venue_id }}
              className="inline-flex min-h-9 items-center rounded-lg border border-border/70 bg-card px-3 text-sm font-semibold text-dark hover:bg-muted"
            >
              Open venue
            </Link>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={reviewingId === submission.id}
            onClick={() => onApprove(submission.id, { communityVerified })}
          >
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={reviewingId === submission.id}
            onClick={() => onReject(submission.id)}
          >
            Reject
          </Button>
          {onParse ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={reviewingId === submission.id}
              onClick={() => onParse(submission.id)}
            >
              {hasParsedSlots ? 'Re-parse with AI' : 'Parse with AI'}
            </Button>
          ) : null}
        </div>
      </div>

      <img
        src={submission.photo_url}
        alt="Submitted happy hour menu"
        className="mt-3 max-h-64 w-full rounded-lg border border-border/70 object-contain bg-muted/20"
      />

      <label className="mt-3 flex min-h-9 cursor-pointer items-center gap-2 text-xs text-dark">
        <input
          type="checkbox"
          className="size-4 rounded border-border"
          checked={communityVerified}
          onChange={(event) => setCommunityVerified(event.target.checked)}
          disabled={reviewingId === submission.id}
        />
        Mark as community verified
      </label>

      {submission.parsed_slots?.slots.length ? (
        <ul className="mt-3 space-y-2 text-xs text-dark">
          {submission.parsed_slots.slots.map((slot, index) => {
            const dealRows = dealsFromParsedSlot(slot).filter((deal) => deal.label.trim())

            return (
              <li key={`${submission.id}-${index}`} className="space-y-1">
                <p className="font-semibold">
                  {formatHappyHourDayLabel(slot.days)} · {slot.start_time}–{slot.end_time}
                </p>
                {dealRows.length > 0 ? (
                  <ul className="space-y-0.5 pl-3 text-muted-foreground">
                    {dealRows.map((deal, dealIndex) => (
                      <li key={`${submission.id}-${index}-${dealIndex}`}>
                        {formatDealDisplayText(deal.label, deal.price_text)}
                      </li>
                    ))}
                  </ul>
                ) : slot.deal_summary?.trim() ? (
                  <p className="pl-3 text-muted-foreground">{slot.deal_summary.trim()}</p>
                ) : (
                  <p className="pl-3 text-secondary">No menu items parsed — re-submit or enter manually.</p>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No AI parse yet — approve to save the photo and enter details manually in the venue editor,
          or click Parse with AI first.
        </p>
      )}
    </li>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Pencil } from 'lucide-react'

import { AdminMenuSubmissionReviewCard } from '@/components/AdminMenuSubmissionReviewCard/AdminMenuSubmissionReviewCard'
import { AdminVenueSuggestionReviewCard } from '@/components/AdminVenueSuggestionReviewCard/AdminVenueSuggestionReviewCard'
import {
  approveVenueMenuSubmission,
  listPendingCustomerMenuSubmissions,
  reparseVenueMenuSubmission,
  rejectVenueMenuSubmission,
  type AdminCustomerMenuSubmissionItem,
} from '@/server/menuPhotoSubmissions'
import {
  listPendingVenueSuggestions,
  parseVenueSuggestionMenuPhoto,
  rejectVenueSuggestion,
  type AdminVenueSuggestionItem,
} from '@/server/venueSuggestions'
import {
  listPendingVenueUpdates,
  type AdminPendingVenueUpdate,
} from '@/server/adminVenues'
import { cn } from '@/utils'

type ReviewTab = 'venue_updates' | 'customer_submissions' | 'venue_suggestions'

function formatUpdatedAt(value: string): string {
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

function statusLabel(dataStatus: string): string {
  switch (dataStatus) {
    case 'discovered':
      return 'Discovered — add happy hours'
    case 'no_happy_hour_found':
      return 'No happy hour found yet'
    case 'pending_review':
      return 'Pending review'
    case 'flagged':
      return 'Flagged'
    default:
      return dataStatus.replaceAll('_', ' ')
  }
}

function PendingVenueUpdateList({ updates }: { updates: AdminPendingVenueUpdate[] }) {
  return (
    <ul className="space-y-2">
      {updates.map((venue) => (
        <li
          key={venue.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-medium text-dark">{venue.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {venue.address_line1}
              {venue.pending_slot_count > 0
                ? ` · ${venue.pending_slot_count} slot${venue.pending_slot_count === 1 ? '' : 's'} to review`
                : ` · ${statusLabel(venue.data_status)}`}
            </p>
            {venue.updated_at ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {formatUpdatedAt(venue.updated_at)}
              </p>
            ) : null}
          </div>
          <Link
            to="/admin/venues/$venueId"
            params={{ venueId: venue.id }}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 text-sm font-semibold text-dark hover:bg-muted"
          >
            <Pencil className="size-4" aria-hidden />
            Review
          </Link>
        </li>
      ))}
    </ul>
  )
}

export interface AdminPendingUpdatesPanelProps {
  citySlug?: string
}

export function AdminPendingUpdatesPanel({ citySlug = 'bend-or' }: AdminPendingUpdatesPanelProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>('venue_updates')
  const [managerUpdates, setManagerUpdates] = useState<AdminPendingVenueUpdate[]>([])
  const [staffReview, setStaffReview] = useState<AdminPendingVenueUpdate[]>([])
  const [customerSubmissions, setCustomerSubmissions] = useState<AdminCustomerMenuSubmissionItem[]>(
    [],
  )
  const [venueSuggestions, setVenueSuggestions] = useState<AdminVenueSuggestionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadUpdates = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [result, submissions, suggestions] = await Promise.all([
        listPendingVenueUpdates({ data: { citySlug, limit: 15 } }),
        listPendingCustomerMenuSubmissions({ data: { citySlug, limit: 20 } }),
        listPendingVenueSuggestions({ data: { citySlug, limit: 20 } }),
      ])
      setManagerUpdates(result.managerUpdates)
      setStaffReview(result.staffReview)
      setCustomerSubmissions(submissions)
      setVenueSuggestions(suggestions)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load pending updates')
      setManagerUpdates([])
      setStaffReview([])
      setCustomerSubmissions([])
      setVenueSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [citySlug])

  useEffect(() => {
    void loadUpdates()
  }, [loadUpdates])

  const reviewCustomerSubmission = (
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
      .then((result) => {
        setFeedback('message' in result ? result.message : 'Updated submission.')
        return loadUpdates()
      })
      .catch((reviewError) => {
        setError(reviewError instanceof Error ? reviewError.message : 'Review failed')
      })
      .finally(() => {
        setReviewingId(null)
      })
  }

  const venueUpdateCount = managerUpdates.length + staffReview.length
  const customerCount = customerSubmissions.length
  const suggestionCount = venueSuggestions.length

  const parseVenueSuggestion = (submissionId: string): void => {
    setReviewingId(submissionId)
    setFeedback(null)

    void parseVenueSuggestionMenuPhoto({ data: { submissionId } })
      .then((result) => {
        setFeedback(result.message)
        return loadUpdates()
      })
      .catch((parseError) => {
        setError(parseError instanceof Error ? parseError.message : 'Parse failed')
      })
      .finally(() => {
        setReviewingId(null)
      })
  }

  const dismissVenueSuggestion = (submissionId: string): void => {
    setReviewingId(submissionId)
    setFeedback(null)

    void rejectVenueSuggestion({ data: { submissionId } })
      .then((result) => {
        setFeedback(result.message)
        return loadUpdates()
      })
      .catch((reviewError) => {
        setError(reviewError instanceof Error ? reviewError.message : 'Review failed')
      })
      .finally(() => {
        setReviewingId(null)
      })
  }

  return (
    <section className="space-y-6 rounded-xl border border-secondary/35 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dark">Pending updates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review manager edits, your discovery queue, and customer-submitted menu photos.
          </p>
        </div>
        <Link
          to="/admin/venues"
          className="min-h-9 text-sm font-medium text-primary hover:underline"
        >
          All venues
        </Link>
      </div>

      <div
        className="inline-flex rounded-xl border border-border/70 bg-muted/40 p-1"
        role="tablist"
        aria-label="Review queues"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'venue_updates'}
          onClick={() => setActiveTab('venue_updates')}
          className={cn(
            'min-h-9 rounded-lg px-3 text-sm font-medium transition-colors',
            activeTab === 'venue_updates'
              ? 'bg-card text-dark shadow-sm'
              : 'text-muted-foreground hover:text-dark',
          )}
        >
          Venue updates
          {venueUpdateCount > 0 ? (
            <span className="ml-1.5 tabular-nums text-muted-foreground">({venueUpdateCount})</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'customer_submissions'}
          onClick={() => setActiveTab('customer_submissions')}
          className={cn(
            'min-h-9 rounded-lg px-3 text-sm font-medium transition-colors',
            activeTab === 'customer_submissions'
              ? 'bg-card text-dark shadow-sm'
              : 'text-muted-foreground hover:text-dark',
          )}
        >
          Customer submissions
          {customerCount > 0 ? (
            <span className="ml-1.5 tabular-nums text-muted-foreground">({customerCount})</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'venue_suggestions'}
          onClick={() => setActiveTab('venue_suggestions')}
          className={cn(
            'min-h-9 rounded-lg px-3 text-sm font-medium transition-colors',
            activeTab === 'venue_suggestions'
              ? 'bg-card text-dark shadow-sm'
              : 'text-muted-foreground hover:text-dark',
          )}
        >
          Venue suggestions
          {suggestionCount > 0 ? (
            <span className="ml-1.5 tabular-nums text-muted-foreground">({suggestionCount})</span>
          ) : null}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {feedback ? (
        <p className="text-sm text-dark" role="status">
          {feedback}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : activeTab === 'venue_updates' ? (
        venueUpdateCount === 0 ? (
          <p className="text-sm text-muted-foreground">No pending happy hour updates right now.</p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div>
                <h3 className="font-heading text-sm font-semibold text-dark">
                  Manager submissions
                  {managerUpdates.length > 0 ? (
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({managerUpdates.length})
                    </span>
                  ) : null}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Edits from linked /manage accounts waiting for approval before going live.
                </p>
              </div>
              {managerUpdates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No manager submissions right now.</p>
              ) : (
                <PendingVenueUpdateList updates={managerUpdates} />
              )}
            </div>

            <div className="space-y-3 border-t border-border/60 pt-6">
              <div>
                <h3 className="font-heading text-sm font-semibold text-dark">
                  Your review queue
                  {staffReview.length > 0 ? (
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({staffReview.length})
                    </span>
                  ) : null}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Discovered or scraped venues with no linked manager — add hours, verify, and
                  publish.
                </p>
              </div>
              {staffReview.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing in your queue right now.</p>
              ) : (
                <PendingVenueUpdateList updates={staffReview} />
              )}
            </div>
          </div>
        )
      ) : activeTab === 'customer_submissions' ? (
        customerCount === 0 ? (
          <p className="text-sm text-muted-foreground">No customer menu photos waiting for review.</p>
        ) : (
          <ul className="space-y-4">
            {customerSubmissions.map((submission) => (
              <AdminMenuSubmissionReviewCard
                key={submission.id}
                submission={submission}
                showVenue
                reviewingId={reviewingId}
                onApprove={(submissionId, options) =>
                  reviewCustomerSubmission(submissionId, 'approve', options)
                }
                onReject={(submissionId) => reviewCustomerSubmission(submissionId, 'reject')}
                onParse={(submissionId) => reviewCustomerSubmission(submissionId, 'parse')}
              />
            ))}
          </ul>
        )
      ) : suggestionCount === 0 ? (
        <p className="text-sm text-muted-foreground">No missing-venue suggestions waiting for review.</p>
      ) : (
        <ul className="space-y-4">
          {venueSuggestions.map((suggestion) => (
            <AdminVenueSuggestionReviewCard
              key={suggestion.id}
              suggestion={suggestion}
              citySlug={citySlug}
              reviewingId={reviewingId}
              onDismiss={dismissVenueSuggestion}
              onParse={parseVenueSuggestion}
              onReviewStart={setReviewingId}
              onReviewEnd={() => setReviewingId(null)}
              onSuccess={(message) => {
                setFeedback(message)
                setError(null)
                void loadUpdates()
              }}
              onError={(message) => {
                setError(message)
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

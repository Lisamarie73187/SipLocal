import { formatHappyHourDayLabel } from '@/utils/happyHourSchedule'
import { formatDealDisplayText } from '@/utils/dealChips'
import { dealsFromParsedSlot } from '@/utils/ownerDealRows'
import {
  formatSubmitterLocation,
  submitterLocationMapsUrl,
} from '@/utils/submitterLocation'
import type { AdminVenueSuggestionItem } from '@/server/venueSuggestions'

import { AdminVenueSuggestionActions } from '@/components/AdminVenueSuggestionActions/AdminVenueSuggestionActions'
import { Button } from '@/components/ui/button'

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

export interface AdminVenueSuggestionReviewCardProps {
  suggestion: AdminVenueSuggestionItem
  citySlug: string
  reviewingId: string | null
  onDismiss: (submissionId: string) => void
  onParse?: (submissionId: string) => void
  onReviewStart: (submissionId: string) => void
  onReviewEnd: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function AdminVenueSuggestionReviewCard({
  suggestion,
  citySlug,
  reviewingId,
  onDismiss,
  onParse,
  onReviewStart,
  onReviewEnd,
  onSuccess,
  onError,
}: AdminVenueSuggestionReviewCardProps) {
  const hasParsedSlots = (suggestion.parsed_slots?.slots.length ?? 0) > 0

  return (
    <li className="rounded-xl border border-border/70 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-dark">{suggestion.venue_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {suggestion.user_email ?? suggestion.user_id}
            {suggestion.created_at ? ` · ${formatSubmittedAt(suggestion.created_at)}` : ''}
          </p>
          <p className="mt-1 text-xs text-secondary">New venue suggestion</p>
          {suggestion.submitter_lat != null && suggestion.submitter_lng != null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Submitter location:{' '}
              <a
                href={submitterLocationMapsUrl(suggestion.submitter_lat, suggestion.submitter_lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {formatSubmitterLocation(suggestion.submitter_lat, suggestion.submitter_lng)}
              </a>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onParse ? (
            <Button
              type="button"
              size="sm"
              disabled={reviewingId === suggestion.id}
              onClick={() => onParse(suggestion.id)}
            >
              {hasParsedSlots ? 'Re-parse with AI' : 'Parse with AI'}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={reviewingId === suggestion.id}
            onClick={() => onDismiss(suggestion.id)}
          >
            Dismiss
          </Button>
        </div>
      </div>

      <img
        src={suggestion.photo_url}
        alt={`Happy hour menu for ${suggestion.venue_name}`}
        className="mt-3 max-h-64 w-full rounded-lg border border-border/70 object-contain bg-muted/20"
      />

      {suggestion.parsed_slots?.slots.length ? (
        <ul className="mt-3 space-y-2 text-xs text-dark">
          {suggestion.parsed_slots.slots.map((slot, index) => {
            const dealRows = dealsFromParsedSlot(slot).filter((deal) => deal.label.trim())

            return (
              <li key={`${suggestion.id}-${index}`} className="space-y-1">
                <p className="font-semibold">
                  {formatHappyHourDayLabel(slot.days)} · {slot.start_time}–{slot.end_time}
                </p>
                {dealRows.length > 0 ? (
                  <ul className="space-y-0.5 pl-3 text-muted-foreground">
                    {dealRows.map((deal, dealIndex) => (
                      <li key={`${suggestion.id}-${index}-${dealIndex}`}>
                        {formatDealDisplayText(deal.label, deal.price_text)}
                      </li>
                    ))}
                  </ul>
                ) : slot.deal_summary?.trim() ? (
                  <p className="pl-3 text-muted-foreground">{slot.deal_summary.trim()}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No AI parse yet — parse to auto-fill deals, or add the venue and enter details manually
          in the editor.
        </p>
      )}

      <AdminVenueSuggestionActions
        suggestion={suggestion}
        citySlug={citySlug}
        reviewingId={reviewingId}
        onReviewStart={onReviewStart}
        onReviewEnd={onReviewEnd}
        onSuccess={onSuccess}
        onError={onError}
      />
    </li>
  )
}

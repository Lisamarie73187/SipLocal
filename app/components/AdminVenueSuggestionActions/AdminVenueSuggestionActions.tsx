import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  approveVenueSuggestion,
  lookupVenueSuggestion,
  type AdminVenueSuggestionItem,
} from '@/server/venueSuggestions'
import type { VenueSuggestionLookupResult } from '@/lib/scrape/lookupVenueSuggestion'
import { cn } from '@/utils'

function lookupStrategyLabel(strategy: VenueSuggestionLookupResult['strategy']): string {
  switch (strategy) {
    case 'name':
      return 'Matched by venue name on Google Places.'
    case 'submitter_location':
      return 'No name match — showing results near the submitter’s location.'
    default:
      return 'No Google Places match. You can still update an existing listing below.'
  }
}

export interface AdminVenueSuggestionActionsProps {
  suggestion: AdminVenueSuggestionItem
  citySlug: string
  reviewingId: string | null
  onReviewStart: (submissionId: string) => void
  onReviewEnd: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function AdminVenueSuggestionActions({
  suggestion,
  citySlug,
  reviewingId,
  onReviewStart,
  onReviewEnd,
  onSuccess,
  onError,
}: AdminVenueSuggestionActionsProps) {
  const [lookup, setLookup] = useState<VenueSuggestionLookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)

  const isBusy = reviewingId === suggestion.id

  const runLookup = (): void => {
    setLookupLoading(true)
    setLookupError(null)

    void lookupVenueSuggestion({ data: { submissionId: suggestion.id, citySlug } })
      .then((result) => {
        setLookup(result)
        setSelectedPlaceId(result.googlePlaces[0]?.placeId ?? null)
        const existingMatch =
          result.existingVenues.find((venue) => venue.matchReason === 'place_id') ??
          result.existingVenues[0]
        setSelectedVenueId(existingMatch?.id ?? null)
      })
      .catch((error) => {
        setLookup(null)
        setLookupError(error instanceof Error ? error.message : 'Google Places lookup failed.')
      })
      .finally(() => {
        setLookupLoading(false)
      })
  }

  const approve = (action: 'create_from_place' | 'update_existing'): void => {
    onReviewStart(suggestion.id)

    void approveVenueSuggestion({
      data: {
        submissionId: suggestion.id,
        action,
        googlePlaceId: action === 'create_from_place' ? selectedPlaceId ?? undefined : undefined,
        venueId: action === 'update_existing' ? selectedVenueId ?? undefined : undefined,
        mode: 'append',
      },
    })
      .then((result) => {
        onSuccess(result.message)
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : 'Could not approve suggestion.')
      })
      .finally(() => {
        onReviewEnd()
      })
  }

  const hasParsedSlots = (suggestion.parsed_slots?.slots.length ?? 0) > 0

  return (
    <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isBusy || lookupLoading}
          onClick={runLookup}
        >
          {lookupLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          Look up on Google Places
        </Button>
      </div>

      {lookupError ? (
        <p className="text-xs text-destructive" role="alert">
          {lookupError}
        </p>
      ) : null}

      {lookup ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{lookupStrategyLabel(lookup.strategy)}</p>

          {lookup.googlePlaces.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-dark">Google Places matches</legend>
              <ul className="space-y-2">
                {lookup.googlePlaces.map((place) => (
                  <li key={place.placeId}>
                    <label
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-lg border px-3 py-2 text-xs',
                        selectedPlaceId === place.placeId
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border/70 bg-background',
                      )}
                    >
                      <input
                        type="radio"
                        name={`google-place-${suggestion.id}`}
                        className="mt-0.5"
                        checked={selectedPlaceId === place.placeId}
                        onChange={() => setSelectedPlaceId(place.placeId)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-dark">{place.name}</span>
                        <span className="block text-muted-foreground">{place.formattedAddress}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                disabled={isBusy || !selectedPlaceId}
                onClick={() => approve('create_from_place')}
              >
                {hasParsedSlots ? 'Add from Google & apply happy hour' : 'Add from Google'}
              </Button>
            </fieldset>
          ) : null}

          {lookup.existingVenues.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-dark">Already in SipLocal</p>
              <ul className="space-y-2">
                {lookup.existingVenues.map((venue) => (
                  <li
                    key={venue.id}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs',
                      selectedVenueId === venue.id
                        ? 'border-secondary/50 bg-secondary/5'
                        : 'border-border/70 bg-background',
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <label className="flex min-w-0 flex-1 cursor-pointer gap-2">
                        <input
                          type="radio"
                          name={`existing-venue-${suggestion.id}`}
                          className="mt-0.5"
                          checked={selectedVenueId === venue.id}
                          onChange={() => setSelectedVenueId(venue.id)}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-dark">{venue.name}</span>
                          <span className="block text-muted-foreground">{venue.address_line1}</span>
                          <span className="mt-0.5 block text-muted-foreground">
                            {venue.matchReason === 'place_id'
                              ? 'Matched Google place ID'
                              : 'Name looks similar'}
                            {venue.is_published ? ' · Published' : ' · Not published'}
                          </span>
                        </span>
                      </label>
                      <Link
                        to="/admin/venues/$venueId"
                        params={{ venueId: venue.id }}
                        className="inline-flex min-h-8 shrink-0 items-center rounded-md border border-border/70 px-2.5 text-xs font-semibold text-dark hover:bg-muted"
                      >
                        Open editor
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isBusy || !selectedVenueId}
                onClick={() => approve('update_existing')}
              >
                {hasParsedSlots ? 'Update listing & apply happy hour' : 'Update existing listing'}
              </Button>
            </div>
          ) : null}

          {!hasParsedSlots ? (
            <p className="text-xs text-muted-foreground">
              No AI parse yet — you can add the venue and enter hours manually in the editor, or
              parse the photo first to auto-fill deals.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

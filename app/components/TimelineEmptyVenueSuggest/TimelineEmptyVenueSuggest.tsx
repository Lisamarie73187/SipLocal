import { useState } from 'react'

import { SuggestVenueDialog } from '@/components/SuggestVenueDialog/SuggestVenueDialog'

export interface TimelineEmptyVenueSuggestProps {
  citySlug: string
  hasActiveFilters: boolean
  onClearFilters?: () => void
}

export function TimelineEmptyVenueSuggest({
  citySlug,
  hasActiveFilters,
  onClearFilters,
}: TimelineEmptyVenueSuggestProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
        <p className="text-2xl" aria-hidden>
          🌅
        </p>
        <p className="font-heading mt-2 text-sm font-semibold text-dark">No happy hours found</p>
        {hasActiveFilters ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Try clearing some filters.
          </p>
        ) : null}
        {hasActiveFilters && onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="btn-gradient mt-4 rounded-full px-4 py-1.5 text-xs font-medium"
          >
            Clear filters
          </button>
        ) : null}

        <div className="mt-5 border-t border-border/60 pt-5">
          <p className="text-sm text-muted-foreground">Are you not seeing the venue?</p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            Suggest a venue for review
          </button>
        </div>
      </div>

      <SuggestVenueDialog
        citySlug={citySlug}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}

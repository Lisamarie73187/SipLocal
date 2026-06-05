import { useState } from 'react'
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { archiveAdminVenues, unarchiveAdminVenues } from '@/server/adminVenues'

interface AdminArchiveVenuesProps {
  venueIds: string[]
  mode: 'archive' | 'unarchive'
  onComplete?: (result: { count: number; venueNames: string[] }) => void
  disabled?: boolean
  size?: 'default' | 'sm'
  label?: string
}

export function AdminArchiveVenues({
  venueIds,
  mode,
  onComplete,
  disabled = false,
  size = 'default',
  label,
}: AdminArchiveVenuesProps) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buttonLabel =
    label ??
    (mode === 'archive'
      ? venueIds.length === 1
        ? 'Archive'
        : `Archive selected (${venueIds.length})`
      : venueIds.length === 1
        ? 'Restore'
        : `Restore selected (${venueIds.length})`)

  const handleClick = (): void => {
    if (venueIds.length === 0) {
      return
    }

    const confirmMessage =
      mode === 'archive'
        ? venueIds.length === 1
          ? 'Archive this venue? It will be hidden from lists and unpublished.'
          : `Archive ${venueIds.length} venues? They will be hidden from lists and unpublished.`
        : venueIds.length === 1
          ? 'Restore this venue from the archive?'
          : `Restore ${venueIds.length} venues from the archive?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setWorking(true)
    setError(null)

    const action =
      mode === 'archive'
        ? archiveAdminVenues({ data: { venueIds } })
        : unarchiveAdminVenues({ data: { venueIds } })

    void action
      .then((result) => {
        if (mode === 'archive') {
          onComplete?.({
            count: result.archivedCount,
            venueNames: result.venueNames,
          })
        } else {
          onComplete?.({
            count: result.unarchivedCount,
            venueNames: result.venueNames,
          })
        }
      })
      .catch((archiveError) => {
        setError(
          archiveError instanceof Error ? archiveError.message : 'Archive action failed',
        )
      })
      .finally(() => {
        setWorking(false)
      })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={handleClick}
        disabled={disabled || working || venueIds.length === 0}
        className={size === 'sm' ? 'min-h-9 gap-1.5' : 'min-h-11 gap-2'}
      >
        {working ? (
          <Loader2 className="size-4 animate-spin" />
        ) : mode === 'archive' ? (
          <Archive className="size-3.5" aria-hidden />
        ) : (
          <ArchiveRestore className="size-3.5" aria-hidden />
        )}
        {buttonLabel}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

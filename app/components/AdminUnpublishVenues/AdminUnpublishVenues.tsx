import { useState } from 'react'
import { EyeOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { unpublishAdminVenues } from '@/server/adminVenues'

interface AdminUnpublishVenuesProps {
  venueIds: string[]
  onComplete?: (result: { unpublishedCount: number; venueNames: string[] }) => void
  disabled?: boolean
  size?: 'default' | 'sm'
  label?: string
}

export function AdminUnpublishVenues({
  venueIds,
  onComplete,
  disabled = false,
  size = 'default',
  label,
}: AdminUnpublishVenuesProps) {
  const [unpublishing, setUnpublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buttonLabel =
    label ??
    (venueIds.length === 1
      ? 'Unpublish'
      : `Unpublish selected (${venueIds.length})`)

  const handleClick = (): void => {
    if (venueIds.length === 0) {
      return
    }

    const confirmMessage =
      venueIds.length === 1
        ? 'Unpublish this venue? It will be removed from the public map.'
        : `Unpublish ${venueIds.length} venues? They will be removed from the public map.`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setUnpublishing(true)
    setError(null)
    void unpublishAdminVenues({ data: { venueIds } })
      .then((result) => {
        onComplete?.(result)
      })
      .catch((unpublishError) => {
        setError(
          unpublishError instanceof Error
            ? unpublishError.message
            : 'Failed to unpublish venues',
        )
      })
      .finally(() => {
        setUnpublishing(false)
      })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={handleClick}
        disabled={disabled || unpublishing || venueIds.length === 0}
        className={size === 'sm' ? 'min-h-9 gap-1.5' : 'min-h-11 gap-2'}
      >
        {unpublishing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <EyeOff className="size-3.5" aria-hidden />
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

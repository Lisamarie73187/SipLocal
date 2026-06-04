import { useEffect, useState } from 'react'

import { cn } from '@/utils'

export interface VenueThumbnailProps {
  imageUrl?: string | null
  venueName: string
  className?: string
  emojiClassName?: string
  /** When missing or broken, render nothing instead of the gradient placeholder */
  fallback?: 'placeholder' | 'hidden'
}

function VenueThumbnailPlaceholder({
  className,
  emojiClassName,
  venueName,
}: {
  className?: string
  emojiClassName?: string
  venueName: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center justify-center gap-0.5',
        'bg-gradient-to-br from-primary/30 via-secondary/20 to-accent',
        className,
      )}
      role="img"
      aria-label={`${venueName} placeholder image`}
    >
      <span className={cn(emojiClassName, 'leading-none')} aria-hidden>
        🍹
      </span>
      <span className="font-heading text-[8px] font-bold tracking-widest text-dark/50 uppercase">
        SipSocial
      </span>
    </div>
  )
}

export function VenueThumbnail({
  imageUrl,
  venueName,
  className,
  emojiClassName = 'text-2xl',
  fallback = 'placeholder',
}: VenueThumbnailProps) {
  const trimmedUrl = imageUrl?.trim() ?? ''
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
  }, [trimmedUrl])

  if (!trimmedUrl || loadFailed) {
    if (fallback === 'hidden') {
      return null
    }
    return (
      <VenueThumbnailPlaceholder
        className={className}
        emojiClassName={emojiClassName}
        venueName={venueName}
      />
    )
  }

  return (
    <img
      src={trimmedUrl}
      alt={`${venueName} photo`}
      loading="lazy"
      decoding="async"
      onError={() => setLoadFailed(true)}
      className={cn('shrink-0 object-cover', className)}
    />
  )
}

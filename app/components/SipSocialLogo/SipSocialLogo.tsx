import { cn } from '@/utils'

export interface SipSocialLogoProps {
  /** Full horizontal lockup from brand assets; `mark` uses the pin icon only. */
  variant?: 'full' | 'mark'
  showWordmark?: boolean
  tagline?: string | null
  markClassName?: string
  className?: string
}

const FULL_LOGO_SRC = '/sipsocial-logo.png'
const MARK_SRC = '/sipsocial-mark.svg'

export function SipSocialLogo({
  variant = 'full',
  showWordmark = true,
  tagline,
  markClassName,
  className,
}: SipSocialLogoProps) {
  if (variant === 'full') {
    return (
      <img
        src={FULL_LOGO_SRC}
        alt="SipSocial — Sip. Share. Socialize."
        width={220}
        height={56}
        className={cn('h-10 w-auto max-w-[min(100%,14rem)] object-contain object-left md:h-12', className)}
        decoding="async"
      />
    )
  }

  const resolvedTagline = tagline === undefined ? 'Find happy hours near you' : tagline

  return (
    <div className={cn('flex items-center gap-3.5', className)}>
      <img
        src={MARK_SRC}
        alt=""
        width={48}
        height={48}
        className={cn('size-12 shrink-0 rounded-2xl shadow-sm', markClassName)}
        decoding="async"
      />
      {showWordmark ? (
        <div className="min-w-0">
          <p className="font-heading font-bold tracking-tight text-dark">SipSocial</p>
          {resolvedTagline ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{resolvedTagline}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

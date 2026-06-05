import type { VenueTrustMeta } from '@/utils/venueTrust'
import {
  formatSourceCountLabel,
  formatTrustFreshnessLabel,
  getConfidenceBadgeLabel,
  isUnverifiedConfidence,
  shouldShowVenueTrustFooter,
} from '@/utils/venueTrust'
import { cn } from '@/utils'

export interface VenueTrustFooterProps {
  meta: VenueTrustMeta
  className?: string
  ariaLabel?: string
}

export function VenueTrustFooter({
  meta,
  className,
  ariaLabel = 'Happy hour data sources',
}: VenueTrustFooterProps) {
  if (!shouldShowVenueTrustFooter(meta)) {
    return null
  }

  const unverified = isUnverifiedConfidence(meta.confidence)

  return (
    <section className={cn('venue-trust-footer', className)} aria-label={ariaLabel}>
      {meta.freshnessDate && meta.freshnessKind ? (
        <p className="venue-trust-footer__updated text-xs text-muted-foreground">
          {formatTrustFreshnessLabel(meta.freshnessKind, meta.freshnessDate)}
        </p>
      ) : null}

      {meta.confidence != null || unverified ? (
        <span
          className={cn(
            'venue-trust-footer__badge inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase',
            unverified
              ? 'venue-trust-footer__badge--unverified'
              : 'venue-trust-footer__badge--verified',
          )}
        >
          {getConfidenceBadgeLabel(meta.confidence)}
        </span>
      ) : null}

      {meta.sourceCount > 0 ? (
        <p className="venue-trust-footer__sources text-xs text-muted-foreground">
          {formatSourceCountLabel(meta.sourceCount)}
        </p>
      ) : null}
    </section>
  )
}

import type { VenueTrustMeta } from '@/utils/venueTrust'
import {
  formatSourceCountLabel,
  formatTrustFreshnessLabel,
  getConfidenceBadgeLabel,
  isUnverifiedConfidence,
  shouldShowVenueTrustFooter,
} from '@/utils/venueTrust'
import { cn } from '@/utils'

import { VenueInfoCorrection } from '@/components/VenueInfoCorrection/VenueInfoCorrection'

export interface VenueTrustFooterProps {
  meta: VenueTrustMeta
  className?: string
  ariaLabel?: string
  venueId?: string
  venueSlug?: string
  showInfoCorrection?: boolean
}

export function VenueTrustFooter({
  meta,
  className,
  ariaLabel = 'Happy hour data sources',
  venueId,
  venueSlug,
  showInfoCorrection = true,
}: VenueTrustFooterProps) {
  if (!shouldShowVenueTrustFooter(meta)) {
    return null
  }

  const unverified = isUnverifiedConfidence(meta.confidence)
  const canShowCorrection = showInfoCorrection && venueId && venueSlug

  return (
    <section className={cn('venue-trust-footer', className)} aria-label={ariaLabel}>
      {meta.freshnessDate && meta.freshnessKind ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="venue-trust-footer__updated text-xs text-muted-foreground">
              {formatTrustFreshnessLabel(meta.freshnessKind, meta.freshnessDate)}
            </p>
            {meta.isCommunityVerified && meta.freshnessKind === 'verified' ? (
              <span className="venue-trust-footer__badge venue-trust-footer__badge--community inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
                Community verified
              </span>
            ) : null}
          </div>
          {canShowCorrection ? (
            <VenueInfoCorrection venueId={venueId} venueSlug={venueSlug} />
          ) : null}
        </div>
      ) : canShowCorrection ? (
        <VenueInfoCorrection venueId={venueId} venueSlug={venueSlug} />
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

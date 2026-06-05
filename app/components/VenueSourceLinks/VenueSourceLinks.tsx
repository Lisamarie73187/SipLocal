import { ExternalLink } from 'lucide-react'

import { formatLinkHostname } from '@/utils/urlDisplay'

export interface VenueSourceLinksProps {
  websiteUrl: string | null
  sourceUrls: string[]
  className?: string
}

export function VenueSourceLinks({
  websiteUrl,
  sourceUrls,
  className,
}: VenueSourceLinksProps) {
  const scrapeSources = sourceUrls.filter((url) => url !== websiteUrl?.trim())

  if (!websiteUrl?.trim() && scrapeSources.length === 0) {
    return (
      <p className={className ?? 'text-xs text-muted-foreground'}>
        No source websites recorded.
      </p>
    )
  }

  return (
    <div className={className ?? 'space-y-1.5'}>
      <p className="text-xs font-medium text-dark">Data sources</p>
      <ul className="space-y-1">
        {websiteUrl?.trim() ? (
          <li>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline"
            >
              <span className="truncate">
                Venue site · {formatLinkHostname(websiteUrl)}
              </span>
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          </li>
        ) : null}
        {scrapeSources.map((url, index) => (
          <li key={`source-${index}-${url}`}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline"
            >
              <span className="truncate">{formatLinkHostname(url)}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

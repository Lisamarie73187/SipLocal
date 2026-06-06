import { Link } from '@tanstack/react-router'

import type { OwnerDashboardVenue } from '@/server/ownerVenues'

export interface OwnerVenueDashboardProps {
  venues: OwnerDashboardVenue[]
}

export function OwnerVenueDashboard({ venues }: OwnerVenueDashboardProps) {
  if (venues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No venues linked to your account yet.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {venues.map((venue) => (
        <li key={venue.id}>
          <Link
            to="/manage/$slug"
            params={{ slug: venue.slug }}
            className="block rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-primary/30"
          >
            <p className="font-medium text-dark">{venue.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{venue.address_line1}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {venue.city_name} · {venue.happy_hour_slot_count} happy hour slot
              {venue.happy_hour_slot_count === 1 ? '' : 's'}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

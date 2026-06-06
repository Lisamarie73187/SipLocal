import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { OwnerLayout } from '@/components/OwnerPortal/OwnerLayout'
import { OwnerVenueDashboard } from '@/components/OwnerPortal/OwnerVenueDashboard'
import { getOwnerDashboard, type OwnerDashboardVenue } from '@/server/ownerVenues'

export const Route = createFileRoute('/manage/')({
  ssr: false,
  component: ManageDashboardPage,
})

function ManageDashboardPage() {
  const [venues, setVenues] = useState<OwnerDashboardVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getOwnerDashboard()
      .then(setVenues)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load venues')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <OwnerLayout
      title="Your venues"
      description="Update happy hours for the listings you manage. Changes are reviewed before going live."
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <OwnerVenueDashboard venues={venues} />
      )}
    </OwnerLayout>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { OwnerHappyHourEditor } from '@/components/OwnerPortal/OwnerHappyHourEditor'
import { OwnerLayout } from '@/components/OwnerPortal/OwnerLayout'
import { getOwnerVenueBySlug } from '@/server/ownerVenues'

export const Route = createFileRoute('/manage/$slug')({
  ssr: false,
  component: ManageVenuePage,
})

function ManageVenuePage() {
  const { slug } = Route.useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof getOwnerVenueBySlug>> | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const fresh = await getOwnerVenueBySlug({ data: { slug, citySlug: 'bend-or' } })
      setData(fresh)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load venue')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <OwnerLayout
      title={data?.venue.name ?? 'Edit happy hours'}
      description="Update your happy hour schedule. We review changes before they appear on the map."
      backTo={{ to: '/manage', label: 'Your venues' }}
      contentClassName="max-w-6xl"
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
      ) : null}
      {data ? (
        <OwnerHappyHourEditor venue={data.venue} initialSlots={data.slots} />
      ) : null}
    </OwnerLayout>
  )
}

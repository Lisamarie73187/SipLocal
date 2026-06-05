import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { AdminLayout } from '@/components/AdminLayout/AdminLayout'
import { AdminVenueEditor } from '@/components/AdminVenueEditor/AdminVenueEditor'
import { getAdminVenueForEdit } from '@/server/adminVenues'
import type { AdminVenueEditorData } from '@/server/adminVenues'

export const Route = createFileRoute('/admin/venues/$venueId')({
  ssr: false,
  component: AdminVenueEditPage,
})

function AdminVenueEditPage() {
  const { venueId } = Route.useParams()
  const [data, setData] = useState<AdminVenueEditorData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadVenue = useCallback(async (): Promise<void> => {
    try {
      const fresh = await getAdminVenueForEdit({ data: { venueId } })
      setData(fresh)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load venue')
    }
  }, [venueId])

  useEffect(() => {
    void loadVenue()
  }, [loadVenue])

  return (
    <AdminLayout
      title={data?.venue?.name ?? 'Edit venue'}
      description="Update venue details, happy hours, and events."
      backTo={{ to: '/admin/venues/', label: 'All venues' }}
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {!data && !error ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : null}
      {data?.venue ? (
        <AdminVenueEditor
          mode="edit"
          initialCities={data.cities}
          initialVenue={data.venue}
          initialSlots={data.slots}
          cityTimezone={data.cityTimezone}
          initialEvents={data.events}
          onEventsReload={loadVenue}
        />
      ) : null}
    </AdminLayout>
  )
}

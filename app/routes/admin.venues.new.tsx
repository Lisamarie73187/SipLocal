import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { AdminLayout } from '@/components/AdminLayout/AdminLayout'
import { AdminVenueEditor } from '@/components/AdminVenueEditor/AdminVenueEditor'
import { getAdminVenueCreateDefaults } from '@/server/adminVenues'
import type { AdminVenueEditorData } from '@/server/adminVenues'

export const Route = createFileRoute('/admin/venues/new')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    city: typeof search.city === 'string' ? search.city : undefined,
  }),
  component: AdminVenueNewPage,
})

function AdminVenueNewPage() {
  const { city } = Route.useSearch()
  const [data, setData] = useState<AdminVenueEditorData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getAdminVenueCreateDefaults({ data: { citySlug: city } })
      .then(setData)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load form')
      })
  }, [city])

  return (
    <AdminLayout
      title="Add venue"
      description="Create a new place manually. Set status to Live and Published when ready for the map."
      backTo={{ to: '/admin/venues', label: 'All venues' }}
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
          mode="create"
          initialCities={data.cities}
          initialVenue={data.venue}
          initialSlots={data.slots}
        />
      ) : null}
    </AdminLayout>
  )
}

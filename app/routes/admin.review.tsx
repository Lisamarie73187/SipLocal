import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout } from '@/components/AdminLayout/AdminLayout'
import { AdminPendingUpdatesPanel } from '@/components/AdminPendingUpdatesPanel/AdminPendingUpdatesPanel'

export const Route = createFileRoute('/admin/review')({
  ssr: false,
  component: AdminReviewPage,
})

function AdminReviewPage() {
  return (
    <AdminLayout
      title="Needs review"
      description="Manager edits, customer menu photos, and missing-venue suggestions waiting for your approval."
    >
      <AdminPendingUpdatesPanel showHeader={false} />
    </AdminLayout>
  )
}

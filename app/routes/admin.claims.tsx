import { createFileRoute } from '@tanstack/react-router'

import { AdminClaimRequestsPanel } from '@/components/AdminClaimRequestsPanel/AdminClaimRequestsPanel'
import { AdminLayout } from '@/components/AdminLayout/AdminLayout'

export const Route = createFileRoute('/admin/claims')({
  ssr: false,
  component: AdminClaimsPage,
})

function AdminClaimsPage() {
  return (
    <AdminLayout
      title="Venue claim requests"
      description="Review self-serve requests from bar and restaurant staff. Approving grants /manage access only."
    >
      <AdminClaimRequestsPanel />
    </AdminLayout>
  )
}

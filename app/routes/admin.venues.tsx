import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/venues')({
  ssr: false,
  component: AdminVenuesLayoutRoute,
})

function AdminVenuesLayoutRoute() {
  return <Outlet />
}

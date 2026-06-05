import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  ssr: false,
  component: AdminLayoutRoute,
})

function AdminLayoutRoute() {
  return <Outlet />
}

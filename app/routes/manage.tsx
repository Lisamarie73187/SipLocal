import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/manage')({
  ssr: false,
  component: ManageLayoutRoute,
})

function ManageLayoutRoute() {
  return <Outlet />
}

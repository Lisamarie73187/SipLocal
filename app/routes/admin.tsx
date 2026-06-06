import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { getCurrentUserAdmin } from '@/server/adminScrape'

export const Route = createFileRoute('/admin')({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const result = await getCurrentUserAdmin()
    if (!result.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      })
    }
    if (!result.isAdmin) {
      throw redirect({ to: '/' })
    }
  },
  component: AdminLayoutRoute,
})

function AdminLayoutRoute() {
  return <Outlet />
}

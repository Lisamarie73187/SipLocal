import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export interface UseAccountLinkResult {
  href: string
  search?: { redirect: string }
  label: string
  loading: boolean
}

/** Resolves account icon destination: login (with redirect) or admin. */
export function useAccountLink(): UseAccountLinkResult {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  const loading = authLoading || (Boolean(user) && adminLoading)

  if (!user) {
    return {
      href: '/login',
      search: { redirect: '/admin' },
      label: 'Sign in',
      loading,
    }
  }

  if (isAdmin) {
    return {
      href: '/admin',
      label: 'Admin',
      loading,
    }
  }

  return {
    href: '/login',
    search: { redirect: '/' },
    label: 'Account',
    loading,
  }
}

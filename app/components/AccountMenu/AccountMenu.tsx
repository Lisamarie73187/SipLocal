import { useNavigate } from '@tanstack/react-router'
import { CircleUser, Heart, Loader2, LogOut, UserRound } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useIsManager } from '@/hooks/useIsManager'
import { cn } from '@/utils'

const triggerClassName =
  'flex size-11 items-center justify-center rounded-xl border border-border/70 bg-card text-dark shadow-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'

export function AccountMenu() {
  const navigate = useNavigate()
  const { user, loading: authLoading, signOut } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const { isManager, loading: managerLoading } = useIsManager()

  const loading = authLoading || (Boolean(user) && (adminLoading || managerLoading))

  const handleSignOut = async (): Promise<void> => {
    await signOut()
    void navigate({ to: '/' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={triggerClassName}
        aria-label={user ? 'Account menu' : 'Sign in'}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <CircleUser className="size-5" strokeWidth={1.75} />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {!user ? (
          <DropdownMenuItem
            className="min-h-11 cursor-pointer"
            onSelect={() => {
              void navigate({ to: '/login', search: { redirect: '/' } })
            }}
          >
            Sign in
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              className="min-h-11 cursor-pointer"
              onSelect={() => {
                void navigate({ to: '/profile' })
              }}
            >
              <UserRound className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 cursor-pointer"
              onSelect={() => {
                void navigate({ to: '/favorites' })
              }}
            >
              <Heart className="size-4" />
              Favorites
            </DropdownMenuItem>
            {isAdmin ? (
              <DropdownMenuItem
                className="min-h-11 cursor-pointer"
                onSelect={() => {
                  void navigate({ to: '/admin' })
                }}
              >
                Admin
              </DropdownMenuItem>
            ) : null}
            {isManager ? (
              <DropdownMenuItem
                className="min-h-11 cursor-pointer"
                onSelect={() => {
                  void navigate({ to: '/manage' })
                }}
              >
                Manage venues
              </DropdownMenuItem>
            ) : null}
            {isAdmin || isManager ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className={cn('min-h-11 cursor-pointer')}
              onSelect={(event) => {
                event.preventDefault()
                void handleSignOut()
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import type { Session, User } from '@supabase/supabase-js'

export interface AuthSessionState {
  session: Session | null
  user: User | null
}

export function getAuthUserId(user: User | null): string | null {
  return user?.id ?? null
}

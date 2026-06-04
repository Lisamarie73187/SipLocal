import type { ReactNode } from 'react'

export interface AppShellProps {
  header: ReactNode
  children: ReactNode
}

export function AppShell({ header, children }: AppShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {header}
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  )
}

import type { ReactNode } from 'react'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router'

import appCss from '../styles/globals.css?url'
import { AppProviders } from '@/components/AppProviders/AppProviders'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'SipSocial — Find your happy hour' },
      {
        name: 'description',
        content:
          'Discover happy hours in Bend, OR. Built for locals and tourists, scaling to any city.',
      },
      { name: 'theme-color', content: '#FF6B57' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', href: '/favicon.png', type: 'image/png' },
      { rel: 'icon', href: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { rel: 'icon', href: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  component: RootLayout,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <RootDocument>
      <AppProviders>
        <Outlet />
      </AppProviders>
    </RootDocument>
  )
}

function RootNotFound() {
  return (
    <RootDocument>
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-heading text-2xl font-semibold text-dark">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This link does not match a page in SipLocal.
        </p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Back to discovery
        </Link>
      </main>
    </RootDocument>
  )
}

function RootError({ error }: ErrorComponentProps) {
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.'

  return (
    <RootDocument>
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-heading text-2xl font-semibold text-dark">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          We hit an unexpected error loading this page. Try again, or head back to discovery.
        </p>
        <p className="max-w-full truncate text-xs text-muted-foreground/70">{message}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <Link to="/" className="text-sm font-medium text-primary hover:underline">
            Back to discovery
          </Link>
        </div>
      </main>
    </RootDocument>
  )
}

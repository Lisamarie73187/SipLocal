# SipSocial — Agent Rules

## Project

* SipSocial: happy hour discovery app.
* Mobile-first. Design for phones first, desktop second.
* Use existing patterns before creating new ones.

## Stack

* TanStack Start + TanStack Router
* React + TypeScript (strict)
* Tailwind v4
* shadcn/ui + Radix
* Supabase

## Core Rules

* No `any`.
* Prefer named exports.
* Use `@/` imports.
* Functional components only.
* One component per file.
* Explicit return types for exported functions.
* Reuse existing code before creating new code.
* Keep files focused and small.

## Components

* Components are presentational.
* Business logic, fetching, and state belong in hooks.
* Define props with interfaces.
* Avoid prop drilling beyond 2 levels.
* Split components that become large or complex.

## Hooks

* All shared logic lives in `/app/hooks`.
* Hooks own:

  * Data fetching
  * Supabase access
  * Shared state
  * Data transformations

Examples:

* `useAuth`
* `useVenues`
* `useFavorites`

## Routing

* One route per file.
* Use route loaders for initial data.
* Do not use `useEffect` for first-page data loading when a loader is appropriate.
* Handle loading and error states.

## Styling

* Mobile-first by default.
* Touch targets ≥ 44px.
* Single-column layouts by default.
* Prefer bottom sheets and bottom navigation on mobile.
* Use design tokens only.
* No hardcoded colors, spacing, or repeated arbitrary values.
* Use `cn()` for conditional classes.

## shadcn/ui

* Never modify `/app/components/ui`.
* Wrap or extend components in `/app/components`.
* Use Radix directly only when shadcn lacks a component.

## Supabase

* Never call Supabase directly from components.
* Use hooks or route loaders.
* Use generated types from `app/types/supabase.ts`.
* RLS required on all tables.
* Handle errors explicitly.
* Never expose service role credentials.

## Auth

* Use `useAuth`.
* Do not call auth APIs directly from components.
* Auth users live in `auth.users`.

## Database

Core tables:

* cities
* venues
* happy_hour_slots
* happy_hour_deals
* favorites
* profiles

Generated types are the source of truth.

## Logging

* No `console.log`.
* Use `@/utils/logger`.
* Never log secrets, tokens, or PII.

## Testing

Write tests for:

* Utilities with business logic
* Hooks with meaningful behavior
* Critical user flows

Skip tests for:

* Simple wrappers
* Pure presentational components
* Third-party UI primitives

Co-locate tests with source files.

## Agent Workflow

Before adding code:

1. Search for an existing solution.
2. Extend shared code when possible.
3. Extract duplicated logic.
4. Keep changes minimal.

Do not:

* Run full project test suites by default.
* Run full type checks by default.
* Start dev servers for verification.
* Perform browser verification.

Instead:

* Run targeted tests for changed code.
* Reason about types from the edited files.
* Let the user visually verify UI changes.

Run broader validation only when requested or when changes affect shared infrastructure.

## Environment

* Secrets live in `.env.local`.
* Never commit secrets.
* Commit only `.env.example`.

## Git

* Do not commit unless asked.
* Never commit secrets.
* Keep changes focused and minimal.

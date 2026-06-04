# SipSocial — Agent Guide

## Project Overview

| | |
|---|---|
| **Project name** | SipSocial |
| **Tagline** | Find your happy hour. |
| **Purpose** | A happy hour discovery app for locals and tourists, launching in Bend, OR, built to scale to any city |
| **Layout** | **Mobile-first** — design and build for phone screens first, then enhance for tablet/desktop |

### Tech stack and versions

| Technology | Version (package.json) |
|---|---|
| TanStack Start | `latest` (`@tanstack/react-start`) |
| TanStack Router | `latest` (`@tanstack/react-router`) |
| React | `^19.2.0` |
| TypeScript | `^6.0.2` (strict mode) |
| Vite | `^8.0.0` |
| Tailwind CSS | `^4.1.18` (`@tailwindcss/vite`) |
| shadcn/ui | CLI `4.x` (New York style, Radix primitives via `radix-ui`) |
| Supabase JS | `^2.107.0` (`@supabase/supabase-js`) |
| Supabase SSR | `^0.10.3` (`@supabase/ssr`) |

Run `npm run dev` from the project root (http://localhost:3002).

---

## Folder Structure

```
/app
  /routes          — TanStack Start file-based routes
  /components      — Reusable UI components, each in its own folder
  /components/ui   — shadcn/ui base components; do not modify directly
  /hooks           — All custom hooks, prefixed with `use`
  /lib             — Third-party client setup (Supabase, auth helpers)
    supabase.ts           — Browser Supabase client
    supabase.server.ts    — Server Supabase clients (anon + service role)
    auth.ts               — Auth helper utilities
  /types           — Shared TypeScript interfaces and types
    supabase.ts    — Generated DB types (`npm run db:types`); source of truth
    database.ts    — Re-exports from `supabase.ts` (compat)
    venue.ts       — Domain types (Venue, HappyHourSlot, Profile, etc.)
  /utils           — Pure utility/helper functions with no side effects
  /styles
    globals.css    — Global CSS and Tailwind v4 design tokens
/supabase
  /migrations      — SQL schema + seeds; apply with `npm run db:push`
/public
claude.md
.env.local         — Secrets (gitignored via `*.local`)
.env.example       — Documented env var template
```

Co-locate component files when adding features:

```
/app/components/VenueCard/
  VenueCard.tsx
  VenueCard.types.ts
  VenueCard.test.tsx
```

---

## Design System

| Token | Hex | Usage |
|---|---|---|
| Sunset Coral | `#FF6B57` | Primary brand, CTAs, Happening Now pins |
| Aperol Orange | `#FF8A3D` | Secondary actions, urgency |
| Golden Peach | `#FFB26B` | Starting Soon pins, highlights |
| Soft Sunset Pink | `#F8B4C8` | Badges, soft accents |
| Blush Background | `#FCE8E3` | Light surfaces |
| Warm Cream | `#FFF8F3` | Page background |
| Dusty Mauve | `#7C5C87` | Later Tonight pins |
| Deep Plum | `#4B3B59` | Dark accents |
| Charcoal Text | `#2E2A35` | Headings, body text |
| Soft Sky Blue | `#A7D8F5` | Selected map pins |
| Evening / Twilight Blue | `#7DB8E8` / `#5F8CCB` | Links, depth |

- **Headings:** Poppins (`font-heading`)
- **Body:** Inter (`font-sans`)

All colors are Tailwind v4 custom tokens in `app/styles/globals.css`. **Always use tokens** (`text-primary`, `bg-background`, etc.) — never raw hex in components.

---

## Mobile-first

SipSocial is used on the go (walking downtown, quick glance at deals). **Default to the narrow viewport**; desktop is progressive enhancement.

### Layout & UX

- Design screens at **~390px width** first; verify at 375px and 428px.
- **Touch targets** ≥ 44×44px; adequate spacing between tappable pins, cards, and filters.
- **Thumb zone:** primary actions (map, filters, favorites) in bottom half or fixed bottom bar — avoid critical actions only in top corners.
- **One primary action per screen** — e.g. list OR map prominence, not competing full-width CTAs.
- **Bottom navigation** for main tabs when the app shell exists (Discover, Map, Favorites, Profile).
- Map + list: prefer **full-bleed map** with **bottom sheet** for venue list/detail on mobile (not side-by-side panels).
- Typography: readable body **16px minimum** on inputs (prevents iOS zoom); concise headings on small screens.
- Test **safe areas** (`env(safe-area-inset-*)`) for notched phones.

### CSS (Tailwind)

- Default styles target mobile; add `sm:`, `md:`, `lg:` only when the layout should change at larger breakpoints.
- Prefer **single column** stacks; multi-column grids from `md:` upward.
- Avoid hover-only affordances — use `:active` / clear tap states; hover is supplemental on desktop.
- Images and cards: full-width on mobile; max-width containers on desktop.

### Performance (mobile networks)

- Loaders for map and venue list; skeleton UI over spinners where possible.
- Defer non-critical map assets; lazy-load below-the-fold venue cards.
- Keep initial JS lean — code-split routes (TanStack Router lazy routes when screens grow).

---

## Data model (Supabase)

| Table | Purpose |
|---|---|
| `cities` | Markets (`bend-or`); map center, timezone |
| `venues` | Bars/restaurants; `lat`/`lng`, `is_published`, `is_featured` |
| `happy_hour_slots` | Weekly windows (`day_of_week` 0=Sun…6=Sat, `start_time`/`end_time`) |
| `happy_hour_deals` | Line-item specials per slot |
| `favorites` | `auth.users` ↔ venues (RLS: own rows only) |
| `profiles` | User display name, avatar, `preferred_city_id` (auto-created on signup) |

**RLS:** Public read for published venues + happy hours; favorites and profiles are **authenticated, own row only**.

**DB commands:** `npm run db:link` → `npm run db:push` → `npm run db:types`

Auth users live in **`auth.users`** — no `public.users` table.

---

## Environment Variables

| Variable | Scope | Description |
|---|---|---|
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server | Anon/public key for server-side session client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role — never expose to client |
| `VITE_SUPABASE_URL` | Client | Same as `SUPABASE_URL` (Vite requires `VITE_` prefix) |
| `VITE_SUPABASE_ANON_KEY` | Client | Same as `SUPABASE_ANON_KEY` |
| `VITE_MAPBOX_TOKEN` | Client | Mapbox public token (map feature, later) |

- Secrets live in `.env.local` — never commit.
- Copy `.env.example` to `.env.local` and fill in values.

---

## React Best Practices

- Functional components only — no class components.
- Components ≤ 200 lines; split if larger.
- Components render only — no business logic in JSX.
- All logic in custom hooks under `/app/hooks`, prefixed with `use` (e.g. `useVenues`, `useAuth`, `useFavorites`).
- Hooks own data fetching, Supabase calls, and shared state.
- Use `React.memo` only with a documented performance reason.
- Prefer **named exports** over default exports.
- Define prop types with a TypeScript `interface` above the component.
- Avoid prop drilling beyond 2 levels — use context or a hook.
- Do not pass inline arrow functions in JSX props when they cause re-renders — extract them.

**Auth:** Use the global `useAuth` hook only — never call `supabase.auth` directly in components.

---

## TypeScript Best Practices

- Strict mode in `tsconfig.json` — no exceptions.
- No `any` — use `unknown` and narrow.
- API and Supabase results must have explicit return types.
- Shared types in `/app/types`.
- `type` for unions, primitives, function signatures.
- `interface` for object shapes and component props.
- Avoid `as` unless necessary — prefer type guards.
- Prefer string literal unions over enums.

Regenerate Supabase types after schema changes:

```bash
npm run db:types   # writes app/types/supabase.ts
```

---

## TanStack Start Best Practices

- File-based routes: one route per file in `/app/routes`.
- Use **loader functions** for server-side initial data — not `useEffect` for first paint.
- Keep route files thin — logic in hooks and utils.
- Use SSR data patterns for SEO-critical pages.
- Handle loading and error states with pending/error boundaries on every route.

Configure app directory in `vite.config.ts`:

```ts
tanstackStart({ srcDirectory: 'app' })
```

---

## Tailwind CSS v4 Best Practices

- Design tokens in `app/styles/globals.css` via CSS custom properties and `@theme`.
- No raw hex or hardcoded colors in component classes.
- Utility classes in JSX only — no per-component CSS files.
- Avoid arbitrary values used repeatedly — add a token instead.
- Use `cn()` from `@/utils` for conditional classes (`clsx` + `tailwind-merge`).

---

## shadcn/ui + Radix UI Best Practices

- **Do not edit** `/app/components/ui` — wrap/extend in `/app/components`.
- Import from `@/components/ui/*`.
- Use Radix primitives directly only when shadcn lacks a component.
- Forms: shadcn `Form` + React Hook Form + Zod.
- Overlays: Radix `Dialog`, `Tooltip`, `DropdownMenu` — no custom overlay primitives.

Add components:

```bash
npx shadcn@latest add <component>
```

---

## Supabase Best Practices

- Never call Supabase from components — use hooks or route loaders.
- Server: service role or anon via `app/lib/supabase.server.ts`.
- Client: anon via `getSupabaseBrowserClient()` in `app/lib/supabase.ts`.
- Typed queries from `app/types/supabase.ts` (import `Database` from `@/types/supabase` or `@/types/database`).
- Enable RLS on all tables — never rely on client-side filtering for security.
- Handle errors explicitly — never swallow them.

---

## Code Style Rules

| Item | Rule |
|---|---|
| Components | PascalCase filenames |
| Hooks, utils, lib | camelCase filenames |
| Exports | One component per file |
| Comments | No commented-out code in commits |
| Logging | No `console.log` in production — use `@/utils/logger` |
| Functions | Explicit return types; small and single-purpose |
| Imports | External → `@/` aliases → relative |

---

## Testing

Vitest + Testing Library are installed (`npm run test`). **Do not aim for 100% coverage** — test what protects real behavior.

### Write tests for

- **Pure utils** — happy-hour time logic, `day_of_week` helpers, “open now” / “ending soon”, slug formatting, `cn()` callers with branching.
- **Hooks** (with mocked Supabase) — `useAuth`, `useVenues`, `useFavorites` when they contain non-trivial fetch/transform/error handling.
- **Critical UI** — VenueCard happy-hour display, filter chips, auth-gated favorites button (behavior users rely on).

### Skip or defer

- shadcn/ui primitives and thin wrappers with no logic.
- Snapshot-only tests that don’t assert behavior.
- Mapbox/Supabase integration in unit tests — use manual QA or E2E later (Playwright) if needed.

### Conventions

- Co-locate: `VenueCard.test.tsx` next to `VenueCard.tsx`.
- Prefer **user-visible outcomes** (`getByRole`, `getByText`) over implementation details.
- No tests required for every PR early on — add when fixing a bug (regression test) or shipping core discovery flows.

---

## Future Features (do not build yet)

- Interactive map with color-coded venue pins (Mapbox)
- Search and filter by deal type, day, time, open now, price, distance
- Venue detail pages with full happy hour schedules
- User auth and favorites tab
- Plan My Night flow for tourists
- Sponsored/featured venues with admin panel

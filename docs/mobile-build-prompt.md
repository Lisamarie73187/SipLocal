# SipLocal Mobile — React Native Discovery App (Build Prompt)

> **Want an AI agent to build the whole app?** Use [`mobile-agent-prompt.md`](./mobile-agent-prompt.md) — copy the prompt block into a new Cursor Agent chat. Full spec stays in this file.

Use this document as the master spec for building the **SipLocal** consumer discovery app in React Native. Copy the entire file (or sections) into an AI coding agent or contractor brief.

**Product:** SipLocal — “Find your happy hour.”  
**Launch city:** Bend, OR only (`bend-or`).  
**Platforms:** iOS + Android.  
**Backend:** Same Supabase project as the web app (direct client, anon key, RLS). No custom API layer.

---

## Folder layout in `~/Code`

Keep **two sibling repos** — do not nest mobile inside the web project:

```
~/Code/
  SipLocal/           ← this repo (web: TanStack Start + Supabase + admin)
  siplocal-mobile/    ← new React Native app (discovery only, bare workflow — no Expo)
```

| Repo | Purpose |
|---|---|
| `SipLocal` | Web app, schema migrations, admin, owner portal — source of truth for DB types |
| `siplocal-mobile` | React Native discovery app — syncs types/utils from `SipLocal` |

**Quick start (React Native CLI — no Expo):**

```bash
cd ~/Code
npx @react-native-community/cli@latest init SipLocalMobile --directory siplocal-mobile --pm npm
cd siplocal-mobile
cp ../SipLocal/docs/mobile-build-prompt.md BUILD.md
```

Requires **Xcode** (iOS) and **Android Studio** (Android) installed locally.

Mobile `package.json` script (after adding `scripts/sync-db-types.sh`):

```json
"db:types": "WEB_ROOT=../SipLocal MOBILE_ROOT=. bash scripts/sync-db-types.sh"
```

Copy env values from `SipLocal/.env.local` → `siplocal-mobile/.env` (see env section below).

**App identifiers:** display name **SipLocal**, URL scheme `siplocal://`, iOS bundle ID `com.siplocal.app`, Android applicationId `com.siplocal.app`.

---

## Layout priority (read first)

> **Timeline-first discovery.** The happy-hour timeline is the hero — not the map.  
> Default view is the scrollable timeline (Happening Now → Starting Soon → time sections).  
> Map is secondary. On map view, a **left-sliding drawer** contains the same timeline.  
> Venue detail opens as a bottom sheet or pushed screen.

---

## Out of scope

Do **not** build:

- Admin portal (`/admin/*`)
- Owner/manager portal (`/manage/*`)
- Venue scraping, AI paste, discover pipeline
- Server-side API beyond Supabase client + RLS
- Service role key in the mobile app

---

## Reference implementation (web)

Mirror the existing **web discovery experience** in this repo (TanStack Start). Do not invent new UX — port behavior and visual design from:

| Area | Path |
|---|---|
| Main discovery shell | `app/components/DiscoveryView/DiscoveryView.tsx` |
| Header, filters, search | `app/components/DiscoveryHeader/*` |
| Timeline list | `app/components/TimelinePanel/*`, `app/components/VenueTimelineCard/VenueTimelineCard.tsx` |
| Map pins, clustering | `app/components/VenueMap/*` |
| Venue sheet / panel | `app/components/VenueMapPlacePanel/VenueMapPlacePanel.tsx` |
| Full venue page | `app/routes/venues.$slug.tsx` |
| Data hooks | `app/hooks/useVenues.ts`, `useEvents.ts`, `useHappyHourTimeline.ts`, `useEventTimeline.ts`, `useDiscoveryFilters.ts`, `useMap.ts` |
| Pure utils | `app/utils/happyHour/`, `dealChips/`, `discoveryFilters/`, `geo/`, `venueDisplay/`, `venueOverlayStatus/`, `happyHourSchedule/`, `eventTime/`, `venueType/`, `venueLinks/` |

There is **no Figma** — mirror the web app.

---

## Primary UX: Timeline-first + left drawer

The timeline answers: *“What’s on right now / starting soon / later?”*

### Default screen (Explore tab)

On launch, show the **timeline immediately** — not the map.

```
┌─────────────────────────────┐
│  Bend, OR    [filters] [≡]  │  ← city, filter chips, drawer toggle (on map)
├─────────────────────────────┤
│  NOW · 5:42 PM              │
│  ┌─────────────────────────┐│
│  │ VenueTimelineCard       ││
│  HAPPENING NOW              │
│  ┌─────────────────────────┐│
│  │ VenueTimelineCard       ││
│  STARTING SOON              │
│  ...                        │
│  (scrollable timeline)      │
└─────────────────────────────┘
```

- Port web sections exactly: **NOW · {time}**, **HAPPENING NOW**, **STARTING SOON**, **LATER TONIGHT**, time buckets
- Same card content as `VenueTimelineCard`: name, price level, subtitle, HH window, address, status badge
- Filters in header (same as web `DiscoveryHeader`)
- Search in header or top of timeline
- Happy hours vs **Events** toggle (full parity with web)

### Left drawer (map mode)

When user switches to **map mode**, the map is full-bleed. The timeline lives in a **left drawer**.

| State | What user sees |
|---|---|
| **Timeline-first (default)** | Full-width timeline list (home screen) |
| **Map mode** | Full-bleed map; drawer closed |
| **Drawer open on map** | Map dimmed; **~85–90% width panel from left** with full timeline |
| **Tap `[≡]` or swipe from left edge** | Opens/closes drawer |
| **Tap venue card** | Venue detail (bottom sheet or `/venue/[slug]`) + map pin sync |

Drawer requirements:

- Swipe-from-left-edge to open
- Backdrop tap / swipe-left to close
- Safe area insets (`react-native-safe-area-context`)
- Smooth 60fps animation (`react-native-reanimated` + `@react-navigation/drawer` or custom panel)
- **Same timeline component** in default view and drawer — one source of truth

### Map role (secondary)

- Map is **not** the home screen
- Enter map via header **“Map”** toggle or “View on map” affordance on timeline
- Pins use web status colors; tap pin → highlight timeline card + open venue detail
- Optional: user location for distance labels (port `formatDistanceMiles` from `app/utils/geo/`)

### Venue detail

- Bottom sheet or pushed screen matching `VenueMapPlacePanel`:
  - Photo, name, price level, subtitle, HH window, address
  - **Specials** → deal row **chips** (price first, e.g. `$5 draft pints`)
  - **Happy hour schedule** → **deal summary** plain text only (not chips)
  - Get directions, full schedule, website link
- Deep link: `/venue/[slug]`

**Do not** use a bottom sheet as the primary list. Bottom sheet is for **venue detail only**.

### Bottom tabs

| Tab | Content |
|---|---|
| **Explore** | Timeline-first home + left drawer on map + optional map mode |
| **Favorites** | Auth-gated saved venues |
| **Profile** | Sign in (Apple / Google), sign out |

---

## v1 features (all required)

### Discovery (no login)

- [ ] Load published venues for `bend-or` with **live** happy hour slots + deals (same query as `useVenues`)
- [ ] Load events for Bend (same as `useEvents`)
- [ ] Toggle **Happy hours** vs **Events**
- [ ] Timeline sections via `useHappyHourTimeline` / `useEventTimeline`
- [ ] Full filters: search, view day, time slider, status, deal type, venue type, price level
- [ ] Map with clustered pins (`getVenueMapPinStatus` logic)
- [ ] List ↔ map sync: card ↔ pin selection
- [ ] Get directions — Apple Maps (iOS), Google Maps (Android) or system default
- [ ] Pull-to-refresh on timeline
- [ ] Loading skeletons, error + retry
- [ ] Timezone: `America/Los_Angeles` for Bend (from `cities.timezone`)

### Auth (favorites only)

- [ ] Browse without login
- [ ] **Favorites require login** — heart on venue sheet/detail
- [ ] Sign in: **Apple** + **Google** (Supabase Auth); magic link optional
- [ ] `favorites` table, RLS own rows only
- [ ] Global `useAuth` hook — components never call `supabase.auth` directly

### Delivery phases

1. **Timeline home + filters + Supabase data** (no auth)
2. **Map mode + left drawer + pin sync**
3. **Venue detail + directions**
4. **Apple/Google auth + favorites**
5. **Events tab parity + polish**

Do not skip timezone / happy-hour unit tests when porting utils.

---

## Tech stack

**No Expo.** Use the **React Native CLI bare workflow** (`ios/` + `android/` native projects).

| Layer | Choice |
|---|---|
| Framework | **React Native** (latest stable) via `@react-native-community/cli` |
| Navigation | **React Navigation v7** — native stack, bottom tabs, drawer (timeline-on-map) |
| Language | **TypeScript strict** |
| Backend | **@supabase/supabase-js** + `@react-native-async-storage/async-storage` (session persistence) |
| Env vars | **react-native-config** (`.env` — not `EXPO_PUBLIC_*`) |
| Maps | **Mapbox** — `@rnmapbox/maps` (native install in `ios/` + `android/`) |
| Drawer / sheet | `@react-navigation/drawer`, `@gorhom/bottom-sheet` |
| Gestures | `react-native-gesture-handler`, `react-native-reanimated` |
| Safe area | `react-native-safe-area-context` |
| Fonts | Link **Poppins** + **Inter** in Xcode / `android/app/src/main/assets/fonts/` (or `react-native-asset`) |
| Styling | **NativeWind v4** (tokens from web `app/styles/globals.css`) or StyleSheet + shared `theme/tokens.ts` |
| Deep links | `react-native` Linking + Supabase OAuth callback on `siplocal://` |
| Tests | Vitest for ported pure utils |
| Build / release | **Xcode** + **Android Studio** / Gradle (TestFlight, Play Console) — no EAS |

### Maps: why Mapbox on both platforms

Use **Mapbox** on iOS and Android — same as web, one token, matching pin colors. Follow `@rnmapbox/maps` install docs for bare RN (Podfile, `android/build.gradle`, Mapbox downloads token).

Configure Mapbox token URL restrictions for iOS bundle ID and Android package name.

### Native modules you will link manually

After `npm install`, run **`cd ios && pod install`** for iOS. Expect native setup for:

- `@rnmapbox/maps`
- `react-native-reanimated` (babel plugin)
- `@react-native-google-signin/google-signin` (Google auth)
- `@invertase/react-native-apple-authentication` (Apple auth, iOS)
- `react-native-config` (env per build flavor)

---

## Design system

From `app/styles/globals.css`:

| Token | Hex | Usage |
|---|---|---|
| Primary (Sunset Coral) | `#FF6B57` | Brand, CTAs, Happening Now pins |
| Secondary (Aperol Orange) | `#FF8A3D` | Urgency |
| Golden Peach | `#FFB26B` | Starting Soon pins |
| Dusty Mauve | `#7C5C87` | Later Tonight pins |
| Soft Sky Blue | `#A7D8F5` | Selected pin |
| Background (Warm Cream) | `#FFF8F3` | App background |
| Dark (Charcoal) | `#2E2A35` | Text |
| Open green | `#22C55E` | “Open now” badge only — never brand |

- Headings: **Poppins** · Body: **Inter**
- Touch targets ≥ 44pt
- Pin colors **must** match web `.venue-pin` styles

---

## Data & environment

### Env vars (`react-native-config`)

Create `.env` in mobile repo root (gitignore it; commit `.env.example`):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
MAPBOX_TOKEN=your-mapbox-public-token
```

Access in JS via `react-native-config`:

```typescript
import Config from 'react-native-config'

const supabaseUrl = Config.SUPABASE_URL
```

Never ship `SUPABASE_SERVICE_ROLE_KEY`. Add matching keys to Xcode/Android build configs for release if needed.

### Types sync script

Standalone mobile repo, types synced from this web project.

Create `scripts/sync-db-types.sh` in the mobile repo:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Path to this web repo (SipLocal). Override if layout differs.
WEB_ROOT="${WEB_ROOT:-../SipLocal}"

if [ ! -d "$WEB_ROOT/app/types" ]; then
  echo "Web repo not found at $WEB_ROOT. Set WEB_ROOT or run from monorepo."
  exit 1
fi

cd "$WEB_ROOT"

if command -v npm >/dev/null 2>&1 && [ -f package.json ]; then
  npm run db:types
else
  supabase gen types typescript --linked > app/types/supabase.ts
fi

MOBILE_ROOT="${MOBILE_ROOT:-..}"
mkdir -p "$MOBILE_ROOT/src/types"

cp app/types/supabase.ts "$MOBILE_ROOT/src/types/supabase.ts"
cp app/types/venue.ts "$MOBILE_ROOT/src/types/venue.ts"

echo "Synced supabase.ts and venue.ts -> $MOBILE_ROOT/src/types/"
```

Mobile `package.json`:

```json
{
  "scripts": {
    "db:types": "bash scripts/sync-db-types.sh"
  }
}
```

Run after every schema change on web (`npm run db:push` → `npm run db:types` in mobile).

### Utils to port (pure TS, no DOM)

Copy and adapt — remove browser-only APIs:

- `app/utils/happyHour/**`
- `app/utils/dealChips/**`
- `app/utils/discoveryFilters/**`
- `app/utils/eventDiscoveryFilters/**`
- `app/utils/eventTime/**`
- `app/utils/geo/**`
- `app/utils/happyHourSchedule/**`
- `app/utils/venueDisplay/**`
- `app/utils/venueOverlayStatus/**`
- `app/utils/venueType/**`
- `app/utils/venueLinks/**`
- `app/utils/venueTrust/**` (optional, detail footer)

Port existing Vitest tests for happy-hour time logic.

---

## Suggested project structure

```
siplocal-mobile/
  android/                  # Gradle project
  ios/                      # Xcode project (Podfile, Info.plist URL scheme)
  App.tsx                   # Root: NavigationContainer, auth provider
  index.js
  src/
    navigation/
      RootNavigator.tsx     # Stack + tabs
      ExploreNavigator.tsx  # Timeline / map + drawer
    screens/
      ExploreScreen.tsx     # Timeline-first home
      MapScreen.tsx         # Full-bleed map + drawer trigger
      FavoritesScreen.tsx
      ProfileScreen.tsx
      VenueDetailScreen.tsx
      LoginScreen.tsx
    components/
      TimelinePanel/
      VenueTimelineCard/
      DiscoveryHeader/
      VenueMap/
      VenueDetailSheet/
    hooks/
    lib/
      supabase.ts
      linking.ts            # siplocal:// deep links
    types/
    theme/tokens.ts
    utils/
  scripts/sync-db-types.sh
  .env.example
  babel.config.js           # reanimated plugin last
  metro.config.js
  react-native.config.js    # font assets (optional)
```

---

## Auth setup checklist

- [ ] Supabase: enable Apple + Google providers
- [ ] Redirect scheme: `siplocal://auth/callback` — register in **iOS Info.plist** (`CFBundleURLTypes`) and **Android intent filter** (`AndroidManifest.xml`)
- [ ] Add same redirect URL in Supabase Auth → URL configuration
- [ ] **Apple:** `@invertase/react-native-apple-authentication` + Apple Developer Services ID / key in Supabase
- [ ] **Google:** `@react-native-google-signin/google-signin` with iOS URL scheme + Android web client ID from Google Cloud Console
- [ ] Handle OAuth return via `Linking.addEventListener('url', …)` and `supabase.auth.exchangeCodeForSession` (or equivalent PKCE flow)
- [ ] `useAuth`, `useFavorites` hooks

---

## Acceptance criteria

1. App **opens to timeline**, not map
2. Timeline sections and cards match web (`useHappyHourTimeline`)
3. Map mode: full-bleed map + **left drawer** with same timeline
4. Drawer opens via button and swipe-from-left; closes via backdrop / swipe
5. Filters update timeline and map pins together
6. Pin colors: Happening Now / Starting Soon / Later Tonight / Selected match web
7. Venue sheet: Specials = chips; schedule = **deal summary text** (not chips)
8. Directions opens native maps
9. Favorites require login; persist via Supabase `favorites`
10. iOS + Android release builds via **Xcode / Gradle** (no Expo, no EAS)
11. `npm run db:types` syncs types from web Supabase project
12. No admin/manage code or service-role key

---

## Store delivery (when ready)

You do not need TestFlight/Play Store on day one:

1. **Debug builds** on device (`npx react-native run-ios` / `run-android`)
2. **Internal testing** (TestFlight / Play internal track)
3. **Public store** when polished

---

## Pre-build checklist for implementer

- [ ] React Native CLI project with `ios/` + `android/` checked in
- [ ] `pod install` succeeds; Mapbox native SDK configured (`RNMapboxMapsDownloadToken` in `~/.netrc` or env)
- [ ] Mapbox public token + URL restrictions (iOS bundle + Android package)
- [ ] `react-native-config` wired for `.env` in debug and release
- [ ] Supabase OAuth redirect URLs for `siplocal://` scheme
- [ ] Apple Developer + Google Cloud OAuth client IDs in Supabase
- [ ] Access to this repo for reference and type sync

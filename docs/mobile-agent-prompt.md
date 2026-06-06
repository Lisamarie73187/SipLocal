# SipLocal Mobile — Autonomous Agent Prompt

**Copy everything below the line into a new Cursor Agent chat** (with `siplocal-mobile` open as the workspace, or both repos in one window).

---

```
Build the complete SipLocal React Native discovery app. Execute autonomously through all phases below. Do not ask me "what next?" unless you are blocked by missing secrets I must provide manually (Apple Developer keys, Google OAuth client IDs, Mapbox download token).

## Repos (absolute paths)

- **Mobile (primary — edit here):** `/Users/lisaherzberg/Code/siplocal-mobile`
- **Web reference (read + copy utils/types):** `/Users/lisaherzberg/Code/SipLocal`

## Current state

- Bare React Native CLI project already exists and runs on simulator (RN ~0.85, no Expo).
- CocoaPods installed; iOS builds work.
- Do NOT re-run `react-native init`. Build on top of what exists.

## Your mission

Implement the **full v1 discovery app** per the spec in:
`/Users/lisaherzberg/Code/SipLocal/docs/mobile-build-prompt.md`

Read that file first, then execute **all 5 delivery phases** and satisfy **every acceptance criterion** before stopping.

## Autonomous execution rules

1. **Work end-to-end.** Scaffold → deps → utils → hooks → UI → navigation → map → auth → polish. Keep going until acceptance criteria pass or you hit a true blocker.
2. **Mirror the web app.** Port behavior from `SipLocal/app/` — do not invent new UX. No Figma.
3. **No Expo.** Bare RN only (`ios/` + `android/`). React Navigation, not Expo Router.
4. **No admin/manage.** Discovery + favorites only. Never use service role key.
5. **Copy env from web.** Read `/Users/lisaherzberg/Code/SipLocal/.env.local` and create `siplocal-mobile/.env` + `.env.example` (placeholders only in example). Wire `react-native-config`.
6. **Sync types.** Create `scripts/sync-db-types.sh` per spec, run `npm run db:types`, commit synced types under `src/types/`.
7. **Port pure utils** from `SipLocal/app/utils/` (happyHour, dealChips, discoveryFilters, geo, happyHourSchedule, venueDisplay, venueOverlayStatus, venueType, venueLinks, eventTime, eventDiscoveryFilters). Remove DOM-only APIs. Port Vitest tests for happy-hour logic.
8. **Run commands yourself:** `npm install`, `cd ios && pod install`, `npm test`, `npm run lint`. Fix errors you introduce.
9. **Bundle IDs:** iOS + Android → `com.siplocal.app`, display name **SipLocal**, URL scheme `siplocal://`.
10. **Timeline-first UX is non-negotiable.** App opens to timeline, not map. Map mode uses left drawer with same timeline component.

## Build order (do not skip)

### Phase 1 — Timeline + data (no auth)
- `src/` folder structure per spec
- Supabase client (`@supabase/supabase-js`, AsyncStorage, url polyfill)
- Port `useVenues`, `useHappyHourTimeline`, `useDiscoveryFilters` from web hooks
- `ExploreScreen` with timeline sections: NOW · time, HAPPENING NOW, STARTING SOON, LATER TONIGHT
- `VenueTimelineCard`, `DiscoveryHeader` (filters + search)
- Pull-to-refresh, loading skeletons, error + retry
- Timezone: `America/Los_Angeles` for Bend

### Phase 2 — Map + drawer
- Install `@rnmapbox/maps`, configure native iOS/Android
- React Navigation: bottom tabs (Explore | Favorites | Profile) + drawer on map
- Full-bleed map; left drawer ~85–90% with same timeline; swipe + button toggle
- Pin colors match web (`getVenueMapPinStatus`); list ↔ map selection sync

### Phase 3 — Venue detail
- Bottom sheet or pushed screen mirroring `VenueMapPlacePanel`
- Specials = deal chips (price first); schedule = deal summary text only
- Get directions (Apple Maps iOS, Google Maps Android)

### Phase 4 — Auth + favorites
- `useAuth`, `useFavorites`; Apple + Google via Supabase
- Deep link `siplocal://auth/callback` in Info.plist + AndroidManifest
- Favorites tab auth-gated; heart on venue detail

### Phase 5 — Events + polish
- `useEvents`, `useEventTimeline`, happy hours vs events toggle
- Full filter parity with web
- Theme tokens from `SipLocal/app/styles/globals.css` (Poppins + Inter fonts)

## Tech stack (required)

- React Navigation v7 (native stack, bottom tabs, drawer)
- `@rnmapbox/maps`, `@gorhom/bottom-sheet`
- `react-native-gesture-handler`, `react-native-reanimated`
- `react-native-config`, `react-native-safe-area-context`
- `@invertase/react-native-apple-authentication`, `@react-native-google-signin/google-signin`
- NativeWind v4 OR StyleSheet + `src/theme/tokens.ts`

## Done when (verify each)

- [ ] App opens to timeline, not map
- [ ] Timeline sections/cards match web behavior
- [ ] Map mode + left drawer works
- [ ] Filters update timeline and pins together
- [ ] Pin colors match web
- [ ] Venue detail: chips in Specials, plain text in schedule
- [ ] Directions opens native maps
- [ ] Favorites require login and persist
- [ ] Events toggle works
- [ ] `npm run db:types` syncs from web
- [ ] No admin code, no service role key
- [ ] App builds on iOS (Android if env allows)

## If blocked

Only stop and ask me for:
- Mapbox **downloads** token (native SDK install)
- Apple/Google OAuth credentials not in `.env.local`
- Simulator/device build failures requiring my local Xcode/Android setup

Otherwise keep building and fixing until done.

Start now: read `mobile-build-prompt.md`, inspect both repos, then implement Phase 1 immediately.
```

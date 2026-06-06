---
name: bug-catcher
description: >-
  Finds logic bugs, error-handling gaps, React/routing issues, and untested
  code paths in SipSocial. Runs static scan + tests + manual review checklist.
  Use when the user asks for bug hunting, regression risk review, QA audit,
  or "bug catcher" analysis.
---

# SipSocial Bug Catcher

## Quick start

Copy this checklist and track progress as you go:

```
Bug Catcher Progress:
- [ ] Step 1: Run static scan (npm run bug:catch)
- [ ] Step 2: Run tests (npm test) — failures are confirmed bugs unless flaky
- [ ] Step 3: Triage critical + high findings (read cited files, confirm/dismiss)
- [ ] Step 4: Work the manual checklist (7 areas below)
- [ ] Step 5: Review SipSocial hot spots
- [ ] Step 6: Deliver report using the template
```

**Step 1 — Static scan:**

```bash
npm run bug:catch              # human-readable
npm run bug:catch -- --json    # machine-readable
```

**Step 2 — Tests:**

```bash
npm test
```

A failing test is a **confirmed high** (or higher) unless it is flaky — capture the failure output in the report.

**Step 3 — Triage:** Open each critical/high finding at the cited line. Decide `confirmed`, `false positive`, or `fixed`. Check the false-positive list before reporting.

**Step 4–5 — Manual review:** The scanner catches patterns; the checklist and hot spots catch logic and timezone/business bugs it cannot see. Mark each item pass/fail with a file reference.

**Step 6 — Report:** Use the template at the end.

---

## Severity definitions

| Severity | Meaning | Examples |
|----------|---------|----------|
| **Critical** | Broken core flow, data corruption, crash on happy path | Wrong timezone for "open now", save deletes data |
| **High** | Frequent user-visible failure, race condition, swallowed errors | Unhandled Supabase error, useEffect async race |
| **Medium** | Edge case, missing validation, poor error UX | Invalid date input, route without error boundary |
| **Low** | Minor UX, code smell, unlikely path | key={index} on static skeleton |
| **Info** | Review reminder, missing tests | Untested util module |

---

## Static scan (automated)

`scripts/bug-catcher.mjs` checks:

- `console.log` (project uses `@/utils/logger`)
- Type escapes (`any`, `@ts-ignore`)
- Empty catch blocks, unhandled Supabase `error`
- React: async `useEffect`, missing cleanup, unstable list keys
- Routing: missing `errorComponent` / `pendingComponent`
- Domain: `getDay()` / `new Date(str)` timezone pitfalls
- Untested pure utils in `app/utils/`
- Server modules without auth error mapping

**False positives:** skeleton `key={index}`, intentional `void` for fire-and-forget navigation, generated `routeTree.gen.ts`.

---

## Manual review checklist

### 1. Happy hour & time logic (highest business risk)

- [ ] `day_of_week` 0=Sun … 6=Sat consistent across DB, utils, UI
- [ ] Venue city timezone used for "happening now" / "starting soon" (not browser default only)
- [ ] Slots crossing midnight handled correctly
- [ ] `start_time < end_time` constraint matches real venues with late-night HH

**Key files:** `app/utils/happyHour/`, `app/utils/happyHourSchedule/`, `app/utils/eventTime/`

### 2. Data fetching & hooks

- [ ] Hooks handle loading, error, and empty states
- [ ] `useEffect` fetches abort on unmount (AbortController or stale flag)
- [ ] No duplicate fetches on strict mode double-mount without guard
- [ ] Favorites/auth gated actions show clear feedback when logged out

**Key files:** `app/hooks/useVenues.ts`, `useFavorites.ts`, `useAuth.ts`, `useEvents.ts`

### 3. Server functions

- [ ] Zod schemas reject empty/oversized payloads (paste text, photos)
- [ ] Auth errors return user-safe messages, not stack traces
- [ ] Partial writes rolled back or idempotent (venue save, happy hour slots)
- [ ] Service-role writes preceded by auth check in same handler

**Key files:** `app/server/adminVenues.ts`, `ownerVenues.ts`, `menuPhotoSubmissions.ts`

### 4. Forms & user input

- [ ] Required fields validated client and server
- [ ] File upload limits enforced (`app/utils/menuPhotoFile/`)
- [ ] Optimistic UI reverts on failure

### 5. Routing & SSR

- [ ] Routes with loaders have error boundaries
- [ ] Redirect loops absent (login ↔ protected route)
- [ ] Search params validated where used for filters

### 6. Map & mobile

- [ ] Map markers cleanup on unmount
- [ ] Touch targets ≥ 44px on primary actions
- [ ] Safe area insets on fixed bottom UI

### 7. Regression tests

- [ ] `npm test` passes
- [ ] Critical utils have co-located tests (see static scan info findings)
- [ ] Add regression test when fixing a confirmed bug

---

## SipSocial hot spots

Prioritize manual review here:

1. **Happy hour editor** — slot CRUD, paste, AI parse merge (`HappyHourSlotsEditor`, `ownerDealRows`)
2. **Discovery filters** — day/time/filter combo edge cases (`DiscoveryView`, `discoveryFilters`)
3. **Menu photo pipeline** — upload → parse → approve flow (`menuPhotoSubmissions`)
4. **Admin bulk actions** — archive/unpublish wrong selection (`AdminVenuesList`)
5. **Owner claim flow** — duplicate claims, race on approval

---

## Workflow with tests

```bash
npm run bug:catch          # static patterns
npm test                   # unit regressions
npm run dev                # manual smoke (optional)
```

When a test fails, treat as **confirmed high** unless flaky. Include failure output in report.

---

## Report template

Only count confirmed findings; list dismissed scanner hits separately.

```markdown
# Bug Catcher Report — SipSocial

**Date:** YYYY-MM-DD
**Scope:** [full codebase / PR / module]
**Method:** Static scan + tests + manual review
**Tests:** [N passed / M failed]

## Executive summary

[Overall quality, top risks, test status in 2–3 sentences.]

## Findings summary

| Severity | Count | Notes |
|----------|-------|-------|
| Critical | N     | Broken core flow / data loss |
| High     | N     | Frequent failure / race / swallowed error |
| Medium   | N     | Edge case / missing validation |
| Low      | N     | Minor UX / smell |
| Info     | N     | Missing tests / reminders |

## Findings

### [SEVERITY] Short title

- **Category:** react | errors | domain | routing | async | ...
- **Location:** `path/file.ts:line`
- **What breaks:** Symptom the user/dev sees
- **When:** Trigger conditions or repro steps
- **Recommendation:** Fix, and the regression test to add
- **Status:** confirmed | fixed

(repeat per finding, highest severity first)

## Passed checks

- [Verified correct behaviors, e.g. "All hooks handle loading/error/empty states"]

## False positives reviewed

- `rule-id` at `file:line` — why it is safe

## Recommended next steps

1. [Ordered by severity; pair each confirmed bug with a regression test]
```

---

## Pair with security audit

Run both before releases:

```bash
npm run security:audit
npm run bug:catch
npm test
```

Security skill: `.cursor/skills/security-audit/`

---

## Reference

Domain-specific bug patterns: [reference.md](reference.md)

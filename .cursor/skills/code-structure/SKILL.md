---
name: code-structure
description: >-
  Reviews SipSocial code structure and architecture against project conventions
  (file size, named exports, layering, prop drilling, import order, duplication)
  and suggests concrete refactors. Runs the code-structure scanner then proposes
  prioritized fixes. Use when the user asks for a code structure review,
  architecture review, refactor suggestions, tech-debt audit, or "bad code"
  cleanup.
---

# SipSocial Code Structure Review

## Quick start

Copy this checklist and track progress as you go:

```
Code Structure Progress:
- [ ] Step 1: Run scanner (npm run structure:check)
- [ ] Step 2: Group findings by category and file
- [ ] Step 3: For each high/medium, open the file and design a concrete refactor
- [ ] Step 4: Check items the scanner cannot see (manual checklist)
- [ ] Step 5: Deliver report with prioritized, actionable refactors
```

**Step 1 — Run the scanner:**

```bash
npm run structure:check              # human-readable
npm run structure:check -- --json    # machine-readable
```

**Step 2–3 — Design refactors:** The scanner flags *where* structure deviates from `CLAUDE.md`. Your job is to propose the *specific* fix: which functions to extract, which hook to create, how to split a large component. Read the file before recommending.

**Step 4 — Manual review:** Architecture smells the scanner cannot detect (see checklist).

**Step 5 — Report:** Use the template at the end. Order by impact-to-effort.

---

## Severity definitions

| Severity | Meaning | Action |
|----------|---------|--------|
| **High** | Hard to maintain/test now; large files, layering breaks | Refactor soon |
| **Medium** | Growing debt; oversized files, prop drilling | Plan refactor |
| **Low** | Convention drift; naming, import order | Fix opportunistically |
| **Info** | Note / reminder | Optional |

---

## What the scanner checks

`scripts/code-structure.mjs` enforces `CLAUDE.md` conventions:

| Rule | Convention |
|------|------------|
| `file-too-large` | Components ≤ 200, hooks ≤ 200, utils ≤ 300, lib ≤ 400, server ≤ 500 lines |
| `default-export` | Prefer named exports |
| `supabase-auth-in-component` | Components use `useAuth` only, never `supabase.auth` |
| `data-access-in-component` | Supabase queries belong in hooks / route loaders |
| `fetch-in-component` | No raw `fetch` in components |
| `too-many-props` | >8 prop fields suggests prop drilling |
| `component-not-pascalcase` / `hook-not-use-prefixed` / `util-not-camelcase` | Naming conventions |
| `import-order` | external → `@/` aliases → relative |
| `duplicate-block` | Same ~10-line block across multiple files |

**False positives:** `app/components/ui/*` (shadcn — exempt), co-located helpers in component folders (camelCase `.ts`/`.tsx` that aren't components), generated `routeTree.gen.ts`. Always read the file before recommending a change.

---

## How to recommend refactors

Match the fix to the smell. Be specific — name the extracted unit.

### Oversized component (`file-too-large`, component)

1. Identify cohesive sections (a form, a list, a dialog, a row).
2. Extract each into its own co-located component: `Parent/ChildSection.tsx`.
3. Move data fetching / derived state into a `use*` hook under `app/hooks/`.
4. Keep the parent as composition + layout only.

> Example: `AdminVenueEditor.tsx` (1100+ lines) → `AdminVenueEditor` (shell) + `VenueBasicsSection`, `VenueImagesSection`, `VenueEventsSection`, plus `useAdminVenueEditor` for state/mutations.

### Oversized server file (`file-too-large`, server)

Split by domain into multiple modules under `app/server/` (e.g. `adminVenues.queries.ts`, `adminVenues.mutations.ts`, `adminVenueManagers.ts`). Keep one responsibility per file.

### Oversized hook / util

Split into focused hooks/utils; extract pure helpers. A 500-line util usually hides 3–4 single-purpose functions.

### Prop drilling (`too-many-props`)

- If props are forwarded through ≥2 levels unchanged → introduce a context provider or a hook.
- If a component just needs many sibling values → group into a typed object or use composition (`children`, slots).
- Verify against the manual prop-drilling check below (the scanner only counts fields).

### Layering violation (`*-in-component`, `supabase-auth-in-component`)

Move the Supabase/fetch call into a `use*` hook or a route `loader` / server function. Component receives data + callbacks as props or via hook return.

### Duplication (`duplicate-block`)

Extract the repeated block into a shared util (`app/utils/`), hook (`app/hooks/`), or component. Confirm the blocks are semantically identical, not coincidentally similar.

### Naming / import order

Mechanical — rename file or reorder import groups. Low priority unless touching the file anyway.

---

## Manual review checklist

Items the scanner cannot see. Mark pass/fail with file references.

### 1. Separation of concerns

- [ ] Components render only — no business logic inline in JSX
- [ ] Data fetching, Supabase calls, and shared state live in `app/hooks/`
- [ ] Route files are thin — logic delegated to hooks/utils
- [ ] Server functions are thin handlers — heavy logic in `app/lib/` or utils

### 2. Prop drilling (verify scanner hits)

- [ ] No prop passed unchanged through more than 2 component levels
- [ ] Shared cross-tree state uses context or a hook, not threading
- [ ] Callbacks aren't drilled deep — colocate handlers with their hook

### 3. Component composition

- [ ] One component per file; one clear responsibility
- [ ] Repeated UI (cards, rows, chips) is a reusable component, not copy-paste
- [ ] No giant conditional render trees that should be separate components

### 4. Hooks

- [ ] Each hook has a single concern; large hooks split by responsibility
- [ ] No duplicated fetch/transform logic across hooks (share a util)
- [ ] Hooks return stable references where needed (avoid re-render churn)

### 5. Types & boundaries

- [ ] Shared types in `app/types/`, not redefined per file
- [ ] No `any`; explicit return types on exported functions (see bug-catcher)
- [ ] `.server.ts` / server-only modules never imported by client components

### 6. Folder structure

- [ ] Components co-located in their own folder (`Foo/Foo.tsx`, `Foo.types.ts`)
- [ ] Utils are pure (no side effects); side-effectful code lives in hooks/lib
- [ ] Imports follow external → `@/` → relative

---

## SipSocial hot spots

Prioritize these — they are the largest / most coupled:

1. **`app/server/adminVenues.ts`** (~1500 lines) — split by query/mutation/domain
2. **`app/components/AdminVenueEditor/`** — extract sections + state hook
3. **`app/components/AdminVenuesList/AdminVenuesList.tsx`** (~780 lines) — split list/row/actions
4. **`app/server/menuPhotoSubmissions.ts`** (~900 lines) — separate crowd/manager/admin paths
5. **`app/components/VenueMap/VenueMap.tsx`** — extract map setup + marker logic into hooks/helpers

---

## Report template

```markdown
# Code Structure Review — SipSocial

**Date:** YYYY-MM-DD
**Scope:** [full codebase / module / PR]
**Method:** Static scan + manual architecture review

## Executive summary

[Overall structural health, biggest debt, recommended order of attack.]

## Findings summary

| Category | Count | Top offender |
|----------|-------|--------------|
| Size         | N | `file:lines` |
| Layering     | N | |
| Props        | N | |
| Duplication  | N | |
| Naming/Imports | N | |

## Prioritized refactors

### 1. [Title] — `path/file.tsx` (impact: high, effort: medium)

- **Smell:** What the scanner / review found
- **Why it matters:** Maintainability/testability impact
- **Refactor:** Concrete steps (extract X into Y, create hook Z)
- **Risk/blast radius:** What else this touches

(repeat, ordered by impact-to-effort)

## Healthy patterns observed

- [Things already well-structured — reinforce them]

## Recommended next steps

1. [Smallest high-impact refactor first]
```

---

## Pair with the other skills

Run all three before a release or major refactor:

```bash
npm run security:audit
npm run bug:catch
npm run structure:check
npm test
```

- Security: `.cursor/skills/security-audit/`
- Bugs: `.cursor/skills/bug-catcher/`

---

## Reference

Refactor patterns and CLAUDE.md mapping: [reference.md](reference.md)

# Code structure reference

## CLAUDE.md conventions enforced

| Area | Rule | Scanner rule id |
|------|------|-----------------|
| React | Components ≤ 200 lines; split if larger | `file-too-large` |
| React | Components render only — logic in hooks | `data-access-in-component`, manual |
| React | Logic in `app/hooks/`, prefixed `use` | `hook-not-use-prefixed` |
| React | Prefer named exports | `default-export` |
| React | Avoid prop drilling beyond 2 levels | `too-many-props` + manual |
| Auth | Use `useAuth` only; never `supabase.auth` in components | `supabase-auth-in-component` |
| Supabase | Never call from components — hooks/loaders only | `data-access-in-component` |
| Style | PascalCase components, camelCase hooks/utils/lib | `*-not-*` |
| Imports | external → `@/` aliases → relative | `import-order` |
| DRY | No duplicated blocks | `duplicate-block` |

## Thresholds (edit in `scripts/code-structure.mjs`)

```
component: 200   hook: 200   util: 300   lib: 400   server: 500
propFields: 8    dupWindow: 10
```

Adjust if the team agrees a category warrants a different limit. Document the change in this file.

## Refactor recipes

### Split a large component

```
Before: Big.tsx (600 lines)
After:
  Big/Big.tsx              # shell: layout + composition (<120 lines)
  Big/BigHeader.tsx
  Big/BigList.tsx
  Big/BigRow.tsx
  hooks/useBig.ts          # data + state + mutations
  Big/Big.types.ts         # shared prop/types
```

Rule of thumb: each extracted piece should be independently readable and, ideally, independently testable.

### Lift data access out of a component

```
Before (in component):
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.from('venues')...

After:
  // hooks/useVenues.ts owns the query
  const { venues, isLoading, error } = useVenues(citySlug)
```

### Replace prop drilling with context

Use context when 3+ levels forward the same value, or many components need it:

```tsx
// FooContext.tsx
const FooContext = createContext<FooValue | null>(null)
export function useFoo() {
  const ctx = useContext(FooContext)
  if (!ctx) throw new Error('useFoo must be used within FooProvider')
  return ctx
}
```

Otherwise prefer composition (`children`, slot props) over a new context.

### De-duplicate

1. Confirm blocks are semantically identical (not coincidental).
2. Choose the right home: pure logic → `app/utils/`; stateful/React → `app/hooks/`; markup → a component.
3. Replace all copies; keep one source of truth.

## What NOT to flag

- `app/components/ui/*` — shadcn primitives; do not refactor here
- Co-located helpers in component folders (e.g. `venuePin.ts`, `filterConfig.tsx`) — camelCase is correct
- `routeTree.gen.ts` and other generated files
- Large generated type files in `app/types/`

## Effort vs impact guide

| Refactor | Impact | Effort |
|----------|--------|--------|
| Split 1000+ line server/component | High | Medium–High |
| Extract data hook from component | High | Low–Medium |
| Context for deep prop drilling | Medium | Medium |
| Rename file / fix import order | Low | Low |
| De-dupe shared block | Medium | Low |

Attack high-impact / low-effort first (usually: extract a hook, fix import order, de-dupe), then schedule the large splits.

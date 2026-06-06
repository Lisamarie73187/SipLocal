# Bug catcher reference

## day_of_week convention

| Source | Sunday | Monday |
|--------|--------|--------|
| JS `Date.getDay()` | 0 | 1 |
| SipSocial DB `happy_hour_slots.day_of_week` | 0 | 1 |

Always convert with explicit helpers — never assume ISO weekday (1=Mon).

## Common SipSocial bug patterns

### Timezone drift

```ts
// Risky: uses local browser TZ for Bend venue
const now = new Date()

// Prefer: city timezone from venues → cities.timezone
```

### Supabase `.single()` vs `.maybeSingle()`

- `.single()` throws PGRST116 when 0 rows — handle or use `.maybeSingle()`
- Check `error` on every query; don't only check `data`

### React Strict Mode

Effects run twice in dev — guard side effects:

```ts
useEffect(() => {
  let cancelled = false
  void load().then((result) => {
    if (!cancelled) setState(result)
  })
  return () => { cancelled = true }
}, [deps])
```

### TanStack Router

- `beforeLoad` throws redirect — don't swallow in component
- Loader errors need `errorComponent` on route
- Invalidate router after mutations that affect loader data

### Server function errors

Map domain errors to messages users can act on:

```ts
try {
  await requireAdmin()
} catch (e) {
  if (e instanceof AdminAuthError) {
    throw new Error(e.message) // or structured error type
  }
  throw e
}
```

## Utils that should have tests

Any branching logic in `app/utils/` — especially:

- `happyHour`, `happyHourSchedule`, `eventTime`
- `discoveryFilters`, `ownerDealRows`
- `parseHappyHourPaste`, `menuPhotoFile`

Index re-export files (`index.ts`) don't need tests; implementation files do.

## Smoke test checklist (manual)

- [ ] Discover list loads for Bend
- [ ] Map pins match list filters
- [ ] Favorite toggle logged in / prompt when logged out
- [ ] Owner save happy hours persists after reload
- [ ] Admin unpublish removes venue from public discover

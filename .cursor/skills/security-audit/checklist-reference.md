# Security checklist reference

## OWASP Top 10 mapping (2021)

| OWASP | SipSocial focus |
|-------|-----------------|
| A01 Broken Access Control | RLS policies, `requireAdmin`/`requireVenueManager`, route guards |
| A02 Cryptographic Failures | HTTPS, signed storage URLs, no secrets in client bundle |
| A03 Injection | Zod validators, Supabase parameterized queries, no raw SQL from user input |
| A04 Insecure Design | Service role bypass paths must re-check auth in application layer |
| A05 Security Misconfiguration | RLS on all tables, private storage buckets, env var scoping |
| A06 Vulnerable Components | `npm audit`, dependency pinning |
| A07 Auth Failures | Supabase session cookies, admin flag on profiles table |
| A08 Software/Data Integrity | Migration review, no unsigned third-party scripts |
| A09 Logging Failures | No PII in console.log; use `@/utils/logger` |
| A10 SSRF | Scrape/googlePlaces — validate URLs, block internal IPs |

## Supabase RLS patterns to verify

```sql
-- Good: user can only read own favorites
create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

-- Good: admin helper function
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Bad: missing RLS on sensitive table
-- Bad: policy using user-controlled column without check
-- Bad: SECURITY DEFINER without SET search_path
```

## Server function auth matrix

| Function type | Required guard |
|---------------|----------------|
| Admin CRUD | `requireAdmin()` |
| Owner venue edit | `requireVenueManager(venueId)` |
| User profile/favorites | `requireAuthenticatedUser()` |
| Public read (published venue media) | App-layer check + no sensitive data |

## Known intentional exceptions

Document these when confirming static scan info findings:

- `getCurrentUserAdmin` — UI gating only; returns boolean, no privileged data
- `getVenueHappyHourMenuImage` — published venues only; returns time-limited signed URL

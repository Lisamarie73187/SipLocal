---
name: security-audit
description: >-
  Performs a full-stack security review of SipSocial (TanStack Start, Supabase,
  RLS, server functions, auth). Runs static scan script, validates findings,
  and produces a severity-ranked report. Use when the user asks for security
  review, vulnerability audit, penetration testing prep, or OWASP-style analysis.
---

# SipSocial Security Audit

## Quick start

Copy this checklist and track progress as you go:

```
Security Audit Progress:
- [ ] Step 1: Run static scanner (npm run security:audit)
- [ ] Step 2: Triage every critical + high finding (read cited file, confirm/dismiss)
- [ ] Step 3: Work the manual checklist (8 areas below)
- [ ] Step 4: Review SipSocial-specific risk areas
- [ ] Step 5: Deliver report using the template
```

**Step 1 — Run the scanner:**

```bash
npm run security:audit          # human-readable
npm run security:audit -- --json   # machine-readable for CI/tooling
```

**Step 2 — Triage:** For each critical/high finding, open the file at the cited line. Decide one of: `confirmed`, `false positive`, or `accepted risk`. Never report a raw scanner hit without reading context — see the false-positive list below.

**Step 3–4 — Manual review:** The scanner is mechanical; the checklist and risk areas catch logic the scanner cannot. Mark each item pass/fail with a file reference.

**Step 5 — Report:** Use the template at the end. Lead with the highest severity.

---

## Severity definitions

| Severity | Meaning | Action |
|----------|---------|--------|
| **Critical** | Exploitable now; data breach, auth bypass, secret leak | Fix before deploy |
| **High** | Likely exploitable with moderate effort; missing auth/RLS | Fix in current sprint |
| **Medium** | Defense-in-depth gap; needs wrong config or chained bug | Plan fix |
| **Low** | Hardening, logging, minor misconfig | Backlog |
| **Info** | Intentional pattern or review reminder | Document or accept risk |

---

## Static scan (automated)

`scripts/security-audit.mjs` checks:

- Hardcoded secrets (JWT, API keys, private keys)
- Service role / server secrets in client bundles
- `VITE_` prefix on sensitive env vars
- XSS patterns (`dangerouslySetInnerHTML`, `innerHTML`)
- `eval` / `new Function`
- Direct `supabase.auth` in components (project violation)
- Server functions missing auth guards or input validators
- SQL migrations: tables without RLS, `SECURITY DEFINER` without `search_path`
- Admin routes without obvious guards

**False positives:** Mapbox public tokens, intentional public server functions (`getVenueHappyHourMenuImage`, `getCurrentUserAdmin`), test files. Always read context before reporting.

---

## Manual review checklist

Work through each area. Mark pass/fail with file references.

### 1. Authentication & authorization

- [ ] Every `createServerFn` in `app/server/` calls `requireAdmin`, `requireAuthenticatedUser`, or `requireVenueManager` unless intentionally public
- [ ] Admin routes (`app/routes/admin*.tsx`) use `beforeLoad` redirect or layout guard
- [ ] Owner routes (`app/routes/manage*.tsx`) verify venue manager relationship server-side, not client-only
- [ ] `profiles.is_admin` cannot be self-set via RLS or profile update endpoints
- [ ] Components use `useAuth` only — never `supabase.auth` directly

**Key files:** `app/lib/adminAuth.server.ts`, `app/lib/ownerAuth.server.ts`, `app/routes/admin.tsx`

### 2. Supabase RLS & service role

- [ ] Every public table has RLS enabled (`supabase/migrations/`)
- [ ] Policies follow least privilege: anon reads published data only; users own-row for favorites/profiles
- [ ] `createSupabaseServiceClient()` used only in server code with explicit authorization checks before writes
- [ ] Service role never imported in client components or routes without `.server` boundary
- [ ] Storage buckets private; access via signed URLs with expiry

**Key files:** `app/lib/supabaseService.ts`, `app/lib/menuPhotoStorage.ts`, `supabase/migrations/*_venue_menu_submissions.sql`

### 3. Server functions & input validation

- [ ] All POST server functions use Zod `.inputValidator`
- [ ] UUIDs validated with `z.string().uuid()` — no raw string IDs trusted
- [ ] File uploads: type, size, and count limits enforced (`app/utils/menuPhotoFile/`)
- [ ] No user input passed to raw SQL or shell commands
- [ ] Anthropic/scrape APIs called only from admin-authenticated paths

### 4. Secrets & environment

- [ ] `.env.local` gitignored; `.env.example` has placeholders only
- [ ] Client exposes only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_TOKEN`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, Anthropic keys server-only
- [ ] No secrets in git history (if suspected: rotate keys)

### 5. XSS & client security

- [ ] User-generated content (venue names, deal text, profile fields) rendered as text nodes, not HTML
- [ ] Map pin `innerHTML` uses app-controlled markup only (`app/components/VenueMap/venuePin.ts`)
- [ ] External links use `rel="noopener noreferrer"` when `target="_blank"`

### 6. Edge functions

- [ ] `supabase/functions/*` validate JWT via `_shared/auth.ts`
- [ ] CORS restricted if exposed publicly
- [ ] Rate limiting or abuse controls on submission endpoints

### 7. Data privacy

- [ ] Profile DOB/gender/location fields not exposed publicly beyond policy
- [ ] Admin panels do not log PII to console
- [ ] Signed URLs have short TTL

### 8. Dependency & supply chain

- [ ] Run `npm audit` — note critical/high CVEs
- [ ] Pin or review `latest` tags on TanStack packages for reproducible builds

---

## SipSocial-specific risk areas

Prioritize these during review:

1. **Menu photo pipeline** — upload, storage path, signed URLs, crowd vs manager vs admin paths (`app/server/menuPhotoSubmissions.ts`)
2. **Venue claim flow** — privilege escalation via claim approval (`app/server/ownerHappyHourPaste.ts`, claim migrations)
3. **Admin scrape/discover** — external API calls, cost abuse (`app/server/adminDiscover.ts`, `app/lib/scrape/`)
4. **Happy hour paste + AI parse** — prompt injection, oversized payloads (`app/server/adminHappyHourPaste.ts`)
5. **Service role in `createSupabaseServerClient`** — verify cookie client uses anon key in production paths (`app/lib/supabase.server.ts`)

---

## Report template

Deliver findings in this format. Only include confirmed findings in the count; list dismissed scanner hits under "False positives reviewed".

```markdown
# Security Audit — SipSocial

**Date:** YYYY-MM-DD
**Scope:** [full codebase / PR #N / module]
**Method:** Static scan + manual review
**Result:** [PASS / PASS WITH FINDINGS / FAIL — blockers present]

## Executive summary

[2–3 sentences: overall posture, top risks, recommended priority.]

## Findings summary

| Severity | Count | Must fix before deploy? |
|----------|-------|-------------------------|
| Critical | N     | Yes                     |
| High     | N     | Yes                     |
| Medium   | N     | Planned                 |
| Low      | N     | Backlog                 |
| Info     | N     | No                      |

## Findings

### [SEVERITY] Short title

- **Category:** auth | secrets | xss | database | input-validation | ...
- **Location:** `path/file.ts:line`
- **Impact:** What an attacker gains / what data is exposed
- **Evidence:** Code snippet or scan output
- **Recommendation:** Specific, actionable fix
- **Status:** confirmed | accepted risk

(repeat per finding, highest severity first)

## Passed checks

- [Controls verified correct, e.g. "All server functions enforce requireAdmin/requireVenueManager"]

## False positives reviewed

- `rule-id` at `file:line` — why it is safe

## Recommended next steps

1. [Ordered by severity; concrete and assignable]
```

---

## CI integration (optional)

Add to CI as a non-blocking or blocking step:

```yaml
- run: npm run security:audit -- --json > security-report.json
  continue-on-error: true
```

Exit code 1 when critical/high findings exist — tune after triaging the baseline.

---

## Additional reference

See [checklist-reference.md](checklist-reference.md) for OWASP mapping and Supabase RLS patterns.

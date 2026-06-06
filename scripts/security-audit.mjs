#!/usr/bin/env node
/**
 * SipSocial static security scanner.
 * Run: node scripts/security-audit.mjs [--json] [--severity critical|high|medium|low|info]
 *
 * Finds likely issues; agent/manual review required for false positives.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const args = process.argv.slice(2)
const jsonOutput = args.includes('--json')
const severityFilter = args.find((a) => a.startsWith('--severity='))?.split('=')[1]

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

/** @typedef {{ id: string, severity: string, category: string, file: string, line: number, message: string, snippet?: string }} Finding */

/** @type {Finding[]} */
const findings = []

function add(finding) {
  if (severityFilter && finding.severity !== severityFilter) return
  findings.push(finding)
}

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'routeTree.gen.ts') {
      continue
    }
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, exts, out)
    } else if (exts.some((ext) => name.endsWith(ext))) {
      const r = relative(ROOT, full).replace(/\\/g, '/')
      if (r === 'scripts/security-audit.mjs') continue
      out.push(full)
    }
  }
  return out
}

function rel(path) {
  return relative(ROOT, path).replace(/\\/g, '/')
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length
}

function snippet(content, line) {
  const lines = content.split('\n')
  return (lines[line - 1] ?? '').trim().slice(0, 120)
}

// ---------------------------------------------------------------------------
// Pattern rules
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
  {
    id: 'hardcoded-jwt',
    severity: 'critical',
    category: 'secrets',
    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    message: 'Possible hardcoded JWT or API token',
  },
  {
    id: 'hardcoded-sk-key',
    severity: 'critical',
    category: 'secrets',
    re: /\bsk_(live|test)_[A-Za-z0-9]{16,}/,
    message: 'Possible hardcoded Stripe secret key',
  },
  {
    id: 'hardcoded-supabase-service',
    severity: 'critical',
    category: 'secrets',
    re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/,
    message: 'Hardcoded SUPABASE_SERVICE_ROLE_KEY assignment',
  },
  {
    id: 'hardcoded-anthropic',
    severity: 'critical',
    category: 'secrets',
    re: /\bsk-ant-[A-Za-z0-9-]{20,}/,
    message: 'Possible hardcoded Anthropic API key',
  },
  {
    id: 'hardcoded-mapbox-secret',
    severity: 'high',
    category: 'secrets',
    re: /\bpk\.eyJ[A-Za-z0-9_-]+/,
    message: 'Mapbox token in source (public pk tokens are OK client-side; verify scope)',
  },
  {
    id: 'private-key-block',
    severity: 'critical',
    category: 'secrets',
    re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    message: 'Private key material in repository',
  },
]

const CODE_PATTERNS = [
  {
    id: 'dangerously-set-inner-html',
    severity: 'high',
    category: 'xss',
    re: /dangerouslySetInnerHTML/,
    message: 'dangerouslySetInnerHTML — verify content is sanitized',
  },
  {
    id: 'inner-html',
    severity: 'medium',
    category: 'xss',
    re: /\.innerHTML\s*=/,
    message: 'Direct innerHTML assignment — XSS risk if user-controlled',
  },
  {
    id: 'eval',
    severity: 'critical',
    category: 'injection',
    re: /\beval\s*\(/,
    message: 'eval() usage',
  },
  {
    id: 'new-function',
    severity: 'high',
    category: 'injection',
    re: /new\s+Function\s*\(/,
    message: 'Dynamic Function constructor — code injection risk',
  },
  {
    id: 'supabase-auth-in-component',
    severity: 'medium',
    category: 'auth',
    re: /supabase\.auth\./,
    message: 'Direct supabase.auth call — project rule: use useAuth hook only',
    skipIf: (file) => !file.startsWith('app/components/') && !file.startsWith('app/routes/'),
  },
  {
    id: 'service-role-client-side',
    severity: 'critical',
    category: 'secrets',
    re: /SUPABASE_SERVICE_ROLE_KEY|createSupabaseServiceClient|serviceRoleKey/,
    message: 'Service role reference in potentially client-exposed file',
    skipIf: (file) =>
      file.startsWith('app/server/') ||
      file.startsWith('app/lib/') ||
      file.startsWith('scripts/') ||
      file.startsWith('supabase/functions/') ||
      file.endsWith('.server.ts') ||
      file.includes('.test.'),
  },
  {
    id: 'vite-secret-prefix',
    severity: 'critical',
    category: 'secrets',
    re: /VITE_(SUPABASE_SERVICE|SERVICE_ROLE|SECRET|ANTHROPIC|OPENAI)/,
    message: 'Secret env var exposed via VITE_ prefix (bundled to client)',
  },
  {
    id: 'process-env-client',
    severity: 'medium',
    category: 'secrets',
    re: /process\.env\.(SUPABASE_SERVICE_ROLE|ANTHROPIC|OPENAI|SECRET)/,
    message: 'Server secret accessed via process.env in file that may ship to client',
    skipIf: (file) =>
      file.startsWith('app/server/') ||
      file.startsWith('app/lib/') ||
      file.endsWith('.server.ts') ||
      file.startsWith('scripts/') ||
      file.startsWith('supabase/'),
  },
  {
    id: 'console-log-sensitive',
    severity: 'low',
    category: 'logging',
    re: /console\.(log|debug|info)\([^)]*(password|token|secret|authorization|cookie)/i,
    message: 'Console log may leak sensitive data',
  },
  {
    id: 'http-url',
    severity: 'low',
    category: 'transport',
    re: /['"]http:\/\/(?!localhost|127\.0\.0\.1)/,
    message: 'Non-local HTTP URL — prefer HTTPS in production',
    skipIf: (file) => file.includes('.test.') || file.includes('migrations/'),
  },
]

function scanPatterns(files, patterns) {
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)
    for (const rule of patterns) {
      if (rule.skipIf?.(r)) continue
      let match
      const re = rule.re.global ? rule.re : new RegExp(rule.re.source, rule.re.flags + 'g')
      while ((match = re.exec(content)) !== null) {
        if (file.includes('.env') && !file.includes('.example')) continue
        add({
          id: rule.id,
          severity: rule.severity,
          category: rule.category,
          file: r,
          line: lineOf(content, match.index),
          message: rule.message,
          snippet: snippet(content, lineOf(content, match.index)),
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Server function auth audit
// ---------------------------------------------------------------------------

const AUTH_GUARDS = [
  'requireAdmin',
  'requireAuthenticatedUser',
  'requireVenueManager',
  'AdminAuthError',
  'OwnerAuthError',
]

/** Server functions intentionally public (documented exceptions). */
const PUBLIC_SERVER_FNS = new Set([
  'getVenueHappyHourMenuImage', // published venues only; signs storage URL
  'getCurrentUserAdmin', // returns auth state for UI gating only
])

function auditServerFunctions(serverDir) {
  const files = walk(serverDir, ['.ts'])
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)
    const fnRegex = /export const (\w+) = createServerFn[\s\S]*?\.handler\s*\(\s*async/g
    let match
    while ((match = fnRegex.exec(content)) !== null) {
      const fnName = match[1]
      const start = match.index
      const handlerStart = content.indexOf('async', start)
      const nextExport = content.indexOf('\nexport const ', start + 1)
      const blockEnd = nextExport === -1 ? content.length : nextExport
      const handlerBlock = content.slice(handlerStart, blockEnd)

      if (PUBLIC_SERVER_FNS.has(fnName)) {
        add({
          id: 'public-server-fn-reviewed',
          severity: 'info',
          category: 'auth',
          file: r,
          line: lineOf(content, start),
          message: `Server function "${fnName}" has no auth guard — verify intentional (listed exception)`,
        })
        continue
      }

      const hasAuth = AUTH_GUARDS.some((g) => handlerBlock.includes(g))
      const hasValidator = content.slice(start, blockEnd).includes('.inputValidator')

      if (!hasAuth) {
        add({
          id: 'server-fn-no-auth',
          severity: 'high',
          category: 'auth',
          file: r,
          line: lineOf(content, start),
          message: `Server function "${fnName}" may lack auth guard (requireAdmin/requireAuthenticatedUser/requireVenueManager)`,
        })
      }

      if (!hasValidator && fnName !== 'getUserProfile' && fnName !== 'getOwnerDashboard' && fnName !== 'getAdminDiscoverDashboard' && fnName !== 'getAdminVenueCities' && fnName !== 'getCurrentUserAdmin') {
        add({
          id: 'server-fn-no-validator',
          severity: 'medium',
          category: 'input-validation',
          file: r,
          line: lineOf(content, start),
          message: `Server function "${fnName}" has no .inputValidator — confirm inputs are validated`,
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// SQL / RLS audit
// ---------------------------------------------------------------------------

function auditMigrations(migrationsDir) {
  const files = walk(migrationsDir, ['.sql'])
  /** @type {Map<string, { rls: boolean, policies: number }>} */
  const tables = new Map()

  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)

    const createTable = /create table (?:public\.)?(\w+)/gi
    let m
    while ((m = createTable.exec(content)) !== null) {
      const name = m[1]
      if (!tables.has(name)) tables.set(name, { rls: false, policies: 0 })
    }

    const enableRls = /alter table (?:public\.)?(\w+) enable row level security/gi
    while ((m = enableRls.exec(content)) !== null) {
      const name = m[1]
      const entry = tables.get(name) ?? { rls: false, policies: 0 }
      entry.rls = true
      tables.set(name, entry)
    }

    const policy = /create policy/gi
    let policyCount = 0
    while (policy.exec(content) !== null) policyCount++
    if (policyCount > 0) {
      // attach to file-level info only
    }

    if (/security definer/i.test(content) && !/set search_path/i.test(content)) {
      add({
        id: 'security-definer-no-search-path',
        severity: 'high',
        category: 'database',
        file: r,
        line: 1,
        message: 'SECURITY DEFINER function without SET search_path — search_path hijack risk',
      })
    }
  }

  const skipTables = new Set(['schema_migrations'])
  for (const [table, meta] of tables) {
    if (skipTables.has(table)) continue
    if (!meta.rls) {
      add({
        id: 'table-no-rls',
        severity: 'high',
        category: 'database',
        file: 'supabase/migrations/',
        line: 0,
        message: `Table "${table}" created but no "enable row level security" found in migrations (verify RLS)`,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Route guard audit
// ---------------------------------------------------------------------------

function auditAdminRoutes(routesDir) {
  const layoutPath = join(routesDir, 'admin.tsx')
  let layoutGuardsChildren = false
  if (statSync(layoutPath).isFile()) {
    const layoutContent = readFileSync(layoutPath, 'utf8')
    layoutGuardsChildren =
      layoutContent.includes('beforeLoad') ||
      layoutContent.includes('requireAdmin') ||
      layoutContent.includes('isAdmin')

    if (layoutContent.includes('beforeLoad') && !layoutContent.includes('isAdmin')) {
      add({
        id: 'admin-layout-no-role-check',
        severity: 'high',
        category: 'auth',
        file: 'app/routes/admin.tsx',
        line: 1,
        message:
          'Admin layout beforeLoad checks authentication but not isAdmin — non-admin users may access admin UI (server functions may still block writes)',
      })
    }
  }

  const files = walk(routesDir, ['.tsx']).filter((f) => {
    const r = rel(f)
    return r.startsWith('app/routes/admin') && r !== 'app/routes/admin.tsx'
  })

  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)
    if (
      content.includes('beforeLoad') ||
      content.includes('requireAdmin') ||
      content.includes('isAdmin') ||
      layoutGuardsChildren
    ) {
      continue
    }
    add({
      id: 'admin-route-no-guard',
      severity: 'medium',
      category: 'auth',
      file: r,
      line: 1,
      message: 'Admin route file without obvious beforeLoad/requireAdmin guard — verify protection',
    })
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const scanFiles = walk(join(ROOT, 'app'), ['.ts', '.tsx'])
  .concat(walk(join(ROOT, 'supabase'), ['.ts', '.sql']))
  .concat(walk(join(ROOT, 'scripts'), ['.mjs', '.ts', '.js']))

scanPatterns(scanFiles, SECRET_PATTERNS)
scanPatterns(scanFiles, CODE_PATTERNS)
auditServerFunctions(join(ROOT, 'app/server'))
auditMigrations(join(ROOT, 'supabase/migrations'))
auditAdminRoutes(join(ROOT, 'app/routes'))

findings.sort((a, b) => {
  const sd = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  if (sd !== 0) return sd
  return a.file.localeCompare(b.file) || a.line - b.line
})

const summary = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]))

if (jsonOutput) {
  console.log(JSON.stringify({ summary, findings }, null, 2))
} else {
  console.log('\nSipSocial Security Audit (static scan)\n')
  console.log('Summary:', summary)
  console.log(`Total findings: ${findings.length}\n`)

  let lastSeverity = ''
  for (const f of findings) {
    if (f.severity !== lastSeverity) {
      console.log(`\n--- ${f.severity.toUpperCase()} ---\n`)
      lastSeverity = f.severity
    }
    const loc = f.line > 0 ? `${f.file}:${f.line}` : f.file
    console.log(`[${f.category}] ${f.id}`)
    console.log(`  ${loc}`)
    console.log(`  ${f.message}`)
    if (f.snippet) console.log(`  > ${f.snippet}`)
    console.log()
  }

  console.log('Note: Static scan only. Run the security-audit skill for full manual review.\n')
}

process.exit(findings.some((f) => f.severity === 'critical' || f.severity === 'high') ? 1 : 0)

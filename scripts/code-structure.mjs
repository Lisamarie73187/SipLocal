#!/usr/bin/env node
/**
 * SipSocial code-structure scanner.
 * Run: node scripts/code-structure.mjs [--json] [--severity high|medium|low|info]
 *
 * Detects structural smells against the project conventions in CLAUDE.md:
 * file size, default exports, layering violations, naming, prop drilling,
 * import ordering, and duplicated blocks. Agent/manual review required.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const args = process.argv.slice(2)
const jsonOutput = args.includes('--json')
const severityFilter = args.find((a) => a.startsWith('--severity='))?.split('=')[1]

const SEVERITY_ORDER = ['high', 'medium', 'low', 'info']

// Thresholds (CLAUDE.md: components <= 200 lines; logic belongs in hooks/utils).
const LIMITS = {
  component: 200,
  hook: 200,
  util: 300,
  server: 500,
  lib: 400,
  route: 200,
  propFields: 8,
  dupWindow: 10, // consecutive significant lines to consider a duplicate block
}

const SKIP_PATH_PARTS = ['node_modules', '.git', 'dist']
const SKIP_FILES = new Set([
  'routeTree.gen.ts',
  'scripts/code-structure.mjs',
])

/** @typedef {{ id: string, severity: string, category: string, file: string, line: number, message: string, snippet?: string }} Finding */

/** @type {Finding[]} */
const findings = []

function add(finding) {
  if (severityFilter && finding.severity !== severityFilter) return
  findings.push(finding)
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_PATH_PARTS.includes(name)) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, out)
    } else if (/\.(ts|tsx)$/.test(name)) {
      const r = relative(ROOT, full).replace(/\\/g, '/')
      if (SKIP_FILES.has(name) || SKIP_FILES.has(r)) continue
      if (name.endsWith('.d.ts')) continue
      if (/\.test\.(ts|tsx)$/.test(name)) continue
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

function classify(r) {
  if (r.includes('/components/ui/')) return 'ui' // shadcn — exempt from most rules
  if (r.startsWith('app/components/')) return 'component'
  if (r.startsWith('app/hooks/')) return 'hook'
  if (r.startsWith('app/utils/')) return 'util'
  if (r.startsWith('app/server/')) return 'server'
  if (r.startsWith('app/lib/')) return 'lib'
  if (r.startsWith('app/routes/')) return 'route'
  if (r.startsWith('app/types/')) return 'types'
  return 'other'
}

// ---------------------------------------------------------------------------
// File size
// ---------------------------------------------------------------------------

function auditFileSize(files) {
  for (const file of files) {
    const r = rel(file)
    const kind = classify(r)
    if (kind === 'ui' || kind === 'types' || kind === 'other') continue
    const limit = LIMITS[kind]
    if (!limit) continue
    const lines = readFileSync(file, 'utf8').split('\n').length
    if (lines > limit) {
      const ratio = lines / limit
      add({
        id: 'file-too-large',
        severity: ratio >= 2 ? 'high' : 'medium',
        category: 'size',
        file: r,
        line: 1,
        message: `${kind} file is ${lines} lines (limit ${limit}) — split into smaller units`,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Default exports (CLAUDE.md: prefer named exports)
// ---------------------------------------------------------------------------

function auditDefaultExports(files) {
  for (const file of files) {
    const r = rel(file)
    if (classify(r) === 'ui') continue
    const content = readFileSync(file, 'utf8')
    const m = content.match(/^export default /m)
    if (m) {
      add({
        id: 'default-export',
        severity: 'low',
        category: 'exports',
        file: r,
        line: lineOf(content, m.index ?? 0),
        message: 'Default export — project prefers named exports',
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Layering: Supabase / data access inside components or routes
// ---------------------------------------------------------------------------

function auditLayering(files) {
  for (const file of files) {
    const r = rel(file)
    const kind = classify(r)
    if (kind !== 'component' && kind !== 'route') continue
    const content = readFileSync(file, 'utf8')

    const authMatch = content.match(/supabase\.auth\./)
    if (authMatch) {
      add({
        id: 'supabase-auth-in-component',
        severity: 'high',
        category: 'layering',
        file: r,
        line: lineOf(content, authMatch.index ?? 0),
        message: 'Direct supabase.auth in component/route — use the useAuth hook',
      })
    }

    const clientMatch = content.match(/getSupabaseBrowserClient|createSupabaseServiceClient|\.from\(['"]/)
    if (clientMatch) {
      add({
        id: 'data-access-in-component',
        severity: 'medium',
        category: 'layering',
        file: r,
        line: lineOf(content, clientMatch.index ?? 0),
        message: 'Data access in component/route — move Supabase calls to a hook or route loader',
      })
    }

    if (kind === 'component') {
      const fetchMatch = content.match(/\bawait\s+fetch\(/)
      if (fetchMatch) {
        add({
          id: 'fetch-in-component',
          severity: 'medium',
          category: 'layering',
          file: r,
          line: lineOf(content, fetchMatch.index ?? 0),
          message: 'Network fetch inside component — move to a hook or server function',
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Naming conventions
// ---------------------------------------------------------------------------

function auditNaming(files) {
  for (const file of files) {
    const r = rel(file)
    const kind = classify(r)
    const name = basename(file).replace(/\.(ts|tsx)$/, '')
    if (name === 'index') continue
    const content = readFileSync(file, 'utf8')

    if (kind === 'component') {
      const baseName = name.split('.')[0]
      // Only enforce PascalCase on files that actually export a React component.
      // Co-located helpers (venuePin.ts, filterConfig.tsx) stay camelCase.
      const exportsComponent =
        /export\s+(?:default\s+)?function\s+[A-Z]\w*\s*\(/.test(content) ||
        /export\s+const\s+[A-Z]\w*\s*[:=].*=>/.test(content)
      const returnsJsx = /return\s*\(?\s*</.test(content)
      if (exportsComponent && returnsJsx && !/^[A-Z][A-Za-z0-9]*$/.test(baseName)) {
        add({
          id: 'component-not-pascalcase',
          severity: 'low',
          category: 'naming',
          file: r,
          line: 1,
          message: `Component file "${name}" is not PascalCase`,
        })
      }
    }

    if (kind === 'hook') {
      const baseName = name.split('.')[0]
      if (!/^use[A-Z]/.test(baseName)) {
        add({
          id: 'hook-not-use-prefixed',
          severity: 'low',
          category: 'naming',
          file: r,
          line: 1,
          message: `Hook file "${name}" should start with "use"`,
        })
      }
    }

    if ((kind === 'util' || kind === 'lib') && /^[A-Z]/.test(name.split('.')[0])) {
      add({
        id: 'util-not-camelcase',
        severity: 'low',
        category: 'naming',
        file: r,
        line: 1,
        message: `${kind} file "${name}" should be camelCase`,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Prop drilling proxy: large prop interfaces
// ---------------------------------------------------------------------------

function auditPropShapes(files) {
  for (const file of files) {
    const r = rel(file)
    if (classify(r) === 'ui') continue
    const content = readFileSync(file, 'utf8')
    const propsRegex = /(?:interface|type)\s+(\w*Props)\b[^{]*\{([\s\S]*?)\n\}/g
    let match
    while ((match = propsRegex.exec(content)) !== null) {
      const body = match[2]
      const fieldCount = (body.match(/^\s*[\w'"[\]]+\??\s*:/gm) ?? []).length
      if (fieldCount > LIMITS.propFields) {
        add({
          id: 'too-many-props',
          severity: 'medium',
          category: 'props',
          file: r,
          line: lineOf(content, match.index),
          message: `${match[1]} has ${fieldCount} fields (>${LIMITS.propFields}) — possible prop drilling; consider context or composition`,
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Import ordering (CLAUDE.md: External -> @/ aliases -> relative)
// ---------------------------------------------------------------------------

function importRank(spec) {
  if (spec.startsWith('@/')) return 1
  if (spec.startsWith('.')) return 2
  return 0 // external
}

function auditImportOrder(files) {
  for (const file of files) {
    const r = rel(file)
    if (classify(r) === 'ui') continue
    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')
    let lastRank = -1
    let reported = false
    for (let i = 0; i < lines.length && !reported; i++) {
      const m = lines[i].match(/^import\s+(?:type\s+)?.*?from\s+['"]([^'"]+)['"]/)
      if (!m) {
        // stop scanning once past the import block (first non-import, non-blank, non-comment)
        if (lines[i].trim() && !lines[i].startsWith('import') && !lines[i].startsWith('//') && !lines[i].startsWith('/*') && !lines[i].startsWith('*')) {
          if (i > 0 && lastRank !== -1) break
        }
        continue
      }
      const rank = importRank(m[1])
      if (rank < lastRank) {
        add({
          id: 'import-order',
          severity: 'low',
          category: 'imports',
          file: r,
          line: i + 1,
          message: 'Import group out of order — use external → @/ aliases → relative',
          snippet: lines[i].trim().slice(0, 100),
        })
        reported = true
      }
      lastRank = Math.max(lastRank, rank)
    }
  }
}

// ---------------------------------------------------------------------------
// Duplicate blocks across files
// ---------------------------------------------------------------------------

function normalizeLine(line) {
  return line.trim()
}

function isSignificant(line) {
  const t = line.trim()
  if (t.length < 12) return false
  if (/^[}\])]+;?$/.test(t)) return false
  if (t.startsWith('import ')) return false
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false
  return true
}

function auditDuplication(files) {
  const window = LIMITS.dupWindow
  /** @type {Map<string, Array<{ file: string, line: number }>>} */
  const blocks = new Map()

  for (const file of files) {
    const r = rel(file)
    const kind = classify(r)
    if (kind === 'ui' || kind === 'types') continue
    const lines = readFileSync(file, 'utf8').split('\n')

    for (let i = 0; i + window <= lines.length; i++) {
      const slice = lines.slice(i, i + window)
      // require the whole window to be significant lines (skip blank/brace/import-heavy regions)
      if (slice.filter(isSignificant).length < window) continue
      const key = slice.map(normalizeLine).join('\n')
      if (key.length < window * 16) continue
      const arr = blocks.get(key) ?? []
      arr.push({ file: r, line: i + 1 })
      blocks.set(key, arr)
    }
  }

  // Collect window-hits that are part of a cross-file duplicated block.
  /** @type {Map<string, Set<number>>} hits per file (start lines) */
  const hitsByFile = new Map()
  /** @type {Map<string, Set<string>>} partner files per file */
  const partners = new Map()

  for (const [, locs] of blocks) {
    if (locs.length < 2) continue
    const distinctFiles = [...new Set(locs.map((l) => l.file))]
    if (distinctFiles.length < 2) continue // ignore within-file repetition (often legitimate)
    for (const loc of locs) {
      if (!hitsByFile.has(loc.file)) hitsByFile.set(loc.file, new Set())
      hitsByFile.get(loc.file).add(loc.line)
      if (!partners.has(loc.file)) partners.set(loc.file, new Set())
      for (const other of distinctFiles) {
        if (other !== loc.file) partners.get(loc.file).add(other)
      }
    }
  }

  // Merge contiguous/overlapping start-lines into a single region per file.
  for (const [file, lineSet] of hitsByFile) {
    const lines = [...lineSet].sort((a, b) => a - b)
    let regionStart = lines[0]
    let prev = lines[0]
    const flush = (start, end) => {
      const others = [...(partners.get(file) ?? [])].filter((f) => f !== file)
      add({
        id: 'duplicate-block',
        severity: 'medium',
        category: 'duplication',
        file,
        line: start,
        message: `Duplicated code (lines ~${start}-${end + window - 1}) also appears in: ${others.slice(0, 3).join(', ')}${others.length > 3 ? ` +${others.length - 3} more` : ''} — extract a shared util/hook/component`,
      })
    }
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] - prev > window) {
        flush(regionStart, prev)
        regionStart = lines[i]
      }
      prev = lines[i]
    }
    flush(regionStart, prev)
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const files = walk(join(ROOT, 'app'))

auditFileSize(files)
auditDefaultExports(files)
auditLayering(files)
auditNaming(files)
auditPropShapes(files)
auditImportOrder(files)
auditDuplication(files)

findings.sort((a, b) => {
  const sd = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  if (sd !== 0) return sd
  return a.file.localeCompare(b.file) || a.line - b.line
})

const summary = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]))
const byCategory = {}
for (const f of findings) byCategory[f.category] = (byCategory[f.category] ?? 0) + 1

if (jsonOutput) {
  console.log(JSON.stringify({ summary, byCategory, findings }, null, 2))
} else {
  console.log('\nSipSocial Code Structure (static scan)\n')
  console.log('Summary:', summary)
  console.log('By category:', byCategory)
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

  console.log('Note: Static scan only. Run the code-structure skill for refactor suggestions.\n')
}

process.exit(findings.some((f) => f.severity === 'high') ? 1 : 0)

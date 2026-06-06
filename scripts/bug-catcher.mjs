#!/usr/bin/env node
/**
 * SipSocial static bug scanner.
 * Run: node scripts/bug-catcher.mjs [--json] [--severity critical|high|medium|low|info]
 *
 * Finds likely bugs; agent/manual review required for false positives.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, basename, dirname } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const args = process.argv.slice(2)
const jsonOutput = args.includes('--json')
const severityFilter = args.find((a) => a.startsWith('--severity='))?.split('=')[1]

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']
const SKIP_FILES = new Set(['routeTree.gen.ts', 'scripts/bug-catcher.mjs', 'scripts/security-audit.mjs'])

/** @typedef {{ id: string, severity: string, category: string, file: string, line: number, message: string, snippet?: string }} Finding */

/** @type {Finding[]} */
const findings = []

function add(finding) {
  if (severityFilter && finding.severity !== severityFilter) return
  findings.push(finding)
}

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, exts, out)
    } else if (exts.some((ext) => name.endsWith(ext))) {
      const r = relative(ROOT, full).replace(/\\/g, '/')
      if (SKIP_FILES.has(name)) continue
      if (r.includes('.test.') || r.endsWith('.test.ts') || r.endsWith('.test.tsx')) continue
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
  return (content.split('\n')[line - 1] ?? '').trim().slice(0, 120)
}

function scanPatterns(files, patterns) {
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)
    for (const rule of patterns) {
      if (rule.skipIf?.(r, content)) continue
      const re = rule.re.global ? rule.re : new RegExp(rule.re.source, rule.re.flags + 'g')
      let match
      while ((match = re.exec(content)) !== null) {
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

const CODE_PATTERNS = [
  {
    id: 'console-log',
    severity: 'low',
    category: 'logging',
    re: /console\.(log|debug|info)\(/,
    message: 'console.log in app code — use @/utils/logger',
    skipIf: (file) => file.includes('utils/logger/'),
  },
  {
    id: 'ts-ignore',
    severity: 'medium',
    category: 'types',
    re: /@ts-(ignore|expect-error)/,
    message: 'TypeScript error suppressed — may hide real bugs',
    skipIf: (file) => file === 'app/routeTree.gen.ts',
  },
  {
    id: 'any-type',
    severity: 'medium',
    category: 'types',
    re: /(\bas any\b|: any\b)/,
    message: 'any type bypasses strict checking',
    skipIf: (file) => file === 'app/routeTree.gen.ts',
  },
  {
    id: 'empty-catch',
    severity: 'high',
    category: 'errors',
    re: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/,
    message: 'Empty catch block swallows errors',
  },
  {
    id: 'useeffect-async',
    severity: 'high',
    category: 'react',
    re: /useEffect\s*\(\s*async\s/,
    message: 'useEffect with async callback — race conditions and unhandled rejections',
  },
  {
    id: 'useeffect-inline-async',
    severity: 'medium',
    category: 'react',
    re: /useEffect\s*\(\s*\(\)\s*=>\s*\{\s*(?:\/\/[^\n]*\n\s*)*async\s/,
    message: 'useEffect defines async IIFE — verify cleanup/abort on unmount',
  },
  {
    id: 'floating-promise-void',
    severity: 'low',
    category: 'async',
    re: /\bvoid\s+(?!navigate)[a-zA-Z_$][\w$]*\(/,
    message: 'void promise — errors may be unhandled; prefer try/catch or .catch()',
    skipIf: (file) => file.startsWith('app/routes/'),
  },
  {
    id: 'non-null-assertion',
    severity: 'low',
    category: 'types',
    re: /\w+!\.|\w+!\[|\)!\./,
    message: 'Non-null assertion (!) — runtime crash if assumption wrong',
  },
  {
    id: 'get-day-usage',
    severity: 'info',
    category: 'domain',
    re: /\.getDay\s*\(\s*\)/,
    message: 'Date.getDay() used — verify day_of_week matches DB (0=Sun…6=Sat)',
  },
  {
    id: 'date-parse-string',
    severity: 'medium',
    category: 'domain',
    re: /new Date\s*\(\s*[a-zA-Z_$][\w$]*\s*\)/,
    message: 'new Date(variable) — invalid dates become NaN silently',
  },
  {
    id: 'list-key-index',
    severity: 'low',
    category: 'react',
    re: /key=\{(?:index|i)\}/,
    message: 'List key={index} — reorder/filter bugs; prefer stable id',
    skipIf: (file) => file.includes('Skeleton'),
  },
  {
    id: 'eslint-disable',
    severity: 'low',
    category: 'lint',
    re: /eslint-disable(?!-next-line)/,
    message: 'eslint-disable — verify rule violation is intentional',
    skipIf: (file) => file === 'app/routeTree.gen.ts',
  },
]

function auditParseInt(files) {
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)
    for (const match of content.matchAll(/parseInt\s*\(\s*([^,)]+)\s*\)/g)) {
      const full = match[0]
      if (/,\s*10\s*\)/.test(full)) continue
      add({
        id: 'parseint-no-radix',
        severity: 'medium',
        category: 'logic',
        file: r,
        line: lineOf(content, match.index ?? 0),
        message: 'parseInt without radix — use parseInt(x, 10) or Number()',
        snippet: full,
      })
    }
  }
}

function auditSupabaseErrorHandling(files) {
  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue
    const content = readFileSync(file, 'utf8')
    const r = rel(file)

    const queryRegex =
      /const\s*\{\s*data(?::[^}]*)?,\s*error(?::\s*(\w+))?\s*\}\s*=\s*await\s+[\s\S]{0,400}?\.(?:from|rpc)\(/g
    let match
    while ((match = queryRegex.exec(content)) !== null) {
      const errorVar = match[1] ?? 'error'
      const blockStart = match.index
      const blockEnd = Math.min(content.length, blockStart + 800)
      const block = content.slice(blockStart, blockEnd)
      const handlesError =
        block.includes(`if (${errorVar}`) ||
        block.includes(`if(${errorVar}`) ||
        block.includes(`throw ${errorVar}`) ||
        block.includes(`throw error`) ||
        block.includes(`${errorVar} ??`) ||
        block.includes(`!${errorVar}`)

      if (!handlesError) {
        add({
          id: 'supabase-error-unhandled',
          severity: 'high',
          category: 'errors',
          file: r,
          line: lineOf(content, blockStart),
          message: `Supabase query destructures "${errorVar}" but may not handle it in following lines`,
          snippet: snippet(content, lineOf(content, blockStart)),
        })
      }
    }
  }
}

function auditRoutes(routesDir) {
  const rootPath = join(routesDir, '__root.tsx')
  let rootHasErrorBoundary = false
  if (existsSync(rootPath)) {
    const rootContent = readFileSync(rootPath, 'utf8')
    rootHasErrorBoundary =
      rootContent.includes('errorComponent') || rootContent.includes('defaultErrorComponent')
  }

  const files = walk(routesDir, ['.tsx']).filter((f) => rel(f).startsWith('app/routes/'))
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)
    if (!content.includes('createFileRoute')) continue
    if (r === 'app/routes/__root.tsx') continue

    if (
      !content.includes('errorComponent') &&
      !content.includes('ErrorComponent') &&
      !rootHasErrorBoundary
    ) {
      add({
        id: 'route-no-error-boundary',
        severity: 'low',
        category: 'routing',
        file: r,
        line: 1,
        message: 'Route lacks errorComponent — loader/render failures may white-screen',
      })
    }

    if (content.includes('loader:') && !content.includes('pendingComponent')) {
      add({
        id: 'route-loader-no-pending',
        severity: 'low',
        category: 'routing',
        file: r,
        line: 1,
        message: 'Route has loader but no pendingComponent — consider loading UI',
      })
    }
  }
}

function auditUntestedUtils() {
  const utilsRoot = join(ROOT, 'app/utils')
  if (!existsSync(utilsRoot)) return

  for (const dirName of readdirSync(utilsRoot)) {
    const dir = join(utilsRoot, dirName)
    if (!statSync(dir).isDirectory()) continue

    for (const name of readdirSync(dir)) {
      if (name === 'index.ts' || name.endsWith('.test.ts')) continue
      if (!name.endsWith('.ts')) continue

      const base = name.replace(/\.ts$/, '')
      const testPath = join(dir, `${base}.test.ts`)
      if (!existsSync(testPath)) {
        add({
          id: 'util-no-tests',
          severity: 'info',
          category: 'testing',
          file: rel(join(dir, name)),
          line: 1,
          message: `Utility "${dirName}/${name}" has no co-located test — high bug risk for pure logic`,
        })
      }
    }
  }
}

function auditServerFnErrorMapping(serverDir) {
  const files = walk(serverDir, ['.ts'])
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)
    if (!content.includes('createServerFn')) continue

    const hasAuthError =
      content.includes('AdminAuthError') ||
      content.includes('OwnerAuthError') ||
      content.includes('ScrapeApiError') ||
      content.includes('catch (') ||
      content.includes('catch(')

    const serverFnCount = (content.match(/createServerFn/g) ?? []).length
    if (serverFnCount > 0 && !hasAuthError) {
      add({
        id: 'server-fn-no-error-mapping',
        severity: 'medium',
        category: 'server',
        file: r,
        line: 1,
        message: 'Server module may not map auth/validation errors to client-safe responses',
      })
    }
  }
}

function auditHooksWithoutCleanup(files) {
  const hookFiles = files.filter((f) => rel(f).startsWith('app/hooks/'))
  for (const file of hookFiles) {
    const content = readFileSync(file, 'utf8')
    const r = rel(file)
    if (!content.includes('useEffect')) continue
    if (
      content.includes('addEventListener') ||
      content.includes('.subscribe(') ||
      content.includes('setInterval') ||
      content.includes('setTimeout')
    ) {
      const effectBlocks = content.match(/useEffect\s*\([\s\S]*?\n\s*\},?\s*\[[^\]]*\]\s*\)/g) ?? []
      for (const block of effectBlocks) {
        const needsCleanup =
          block.includes('addEventListener') ||
          block.includes('.subscribe(') ||
          block.includes('setInterval') ||
          block.includes('setTimeout')
        const hasCleanup = block.includes('return ()') || block.includes('return function')
        if (needsCleanup && !hasCleanup) {
          add({
            id: 'effect-no-cleanup',
            severity: 'high',
            category: 'react',
            file: r,
            line: lineOf(content, content.indexOf(block)),
            message: 'useEffect registers listeners/timers without cleanup — memory leak or stale state',
            snippet: block.split('\n')[0]?.trim().slice(0, 120),
          })
          break
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const appFiles = walk(join(ROOT, 'app'), ['.ts', 'tsx'])

scanPatterns(appFiles, CODE_PATTERNS)
auditParseInt(appFiles)
auditSupabaseErrorHandling(appFiles)
auditRoutes(join(ROOT, 'app/routes'))
auditUntestedUtils()
auditServerFnErrorMapping(join(ROOT, 'app/server'))
auditHooksWithoutCleanup(appFiles)

findings.sort((a, b) => {
  const sd = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  if (sd !== 0) return sd
  return a.file.localeCompare(b.file) || a.line - b.line
})

const summary = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]))

if (jsonOutput) {
  console.log(JSON.stringify({ summary, findings }, null, 2))
} else {
  console.log('\nSipSocial Bug Catcher (static scan)\n')
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

  console.log('Next: run `npm test` and use the bug-catcher skill for logic review.\n')
}

process.exit(findings.some((f) => f.severity === 'critical' || f.severity === 'high') ? 1 : 0)

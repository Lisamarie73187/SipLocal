import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { parseHappyHourPasteAdmin } from '@/server/adminHappyHourPaste'
import { formatHappyHourDayLabel } from '@/utils/happyHourSchedule'
import {
  isRulesParseComplete,
  parseHappyHourPaste,
  type ParseHappyHourPasteResult,
} from '@/utils/parseHappyHourPaste'
import { cn } from '@/utils'

const textareaClassName =
  'min-h-28 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

export interface HappyHourPastePanelProps {
  applyLabel?: string
  showModeToggle?: boolean
  defaultMode?: 'append' | 'replace'
  saving?: boolean
  variant?: 'default' | 'compact'
  onApply: (result: ParseHappyHourPasteResult, mode: 'append' | 'replace') => void | Promise<void>
}

export function HappyHourPastePanel({
  applyLabel = 'Apply happy hours',
  showModeToggle = true,
  defaultMode = 'append',
  saving = false,
  variant = 'default',
  onApply,
}: HappyHourPastePanelProps) {
  const [pasteText, setPasteText] = useState('')
  const [mode, setMode] = useState<'append' | 'replace'>(defaultMode)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiPreview, setAiPreview] = useState<
    (ParseHappyHourPasteResult & { parser: 'rules' | 'ai' }) | null
  >(null)
  const [parsingAi, setParsingAi] = useState(false)
  const [resolvingApply, setResolvingApply] = useState(false)

  const rulesPreview = useMemo(() => parseHappyHourPaste(pasteText), [pasteText])
  const preview = aiPreview ?? rulesPreview
  const rulesIncomplete = pasteText.trim().length > 0 && !isRulesParseComplete(rulesPreview)

  useEffect(() => {
    setAiPreview(null)
  }, [pasteText])

  const runAiParse = async (): Promise<
    ParseHappyHourPasteResult & { parser: 'rules' | 'ai' }
  > => {
    setParsingAi(true)
    setError(null)
    try {
      const result = await parseHappyHourPasteAdmin({
        data: { pasteText: pasteText.trim(), forceAi: true },
      })
      if (result.parser === 'ai') {
        setAiPreview(result)
      }
      if (result.slots.length === 0) {
        throw new Error(result.warnings[0] ?? 'AI could not extract happy hour slots.')
      }
      return result
    } finally {
      setParsingAi(false)
    }
  }

  const resolvePreviewForApply = async (): Promise<ParseHappyHourPasteResult> => {
    if (aiPreview && aiPreview.slots.length > 0) {
      return aiPreview
    }
    if (isRulesParseComplete(rulesPreview)) {
      return rulesPreview
    }
    return parseHappyHourPasteAdmin({ data: { pasteText: pasteText.trim() } })
  }

  const handleApply = (): void => {
    setError(null)
    setMessage(null)
    setResolvingApply(true)

    void resolvePreviewForApply()
      .then((result) => {
        if (result.slots.length === 0) {
          throw new Error(result.warnings[0] ?? 'Could not parse any happy hour slots.')
        }
        return Promise.resolve(onApply(result, mode)).then(() => result)
      })
      .then((result) => {
        const parserLabel = aiPreview?.parser === 'ai' ? ' (AI)' : ''
        setMessage(
          `Applied ${result.slots.length} slot group${result.slots.length === 1 ? '' : 's'} (${result.slots.reduce((total, slot) => total + slot.days.length, 0)} day rows)${parserLabel}.`,
        )
        setPasteText('')
        setAiPreview(null)
      })
      .catch((applyError) => {
        setError(applyError instanceof Error ? applyError.message : 'Apply failed')
      })
      .finally(() => {
        setResolvingApply(false)
      })
  }

  const busy = saving || parsingAi || resolvingApply

  return (
    <div
      className={cn(
        'space-y-3',
        variant === 'default' && 'rounded-xl border border-border/70 bg-card p-4 shadow-sm',
        variant === 'compact' && 'mt-3 border-t border-border/60 pt-3',
      )}
    >
      <div>
        <p className="text-sm font-medium text-dark">Paste happy hour schedule</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste structured text or messy copy from a website. We parse simple formats instantly; use
          Parse with AI for freeform text.
        </p>
      </div>

      <textarea
        value={pasteText}
        onChange={(event) => {
          setPasteText(event.target.value)
          setMessage(null)
          setError(null)
        }}
        className={textareaClassName}
        placeholder={'Mon–Fri 4:00–6:00 PM\n$5 pints, $7 apps\n\nOr paste a paragraph from the venue site…'}
        aria-label="Paste happy hour schedule"
      />

      {preview.slots.length > 0 ? (
        <ul className="space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-xs text-dark">
          {preview.slots.map((slot, index) => (
            <li key={`${slot.start_time}-${slot.end_time}-${index}`}>
              {formatHappyHourDayLabel(slot.days)} · {slot.start_time}–{slot.end_time}
              {slot.deal_summary ? (
                <span className="text-muted-foreground"> — {slot.deal_summary.split('\n')[0]}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {aiPreview ? (
        <p className="text-xs text-primary" role="status">
          Preview from AI — review before applying.
        </p>
      ) : null}

      {rulesIncomplete ? (
        <p className="text-xs text-secondary" role="status">
          {rulesPreview.warnings.join(' ')} Try Parse with AI for messy website copy.
        </p>
      ) : preview.warnings.length > 0 && pasteText.trim() ? (
        <p className="text-xs text-secondary" role="status">
          {preview.warnings.join(' ')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {showModeToggle ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'append' ? 'default' : 'outline'}
              className="min-h-9"
              onClick={() => setMode('append')}
            >
              Append
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'replace' ? 'default' : 'outline'}
              className="min-h-9"
              onClick={() => setMode('replace')}
            >
              Replace all
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9"
          disabled={busy || pasteText.trim().length === 0}
          onClick={() => {
            void runAiParse().catch((parseError) => {
              setError(parseError instanceof Error ? parseError.message : 'AI parse failed')
            })
          }}
        >
          {parsingAi ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Parse with AI
        </Button>

        <Button
          type="button"
          size="sm"
          className="min-h-9"
          disabled={busy || pasteText.trim().length === 0}
          onClick={handleApply}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {applyLabel}
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="text-xs text-dark" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}

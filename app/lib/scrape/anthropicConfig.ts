import { ScrapeApiError } from './errors'

export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) {
    throw new ScrapeApiError(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local (server-only, no VITE_ prefix).',
      { code: 'missing_config', provider: 'anthropic' },
    )
  }
  return key
}

export function getAnthropicHappyHourModel(): string {
  return process.env.ANTHROPIC_HAPPY_HOUR_MODEL?.trim() || 'claude-haiku-4-5-20251001'
}

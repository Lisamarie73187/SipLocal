export type ScrapeErrorCode =
  | 'missing_config'
  | 'api_error'
  | 'parse_error'
  | 'not_configured'

export class ScrapeApiError extends Error {
  readonly code: ScrapeErrorCode
  readonly statusCode: number | null
  readonly provider: 'google' | 'anthropic'

  constructor(
    message: string,
    options: {
      code: ScrapeErrorCode
      provider: 'google' | 'anthropic'
      statusCode?: number | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options.cause })
    this.name = 'ScrapeApiError'
    this.code = options.code
    this.provider = options.provider
    this.statusCode = options.statusCode ?? null
  }
}

export function isScrapeApiError(error: unknown): error is ScrapeApiError {
  return error instanceof ScrapeApiError
}

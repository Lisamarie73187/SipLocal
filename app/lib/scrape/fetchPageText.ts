import { ScrapeApiError } from './errors'

const MAX_PAGE_TEXT_LENGTH = 20000

const HOURS_SUB_PATHS = ['/hours', '/contact', '/about', '/location', '/visit', '/find-us']

function htmlToText(html: string): string {
  const withoutNoise = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const withBreaks = withoutNoise
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|br)>/gi, '\n')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')

  const text = withBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n')
}

export async function fetchPageText(url: string): Promise<string> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new ScrapeApiError('Enter a valid URL.', { code: 'parse_error', provider: 'anthropic' })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ScrapeApiError('URL must use http or https.', {
      code: 'parse_error',
      provider: 'anthropic',
    })
  }

  let response: Response
  try {
    response = await fetch(parsed.toString(), {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SipSocialEventScrubber/1.0)',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
  } catch (error) {
    throw new ScrapeApiError('Could not reach that URL.', {
      code: 'api_error',
      provider: 'anthropic',
      cause: error,
    })
  }

  if (!response.ok) {
    throw new ScrapeApiError(`That URL returned an error (${response.status}).`, {
      code: 'api_error',
      provider: 'anthropic',
      statusCode: response.status,
    })
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('html') && !contentType.includes('text')) {
    throw new ScrapeApiError('That URL did not return a web page.', {
      code: 'parse_error',
      provider: 'anthropic',
    })
  }

  const html = await response.text()
  const text = htmlToText(html)

  if (!text.trim()) {
    throw new ScrapeApiError('Could not read any text from that page.', {
      code: 'parse_error',
      provider: 'anthropic',
    })
  }

  return text.slice(0, MAX_PAGE_TEXT_LENGTH)
}

async function tryFetchPageText(url: string): Promise<string | null> {
  try {
    const text = await fetchPageText(url)
    return text
  } catch {
    return null
  }
}

export async function fetchPageTextWithSubPages(baseUrl: string): Promise<string> {
  const parsed = new URL(baseUrl)
  const origin = parsed.origin

  const mainText = await fetchPageText(baseUrl)

  const subPageTexts = await Promise.all(
    HOURS_SUB_PATHS.map((path) => tryFetchPageText(`${origin}${path}`)),
  )

  const combined = [mainText, ...subPageTexts.filter((t): t is string => t !== null)].join('\n\n')
  return combined.slice(0, MAX_PAGE_TEXT_LENGTH)
}

// ── Firecrawl API v2 shared client ────────────────────────────────────────────

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1'

function getApiKey(): string {
  const key = Deno.env.get('FIRECRAWL_API_KEY')
  if (!key) throw new Error('FIRECRAWL_API_KEY not configured. Connect Firecrawl in Settings → Connectors.')
  return key
}

export interface ScrapeResult {
  success: boolean
  data?: {
    markdown?: string
    html?: string
    screenshot?: string
    metadata?: {
      title?: string
      description?: string
      language?: string
      sourceURL?: string
      statusCode?: number
      ogImage?: string
      [key: string]: unknown
    }
  }
  error?: string
}

export interface ExtractResult<T = Record<string, unknown>> {
  success: boolean
  data?: T
  error?: string
  status?: string
}

export interface SearchResult {
  success: boolean
  data?: Array<{
    url: string
    title: string
    description: string
    markdown?: string
  }>
  error?: string
}

export interface MapResult {
  success: boolean
  links?: string[]
  error?: string
}

export interface CrawlJobResult {
  success: boolean
  id?: string
  status?: string
  total?: number
  completed?: number
  data?: Array<{ markdown: string; metadata: Record<string, unknown> }>
  error?: string
}

async function firecrawlRequest<T>(
  path: string,
  method: 'POST' | 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey()

  const response = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Firecrawl API error ${response.status}: ${errorText}`)
  }

  return response.json() as Promise<T>
}

export const firecrawl = {
  async scrape(
    url: string,
    options: {
      formats?: ('markdown' | 'html' | 'screenshot' | 'links')[]
      onlyMainContent?: boolean
      waitFor?: number
      timeout?: number
    } = {}
  ): Promise<ScrapeResult> {
    return firecrawlRequest<ScrapeResult>('/scrape', 'POST', {
      url,
      formats: options.formats ?? ['markdown'],
      onlyMainContent: options.onlyMainContent ?? true,
      waitFor: options.waitFor,
      timeout: options.timeout ?? 30000,
    })
  },

  async extract<T = Record<string, unknown>>(
    urls: string[],
    options: {
      prompt: string
      schema?: Record<string, unknown>
      allowExternalLinks?: boolean
    }
  ): Promise<ExtractResult<T>> {
    return firecrawlRequest<ExtractResult<T>>('/extract', 'POST', {
      urls,
      prompt: options.prompt,
      schema: options.schema,
      allowExternalLinks: options.allowExternalLinks ?? false,
    })
  },

  async search(
    query: string,
    options: {
      limit?: number
      lang?: string
      country?: string
      scrapeOptions?: { formats: ('markdown' | 'html')[] }
    } = {}
  ): Promise<SearchResult> {
    return firecrawlRequest<SearchResult>('/search', 'POST', {
      query,
      limit: options.limit ?? 5,
      lang: options.lang ?? 'pt',
      country: options.country ?? 'pt',
      scrapeOptions: options.scrapeOptions,
    })
  },

  async map(url: string): Promise<MapResult> {
    return firecrawlRequest<MapResult>('/map', 'POST', { url })
  },

  async crawlAsync(
    url: string,
    options: {
      limit?: number
      maxDepth?: number
      includePaths?: string[]
      excludePaths?: string[]
    } = {}
  ): Promise<{ id: string }> {
    return firecrawlRequest<{ id: string }>('/crawl', 'POST', {
      url,
      limit: options.limit ?? 10,
      maxDepth: options.maxDepth ?? 3,
      includePaths: options.includePaths,
      excludePaths: options.excludePaths ?? ['/blog/*', '/news/*', '/careers/*'],
      scrapeOptions: { formats: ['markdown'] },
    })
  },

  async getCrawlStatus(jobId: string): Promise<CrawlJobResult> {
    return firecrawlRequest<CrawlJobResult>(`/crawl/${jobId}`, 'GET')
  },
}

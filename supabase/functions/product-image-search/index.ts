// product-image-search
// Pesquisa imagens reais de produtos via Firecrawl. Estratégia:
// 1. Search no Firecrawl pela query (nome + termos de produto)
// 2. Para cada resultado, faz scrape com formats=[links, screenshot] e extrai
//    URLs de imagem (jpg/png/webp) presentes nos links + ogImage do metadata
// 3. Devolve lista deduplicada com {url, source_url, source_title}
//
// IMPORTANTE: nunca inventa imagens — só devolve URLs efectivamente
// encontradas em páginas web reais.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { firecrawl } from '../_shared/firecrawl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif)(\?.*)?$/i

function looksLikeImage(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('http')) return false
  // Skip obvious non-product images
  const lower = url.toLowerCase()
  if (
    lower.includes('logo') ||
    lower.includes('favicon') ||
    lower.includes('sprite') ||
    lower.includes('icon') ||
    lower.includes('avatar') ||
    lower.includes('banner') ||
    lower.includes('placeholder')
  ) {
    return false
  }
  return IMAGE_EXT_RE.test(url)
}

const THUMB_RE = /(_|-)(\d{1,3})x(\d{1,3})\.|thumb|thumbnail|mini|small|swatch/i

function isThumbLike(url: string): boolean {
  return THUMB_RE.test(url)
}

function absolutize(raw: string, base: string): string | null {
  try {
    const u = new URL(raw.trim(), base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

/** Extrai URLs de imagem do HTML (src, data-src, data-original, srcset). */
function extractImageUrlsFromHtml(html: string, base: string): string[] {
  const out: string[] = []
  const attrRe = /(?:src|data-src|data-original|data-lazy|data-image|content)\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(html)) !== null) {
    const abs = absolutize(m[1], base)
    if (abs) out.push(abs)
  }
  const srcsetRe = /srcset\s*=\s*["']([^"']+)["']/gi
  while ((m = srcsetRe.exec(html)) !== null) {
    for (const part of m[1].split(',')) {
      const candidate = part.trim().split(/\s+/)[0]
      const abs = candidate ? absolutize(candidate, base) : null
      if (abs) out.push(abs)
    }
  }
  return out
}

/** Palavras-chave do produto (SKU/slug) para ordenar as imagens mais relevantes. */
function relevanceTokens(pageUrl: string, query: string): string[] {
  const tokens = new Set<string>()
  const add = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (cleaned.length >= 6) tokens.add(cleaned)
  }
  try {
    const last = new URL(pageUrl).pathname.split('/').filter(Boolean).pop()
    if (last) add(last.replace(/-detail$/i, '').replace(/\.\w+$/, ''))
  } catch { /* ignore */ }
  if (query) add(query)
  return Array.from(tokens)
}

interface ImageCandidate {
  url: string
  source_url: string
  source_title?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await supabaseClient.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const query: string = (body.query ?? '').toString().trim()
    const limit: number = Math.min(Math.max(body.limit ?? 4, 1), 8)

    // Modo alternativo: importar as imagens de uma página de produto indicada
    const rawPageUrl: string = (body.pageUrl ?? '').toString().trim()
    let pageUrl: string | null = null
    if (rawPageUrl) {
      if (rawPageUrl.length > 2048) {
        return new Response(
          JSON.stringify({ success: false, error: 'pageUrl demasiado longo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      try {
        const parsed = new URL(rawPageUrl)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol')
        pageUrl = parsed.toString()
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Endereço inválido. Usa um link http(s) completo.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    if (!query && !pageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'query ou pageUrl obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!Deno.env.get('FIRECRAWL_API_KEY')) {
      return new Response(
        JSON.stringify({
          success: false,
          fallback: true,
          error: 'Firecrawl não está configurado. Liga o conector em Connectors.',
          candidates: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (pageUrl) {
      const found: ImageCandidate[] = []
      const pageSeen = new Set<string>()
      let pageTitle: string | undefined

      try {
        const scrape = await firecrawl.scrape(pageUrl, {
          formats: ['html', 'links'],
          onlyMainContent: false,
          waitFor: 2000,
        })

        if ((scrape as any)?.success === false) {
          throw new Error((scrape as any)?.error || 'scrape sem sucesso')
        }
        const payload = (scrape as any)?.data ?? scrape
        if (!payload) throw new Error('sem resposta')

        pageTitle = payload.metadata?.title
        const urls: string[] = []

        const ogImage = payload.metadata?.ogImage
        if (typeof ogImage === 'string') {
          const abs = absolutize(ogImage, pageUrl)
          if (abs) urls.push(abs)
        }

        const html = typeof payload.html === 'string'
          ? payload.html
          : typeof payload.rawHtml === 'string'
            ? payload.rawHtml
            : ''
        if (html) urls.push(...extractImageUrlsFromHtml(html, pageUrl))

        if (Array.isArray(payload.links)) {
          for (const link of payload.links) {
            if (typeof link !== 'string') continue
            const abs = absolutize(link, pageUrl)
            if (abs) urls.push(abs)
          }
        }

        for (const url of urls) {
          if (!looksLikeImage(url) || /\/templates\//i.test(url)) continue
          // Muitas lojas só publicam miniaturas no HTML: tenta a versão original
          const fullSize = url.replace(/(_|-)(thumb|thumbnail|small|mini)(?=\.[a-z0-9]+(\?|$))/i, '')
          const finalUrl = fullSize !== url ? fullSize : url
          if (fullSize === url && isThumbLike(url)) continue
          if (pageSeen.has(finalUrl)) continue
          pageSeen.add(finalUrl)
          found.push({ url: finalUrl, source_url: pageUrl, source_title: pageTitle })
        }

        // Coloca primeiro as imagens cujo endereço contém a referência do produto
        const tokens = relevanceTokens(pageUrl, query)
        if (tokens.length > 0) {
          const score = (url: string) => {
            const lower = url.toLowerCase()
            return tokens.some((t) => lower.includes(t)) ? 0 : 1
          }
          found.sort((a, b) => score(a.url) - score(b.url))
        }
      } catch (err) {
        console.warn('[product-image-search] pageUrl scrape failed', pageUrl, (err as Error).message)
        return new Response(
          JSON.stringify({
            success: false,
            fallback: true,
            candidates: [],
            error: 'Não foi possível ler esta página (pode estar protegida). Tenta a pesquisa por nome.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          candidates: found.slice(0, 24),
          page_url: pageUrl,
          warning: found.length === 0
            ? 'Não foram encontradas imagens nesta página. Tenta a pesquisa por nome.'
            : undefined,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }


    // Estratégia primária: Firecrawl v2 /search com sources=["images"]
    // — devolve imagens reais indexadas pelo Google sem precisar de scraping.
    const searchQuery = query
    console.log('[product-image-search] query:', searchQuery, 'limit:', limit)

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY')!
    const candidates: ImageCandidate[] = []
    const seen = new Set<string>()

    try {
      const v2Resp = await fetch('https://api.firecrawl.dev/v2/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: Math.max(limit * 4, 12),
          sources: ['images'],
        }),
      })

      if (v2Resp.ok) {
        const v2Data = await v2Resp.json().catch(() => null) as any
        const images: any[] = v2Data?.data?.images ?? []
        for (const img of images) {
          const url: string = img?.imageUrl || img?.url
          if (!url || !url.startsWith('http') || seen.has(url)) continue
          seen.add(url)
          candidates.push({
            url,
            source_url: img?.url || url,
            source_title: img?.title,
          })
        }
        console.log('[product-image-search] v2 images:', candidates.length)
      } else {
        const txt = await v2Resp.text()
        console.warn('[product-image-search] v2 search failed', v2Resp.status, txt.slice(0, 200))
      }
    } catch (err) {
      console.warn('[product-image-search] v2 search error', (err as Error).message)
    }

    // Fallback: se não vieram imagens, tenta scrape do top resultado web
    if (candidates.length === 0) {
      const searchResult = await firecrawl.search(`${query} produto`, {
        limit: 6,
        lang: 'pt',
        country: 'pt',
      })

      if (searchResult.success && searchResult.data?.length) {
        await Promise.all(
          searchResult.data.slice(0, 6).map(async (r) => {
            try {
              const scrape = await firecrawl.scrape(r.url, {
                formats: ['links'],
                onlyMainContent: true,
                timeout: 25000,
              })
              if (!scrape.success || !scrape.data) return

              const ogImage = (scrape.data.metadata?.ogImage as string) || null
              if (ogImage && ogImage.startsWith('http') && !seen.has(ogImage)) {
                seen.add(ogImage)
                candidates.push({ url: ogImage, source_url: r.url, source_title: r.title })
              }

              const links = (scrape.data as any).links as string[] | undefined
              if (Array.isArray(links)) {
                for (const link of links) {
                  if (looksLikeImage(link) && !seen.has(link)) {
                    seen.add(link)
                    candidates.push({ url: link, source_url: r.url, source_title: r.title })
                    if (candidates.length >= 24) break
                  }
                }
              }
            } catch (err) {
              console.warn('[product-image-search] scrape failed', r.url, (err as Error).message)
            }
          }),
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        candidates: candidates.slice(0, 24),
        query: searchQuery,
        warning: candidates.length === 0 ? 'Sem imagens encontradas para esta pesquisa' : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[product-image-search] error:', msg)
    // 200 + fallback para não rebentar com o cliente
    return new Response(
      JSON.stringify({ success: false, fallback: true, error: msg, candidates: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

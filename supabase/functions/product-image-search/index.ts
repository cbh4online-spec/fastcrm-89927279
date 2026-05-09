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

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'query required' }),
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

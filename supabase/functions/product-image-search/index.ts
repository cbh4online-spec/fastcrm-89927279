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

function absolutize(raw: string, base: string): string | null {
  try {
    const u = new URL(raw.trim(), base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

const THUMB_RE = /(_|-)(\d{1,3})x(\d{1,3})\.|thumb|thumbnail|mini|small|swatch/i


function isThumbLike(url: string): boolean {
  return THUMB_RE.test(url)
}

/** Dimensões declaradas no nome do ficheiro ou na query (?w=, ?width=, -200x200). */
function declaredSize(url: string): number | null {
  const sizes: number[] = []
  const nameMatch = url.match(/[._-](\d{2,4})x(\d{2,4})(?=\.[a-z0-9]+(\?|$))/i)
  if (nameMatch) sizes.push(Number(nameMatch[1]), Number(nameMatch[2]))
  const qMatch = url.match(/[?&](?:w|width|h|height|sw|size)=(\d{2,4})/i)
  if (qMatch) sizes.push(Number(qMatch[1]))
  if (sizes.length === 0) return null
  return Math.max(...sizes)
}

const MIN_DECLARED_PX = 250

/**
 * Chave canónica da imagem: mesmo ficheiro em várias resoluções colapsa numa só.
 * Remove sufixos de dimensão/miniatura, parâmetros de corte e a query.
 */
function canonicalImageKey(url: string): string {
  let u = url
  try {
    const parsed = new URL(url)
    u = parsed.origin + parsed.pathname
  } catch { /* usa a string crua */ }
  return u
    .toLowerCase()
    .replace(/[._-]\d{2,4}x\d{2,4}(?=\.[a-z0-9]+$)/i, '')
    .replace(/[._-](thumb|thumbnail|small|mini|medium|large|xl|xxl|cart|home|zoom)\d*(?=\.[a-z0-9]+$)/i, '')
    .replace(/[._-]\d{2,4}(?=\.[a-z0-9]+$)/i, '')
    .replace(/\/(?:thumbs?|thumbnails?|small|medium|cache|resized)\//i, '/')
}

/** Pontuação de qualidade: maior é melhor. */
function qualityScore(url: string): number {
  const size = declaredSize(url)
  let score = size ?? 1200 // sem dimensão declarada = provavelmente a original
  if (isThumbLike(url)) score -= 2000
  if (/original|full|large|zoom|1200|1500|2000/i.test(url)) score += 300
  return score
}

/** Guarda apenas a melhor variante de cada imagem canónica. */
function dedupeByQuality<T extends { url: string }>(list: T[]): T[] {
  const best = new Map<string, T>()
  for (const item of list) {
    if (declaredSize(item.url) !== null && declaredSize(item.url)! < MIN_DECLARED_PX) continue
    const key = canonicalImageKey(item.url)
    const current = best.get(key)
    if (!current || qualityScore(item.url) > qualityScore(current.url)) {
      best.set(key, item)
    }
  }
  return Array.from(best.values())
}

/** Remove sufixos de miniatura (_thumb, _thumb2, -small…) para obter a original. */
function upgradeThumb(url: string): string {
  return url.replace(/([._-])(thumb|thumbnail|small|mini)\d*(?=\.[a-z0-9]+(\?|$))/i, '')
}


/** Extrai URLs de imagem do HTML (src, data-src, data-original, srcset, href). */
function extractImageUrlsFromHtml(html: string, base: string): string[] {
  const out: string[] = []
  const attrRe = /(?:src|data-src|data-original|data-lazy|data-image|data-zoom-image|data-large|content|href)\s*=\s*["']([^"']+)["']/gi
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
  /** "Página oficial" quando vem da ficha do fabricante/distribuidor. */
  origin?: string
}

// ─────────────────────────────────────────────────────────────
// Descoberta "Page-First" através do conector Parallel
// ─────────────────────────────────────────────────────────────

const PARALLEL_GATEWAY = 'https://connector-gateway.lovable.dev/parallel'

/** Domínios de fabricantes/distribuidores fiáveis (ordem de preferência). */
const TRUSTED_DOMAINS = [
  'visiotechsecurity.com',
  'ajax.systems',
  'hikvision.com',
  'dahuasecurity.com',
  'ajaxsystems.pt',
]

/** Extrai a referência/SKU da pesquisa (ex.: AJ-SOLOCOVER-GRA). */
function extractSku(query: string): string | null {
  const match = query.match(/\b[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){1,}\b/i)
  if (!match) return null
  const sku = match[0].toUpperCase()
  if (sku.length < 6) return null
  return sku
}

/** Primeira palavra significativa da pesquisa = marca provável. */
function extractBrand(query: string): string | null {
  const first = query.trim().split(/\s+/)[0]
  if (!first || first.length < 3) return null
  if (extractSku(first)) return null
  return first
}

/**
 * Procura a página oficial do produto (sub-segundo) usando o Parallel.
 * Nunca inventa endereços: devolve apenas URLs retornados pelo motor.
 */
async function findOfficialProductPage(
  sku: string,
  brand: string | null,
): Promise<{ url: string; title?: string } | null> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const connectionKey = Deno.env.get('PARALLEL_API_KEY')
  if (!lovableKey || !connectionKey) return null

  try {
    const resp = await fetch(`${PARALLEL_GATEWAY}/v1/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': connectionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        objective:
          `Localizar a página oficial do produto com a referência ${sku}` +
          (brand ? ` da marca ${brand}` : '') +
          ', num site de fabricante ou distribuidor profissional, com fotografias de catálogo.',
        search_queries: [sku, brand ? `${sku} ${brand}` : `${sku} produto`],
        mode: 'fast',
        advanced_settings: { max_results: 8 },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!resp.ok) {
      const txt = await resp.text()
      console.warn('[product-image-search] parallel search failed', resp.status, txt.slice(0, 300))
      return null
    }

    const data = await resp.json().catch(() => null) as any
    const results: any[] = data?.results ?? data?.data ?? []
    if (Array.isArray(data?.warnings) && data.warnings.length) {
      console.log('[product-image-search] parallel warnings', JSON.stringify(data.warnings).slice(0, 300))
    }

    const skuSlug = sku.toLowerCase()
    const scored = results
      .map((r) => ({ url: String(r?.url ?? ''), title: r?.title as string | undefined }))
      .filter((r) => r.url.startsWith('http'))
      .map((r) => {
        const lower = r.url.toLowerCase()
        let score = 0
        if (TRUSTED_DOMAINS.some((d) => lower.includes(d))) score += 100
        if (lower.includes(skuSlug)) score += 50
        if (/\/(produto|product|products|p)\//.test(lower)) score += 10
        return { ...r, score }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)

    return scored[0] ?? null
  } catch (err) {
    console.warn('[product-image-search] parallel search error', (err as Error).message)
    return null
  }
}

/** Termos fora do setor que contaminam a pesquisa aberta de imagens. */
const NOISE_RE =
  /(jersey|camisola|futebol|football|amsterdam|soccer|shirt|maillot|kit-\d|fanshop|talhadeira|chisel)/i

/** Pesquisa sintética: só referência + marca, sem a frase longa em português. */
function synthesizeQuery(query: string, sku: string | null, brand: string | null): string {
  if (sku) return [sku, brand].filter(Boolean).join(' ')
  return query
}

/** Débito de créditos no workspace do cliente (autoritário, server-side). */
async function debitCredits(
  admin: any,
  workspaceId: string,
  userId: string,
  reference: string,
): Promise<{ ok: boolean; message?: string; consumed?: number; balance?: number }> {
  const bucket = Math.floor(Date.now() / 60000)
  const { data, error } = await admin.rpc('consume_funnel_credits', {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_action_key: 'product_image_search',
    p_idempotency_key: `product-image-search:${workspaceId}:${reference}:${bucket}`,
    p_reference_type: 'product_image_search',
    p_reference_id: null,
    p_metadata: { reference, source: 'product-image-search' },
  })
  if (error) {
    console.error('[product-image-search] consume_funnel_credits error:', error.message)
    return { ok: false, message: 'Não foi possível validar os créditos.' }
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.success) {
    return { ok: false, message: row?.message || 'Créditos insuficientes.' }
  }
  return { ok: true, consumed: row.credits_consumed, balance: row.balance_remaining }
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

    // ── DÉBITO DE CRÉDITOS (server-side, antes de qualquer chamada paga) ──
    const workspaceId: string | null = (body.workspace_id ?? '').toString().trim() || null
    const userId = (claims.claims as Record<string, unknown>).sub as string | undefined
    let creditsConsumed = 0
    let creditsBalance: number | null = null

    if (workspaceId && userId) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      const debit = await debitCredits(admin, workspaceId, userId, (pageUrl ?? query).slice(0, 180))
      if (!debit.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: debit.message,
            code: 'insufficient_credits',
            candidates: [],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      creditsConsumed = debit.consumed ?? 0
      creditsBalance = debit.balance ?? null
    }

    // ── Page-First: procurar a ficha oficial do produto pela referência ──
    const sku = query ? extractSku(query) : null
    const brand = query ? extractBrand(query) : null
    let autoPage = false
    let autoPageTitle: string | undefined

    if (!pageUrl && sku) {
      const official = await findOfficialProductPage(sku, brand)
      if (official) {
        pageUrl = official.url
        autoPage = true
        autoPageTitle = official.title
        console.log('[product-image-search] page-first:', pageUrl)
      }
    }

    if (!Deno.env.get('FIRECRAWL_API_KEY') && !pageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          fallback: true,
          error: 'A pesquisa de imagens não está configurada. Liga o conector em Connectors.',
          candidates: [],
          credits_consumed: creditsConsumed,
          credits_balance: creditsBalance,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (pageUrl) {
      const found: ImageCandidate[] = []
      const pageSeen = new Set<string>()
      let pageTitle: string | undefined = autoPageTitle
      let onlyThumbs = false
      let readFailed = false

      const collect = (urls: string[]) => {
        for (const url of urls) {
          if (!looksLikeImage(url) || /\/templates\//i.test(url)) continue
          // Se houver versão original, a miniatura é descartada (nunca as duas)
          const fullSize = upgradeThumb(url)
          const chosen = fullSize !== url ? fullSize : url
          if (chosen === url && isThumbLike(url)) {
            onlyThumbs = true
            continue
          }
          if (pageSeen.has(chosen)) continue
          pageSeen.add(chosen)
          found.push({ url: chosen, source_url: pageUrl!, source_title: pageTitle })
        }
      }


      // 1) Leitura via Firecrawl (HTML tratado + original + ligações)
      try {
        const scrape = await firecrawl.scrape(pageUrl, {
          formats: ['html', 'rawHtml', 'links'],
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

        if (typeof payload.html === 'string' && payload.html) {
          urls.push(...extractImageUrlsFromHtml(payload.html, pageUrl))
        }
        if (typeof payload.rawHtml === 'string' && payload.rawHtml) {
          urls.push(...extractImageUrlsFromHtml(payload.rawHtml, pageUrl))
        }

        if (Array.isArray(payload.links)) {
          for (const link of payload.links) {
            if (typeof link !== 'string') continue
            const abs = absolutize(link, pageUrl)
            if (abs) urls.push(abs)
          }
        }

        collect(urls)
      } catch (err) {
        readFailed = true
        console.warn('[product-image-search] pageUrl scrape failed', pageUrl, (err as Error).message)
      }

      // 2) Plano B: leitura directa da página quando não vieram imagens
      if (found.length === 0) {
        try {
          const direct = await fetch(pageUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
            },
            signal: AbortSignal.timeout(8000),
            redirect: 'follow',
          })
          if (direct.ok) {
            const contentType = direct.headers.get('content-type') ?? ''
            if (contentType.includes('html')) {
              const raw = (await direct.text()).slice(0, 3_000_000)
              const titleMatch = raw.match(/<title[^>]*>([^<]{1,200})<\/title>/i)
              if (!pageTitle && titleMatch) pageTitle = titleMatch[1].trim()
              collect(extractImageUrlsFromHtml(raw, pageUrl))
              if (found.length > 0) readFailed = false
            }
          } else {
            console.warn('[product-image-search] direct fetch status', direct.status)
          }
        } catch (err) {
          console.warn('[product-image-search] direct fetch failed', (err as Error).message)
        }
      }

      if (found.length === 0 && !autoPage) {
        return new Response(
          JSON.stringify({
            success: false,
            fallback: true,
            candidates: [],
            page_url: pageUrl,
            credits_consumed: creditsConsumed,
            credits_balance: creditsBalance,
            error: readFailed
              ? 'Não foi possível ler esta página (pode estar protegida). Tenta a pesquisa por nome.'
              : onlyThumbs
                ? 'Só foram encontradas miniaturas nesta página. Tenta a pesquisa por nome.'
                : 'Esta página não tem imagens de produto acessíveis. Tenta a pesquisa por nome.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (found.length > 0) {
        // Remove variantes da mesma imagem, mantendo só a de melhor resolução
        const unique = dedupeByQuality(found)

        // Coloca primeiro as imagens cujo endereço contém a referência do produto
        const tokens = relevanceTokens(pageUrl, query)
        if (tokens.length > 0) {
          const score = (url: string) => {
            const lower = url.toLowerCase()
            return tokens.some((t) => lower.includes(t)) ? 0 : 1
          }
          unique.sort((a, b) => score(a.url) - score(b.url))
        }

        return new Response(
          JSON.stringify({
            success: true,
            candidates: unique.slice(0, 24).map((c) => ({
              ...c,
              origin: c.origin ?? 'Página oficial',
            })),
            page_url: pageUrl,
            credits_consumed: creditsConsumed,
            credits_balance: creditsBalance,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // A ficha automática não deu imagens: segue para a pesquisa aberta
      console.log('[product-image-search] page-first sem imagens, fallback à pesquisa')
      pageUrl = null
    }


    // Estratégia secundária: pesquisa aberta de imagens, com consulta
    // sintetizada (referência + marca) e descarte de resultados fora do setor.
    const searchQuery = synthesizeQuery(query, sku, brand)
    console.log('[product-image-search] query:', searchQuery, 'limit:', limit, 'sku:', sku)

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY')!
    const candidates: ImageCandidate[] = []
    const seen = new Set<string>()

    const isNoise = (url: string, title?: string) =>
      NOISE_RE.test(url) || (title ? NOISE_RE.test(title) : false)

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
          if (isNoise(img?.url ?? url, img?.title)) continue
          seen.add(url)
          candidates.push({
            url,
            source_url: img?.url || url,
            source_title: img?.title,
            origin: 'Pesquisa web',
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

    const uniqueCandidates = dedupeByQuality(candidates)

    return new Response(
      JSON.stringify({
        success: true,
        candidates: uniqueCandidates.slice(0, 24),
        query: searchQuery,
        warning:
          uniqueCandidates.length === 0 ? 'Sem imagens encontradas para esta pesquisa' : undefined,
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

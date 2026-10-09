import { firecrawl } from '../_shared/firecrawl-client.ts'
import {
  beginSearch, getSearchContext, prospectingCorsHeaders, searchJson,
  settleSearch, type SearchContext,
} from '../_shared/prospectingSearchGuard.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: prospectingCorsHeaders })
  }
  if (req.method !== 'POST') {
    return searchJson({ success: false, error: 'Método não permitido' }, 405)
  }

  let context: SearchContext | undefined
  let operationId: string | undefined
  let settled = false

  try {
    const body = await req.json()
    const query = body.query
    const workspaceId = body.workspace_id
    const purpose = body.purpose
    const moduleSlug = body.module_slug
    const limit = body.limit ?? body.options?.limit ?? 10
    const country = body.country ?? body.options?.country ?? 'pt'
    const lang = body.lang ?? body.options?.lang ?? 'pt'
    const includeContent = body.include_content ?? false

    if (typeof query !== 'string' || !query.trim() || query.length > 200 ||
        !['prospecting', 'general'].includes(purpose) ||
        (purpose === 'general' && !['online-store', 'marketplace-c2c'].includes(moduleSlug)) ||
        (purpose === 'prospecting' && moduleSlug !== undefined) ||
        !Number.isInteger(limit) || limit < 1 || limit > (purpose === 'general' ? 10 : 20) ||
        typeof country !== 'string' || country.length > 8 ||
        typeof lang !== 'string' || lang.length > 8 ||
        typeof includeContent !== 'boolean' || body.campaign_id) {
      // The old optional campaign write targeted a table absent from this
      // project. Reject it rather than falsely reporting persisted results.
      return searchJson({ success: false, error: 'Parâmetros de pesquisa inválidos' }, 400)
    }

    const auth = await getSearchContext(req, workspaceId)
    if (auth.error) return auth.error
    context = auth.context!

    if (!Deno.env.get('FIRECRAWL_API_KEY')) {
      return searchJson({ success: false, error: 'Firecrawl não configurado' }, 503)
    }

    if (purpose === 'prospecting') {
      const started = await beginSearch(context, 'prospecting_web_search', body.request_id)
      if (started.error) return started.error
      if (started.reservation?.status === 'completed') {
        return searchJson(started.reservation.response)
      }
      operationId = started.reservation?.operation_id
      if (!operationId) return searchJson({ success: false, error: 'Reserva de créditos inválida' }, 503)
    } else {
      const { data, error } = await context.userClient.rpc('claim_firecrawl_general_search', {
        p_workspace_id: workspaceId,
        p_module_slug: moduleSlug,
      })
      if (error) {
        console.error('General Firecrawl quota error', error)
        return searchJson({ success: false, error: 'Pesquisa indisponível' }, 503)
      }
      if (!data?.success) return searchJson(data, data?.code === 'quota_exceeded' ? 429 : 403)
    }

    // Only markdown is used by current callers. Do not accept provider options
    // that can request expensive formats or arbitrary external operations.
    const searchResult = await firecrawl.search(query.trim(), {
      limit,
      lang,
      country,
      scrapeOptions: includeContent || body.options?.scrapeOptions
        ? { formats: ['markdown'] }
        : undefined,
    })

    if (!searchResult.success || !Array.isArray(searchResult.data)) {
      return searchJson({ success: false, error: searchResult.error ?? 'Pesquisa externa indisponível' }, 502)
    }

    const results = searchResult.data.map((item) => ({
      url: String(item.url ?? '').slice(0, 2048),
      title: String(item.title ?? '').slice(0, 500),
      description: String(item.description ?? '').slice(0, 2000),
      markdown: item.markdown ? String(item.markdown).slice(0, 20000) : undefined,
    }))
    const response = {
      success: true,
      data: results,
      results: results.map((item) => ({
        url: item.url,
        title: item.title,
        description: item.description,
        has_content: !!item.markdown,
        content_preview: item.markdown?.slice(0, 300),
      })),
      total: results.length,
      query: query.trim(),
    }

    if (operationId) {
      settled = await settleSearch(context, operationId, true, response)
      if (!settled) return searchJson({ success: false, error: 'Não foi possível confirmar a pesquisa' }, 503)
    }
    return searchJson(response)
  } catch (error) {
    console.error('Firecrawl search failed', error)
    return searchJson({ success: false, error: 'Pesquisa indisponível' }, 502)
  } finally {
    if (context && operationId && !settled) {
      await settleSearch(context, operationId, false)
    }
  }
})

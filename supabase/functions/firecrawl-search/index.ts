import { createClient } from 'npm:@supabase/supabase-js@2'
import { firecrawl } from '../_shared/firecrawl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Support both legacy format { query, options } and new format { query, workspace_id, ... }
    const query = body.query
    const workspace_id = body.workspace_id
    const limit = body.limit ?? body.options?.limit ?? 10
    const country = body.country ?? body.options?.country ?? 'pt'
    const lang = body.options?.lang ?? 'pt'
    const include_content = body.include_content ?? false
    const campaign_id = body.campaign_id
    const tbs = body.options?.tbs
    const scrapeOptions = body.options?.scrapeOptions

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Searching:', query)

    const searchResult = await firecrawl.search(query, {
      limit,
      lang,
      country,
      scrapeOptions: include_content ? { formats: ['markdown'] } : scrapeOptions,
    })

    if (!searchResult.success || !searchResult.data) {
      return new Response(
        JSON.stringify({ success: false, error: searchResult.error ?? 'No results found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = searchResult.data

    // Save to prospecting_results if campaign provided
    if (campaign_id && workspace_id && results.length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const rows = results.map(r => ({
        workspace_id,
        campaign_id,
        source: 'firecrawl_search',
        url: r.url,
        name: r.title,
        description: r.description,
        raw_content: r.markdown ?? null,
        search_query: query,
        status: 'new',
      }))

      await supabase.from('prospecting_results').upsert(rows, {
        onConflict: 'workspace_id,url',
        ignoreDuplicates: true,
      }).catch(console.error)
    }

    console.log('Search successful, results:', results.length)

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        results: results.map(r => ({
          url: r.url,
          title: r.title,
          description: r.description,
          has_content: !!r.markdown,
          content_preview: r.markdown?.slice(0, 300),
        })),
        total: results.length,
        query,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error searching:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

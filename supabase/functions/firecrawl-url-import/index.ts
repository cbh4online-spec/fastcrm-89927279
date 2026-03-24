import { createClient } from 'npm:@supabase/supabase-js@2'
import { firecrawl } from '../_shared/firecrawl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const {
      url,
      knowledge_base_id,
      workspace_id,
      crawl_subpages = false,
      max_pages = 5,
    } = await req.json()

    if (!url || !knowledge_base_id) throw new Error('url and knowledge_base_id are required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let documentsToInsert: Array<{
      knowledge_base_id: string
      workspace_id: string
      name: string
      source_url: string
      raw_text: string
      status: string
      file_type: string
    }> = []

    if (!crawl_subpages) {
      const result = await firecrawl.scrape(url, {
        formats: ['markdown'],
        onlyMainContent: true,
      })

      if (!result.success || !result.data?.markdown) {
        throw new Error('Failed to scrape URL — page may be inaccessible')
      }

      documentsToInsert.push({
        knowledge_base_id,
        workspace_id,
        name: result.data.metadata?.title ?? url,
        source_url: url,
        raw_text: result.data.markdown,
        status: 'pending',
        file_type: 'url',
      })
    } else {
      const crawlJob = await firecrawl.crawlAsync(url, {
        limit: max_pages,
        maxDepth: 2,
      })

      let attempts = 0
      let crawlResult = await firecrawl.getCrawlStatus(crawlJob.id)

      while (crawlResult.status !== 'completed' && attempts < 12) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        crawlResult = await firecrawl.getCrawlStatus(crawlJob.id)
        attempts++
      }

      if (crawlResult.status !== 'completed' || !crawlResult.data) {
        throw new Error(`Crawl timed out or failed. Status: ${crawlResult.status}`)
      }

      documentsToInsert = crawlResult.data
        .filter(page => page.markdown && page.markdown.length > 100)
        .map(page => ({
          knowledge_base_id,
          workspace_id,
          name: (page.metadata?.title as string) ?? url,
          source_url: (page.metadata?.sourceURL as string) ?? url,
          raw_text: page.markdown,
          status: 'pending',
          file_type: 'url',
        }))
    }

    if (documentsToInsert.length === 0) {
      throw new Error('No usable content found at the provided URL(s)')
    }

    const { data: inserted, error } = await supabase
      .from('knowledge_documents')
      .insert(documentsToInsert)
      .select('id')

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        imported_count: documentsToInsert.length,
        document_ids: inserted?.map(d => d.id),
        mode: crawl_subpages ? 'crawl' : 'scrape',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error importing URL:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

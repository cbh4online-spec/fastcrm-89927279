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
      competitor_id,
      workspace_id,
      url,
      track_pages = ['/', '/pricing', '/features', '/about'],
    } = await req.json()

    if (!competitor_id || !url) throw new Error('competitor_id and url are required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).origin
    const changes: Array<{ page: string; change_type: string; summary: string }> = []

    for (const page of track_pages.slice(0, 5)) {
      const pageUrl = `${domain}${page}`

      try {
        const result = await firecrawl.scrape(pageUrl, {
          formats: ['markdown'],
          onlyMainContent: true,
        })

        if (!result.success || !result.data?.markdown) continue

        const newContent = result.data.markdown
        const contentHash = await hashContent(newContent)

        // Get previous snapshot
        const { data: prevSnapshot } = await supabase
          .from('competitor_snapshots')
          .select('content_hash, content_preview')
          .eq('competitor_id', competitor_id)
          .eq('page_path', page)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const hasChanged = prevSnapshot ? prevSnapshot.content_hash !== contentHash : false

        // Save new snapshot
        await supabase.from('competitor_snapshots').insert({
          competitor_id,
          workspace_id,
          page_path: page,
          page_url: pageUrl,
          content_hash: contentHash,
          content_preview: newContent.slice(0, 1000),
          has_changed: hasChanged,
        })

        if (hasChanged && prevSnapshot) {
          changes.push({
            page: pageUrl,
            change_type: 'content_updated',
            summary: `Conteúdo alterado em ${page}`,
          })
        }
      } catch (e) {
        console.warn(`Failed to scrape ${pageUrl}:`, (e as Error).message)
      }
    }

    // Update competitor record
    await supabase.from('competitors')
      .update({
        last_scraped_at: new Date().toISOString(),
        ...(changes.length > 0 ? {
          last_change_detected_at: new Date().toISOString(),
          changes_count: changes.length,
        } : {}),
      })
      .eq('id', competitor_id)
      .eq('workspace_id', workspace_id)

    // Create notification if changes detected
    if (changes.length > 0) {
      await supabase.from('admin_notifications').insert({
        workspace_id,
        type: 'competitor_change',
        title: `${changes.length} alteração(ões) detectada(s)`,
        message: `Detectámos alterações no concorrente em ${changes.map(c => c.page).join(', ')}`,
        metadata: { competitor_id, changes },
        is_read: false,
      }).catch(console.error)
    }

    return new Response(
      JSON.stringify({ success: true, changes_detected: changes.length, changes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error tracking competitor:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content.slice(0, 5000))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

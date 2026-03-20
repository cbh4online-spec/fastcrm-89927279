import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, delimiter, encoding, max_rows } = await req.json()
    if (!url) throw new Error('url is required')

    const maxRows = max_rows ?? 500

    // Download CSV from URL with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    let response: Response
    try {
      response = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
    }

    // Read as bytes and decode with proper encoding
    const bytes = new Uint8Array(await response.arrayBuffer())
    const enc = encoding || 'utf-8'
    let text: string
    try {
      text = new TextDecoder(enc).decode(bytes)
    } catch {
      // Fallback to utf-8
      text = new TextDecoder('utf-8').decode(bytes)
    }

    // Split lines
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length === 0) {
      return new Response(
        JSON.stringify({ success: true, headers: [], rows: [], total_rows: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auto-detect delimiter if not provided
    let delim = delimiter
    if (!delim) {
      const firstLine = lines[0]
      const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 }
      for (const ch of firstLine) {
        if (ch in counts) counts[ch]++
      }
      let best = ';'
      let max = 0
      for (const [d, c] of Object.entries(counts)) {
        if (c > max) { max = c; best = d }
      }
      delim = max > 0 ? best : ';'
    }

    // Parse headers
    const headers = lines[0]
      .split(delim)
      .map(h => h.trim().replace(/^["']|["']$/g, ''))

    // Parse data rows (up to maxRows)
    const dataLines = lines.slice(1, 1 + maxRows)
    const rows: string[][] = []
    for (const line of dataLines) {
      const cells = line.split(delim).map(c => c.trim().replace(/^["']|["']$/g, ''))
      rows.push(cells)
    }

    const totalRows = lines.length - 1

    return new Response(
      JSON.stringify({
        success: true,
        headers,
        rows,
        total_rows: totalRows,
        delimiter: delim,
        encoding: enc,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

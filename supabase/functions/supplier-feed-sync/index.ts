import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth guard
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userId = claims.claims.sub as string

    const body = await req.json()
    const { feed_id, preview_only } = body

    if (!feed_id) throw new Error('feed_id is required')

    // Fetch feed config
    const { data: feed, error: feedErr } = await supabase
      .from('supplier_feeds')
      .select('*')
      .eq('id', feed_id)
      .single()
    if (feedErr || !feed) throw new Error('Feed not found')

    // Verify workspace membership
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', feed.workspace_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!member) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    // Create log entry (unless preview)
    let logId: string | null = null
    if (!preview_only) {
      const { data: log } = await supabase
        .from('supplier_feed_logs')
        .insert({
          feed_id,
          workspace_id: feed.workspace_id,
          status: 'running',
        })
        .select('id')
        .single()
      logId = log?.id ?? null
    }

    try {
      // Download CSV
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)

      const csvRes = await fetch(feed.feed_url, { signal: controller.signal })
      clearTimeout(timeout)

      if (!csvRes.ok) throw new Error(`CSV download failed: ${csvRes.status}`)

      const rawBuffer = await csvRes.arrayBuffer()
      const encoding = (feed.csv_encoding || 'utf-8').toLowerCase()
      let csvText: string

      if (encoding === 'iso-8859-1' || encoding === 'latin1' || encoding === 'windows-1252') {
        csvText = new TextDecoder('iso-8859-1').decode(rawBuffer)
      } else {
        csvText = new TextDecoder('utf-8').decode(rawBuffer)
      }

      // Parse CSV
      const delimiter = feed.csv_delimiter || ';'
      const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim().length > 0)
      if (lines.length < 2) throw new Error('CSV has no data rows')

      const headers = parseCSVLine(lines[0], delimiter)

      // Preview mode: return first 5 rows + headers
      if (preview_only) {
        const sampleRows = lines.slice(1, 6).map((line: string) => {
          const values = parseCSVLine(line, delimiter)
          const row: Record<string, string> = {}
          headers.forEach((h: string, i: number) => { row[h] = values[i] || '' })
          return row
        })
        return new Response(
          JSON.stringify({ success: true, headers, sample_rows: sampleRows, total_rows: lines.length - 1 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Full sync: process all rows
      const mapping: Record<string, string> = feed.column_mapping || {}
      const useAiCategories = body.use_ai_categories === true
      let created = 0, updated = 0, skipped = 0, errors = 0

      const dataRows = lines.slice(1).map((line: string) => {
        const values = parseCSVLine(line, delimiter)
        const row: Record<string, string> = {}
        headers.forEach((h: string, i: number) => { row[h] = values[i] || '' })
        return row
      })

      // AI category suggestions (if enabled)
      let aiCategoryMap: Map<string, { category: string; subcategory: string }> | null = null
      if (useAiCategories && mapping.name) {
        aiCategoryMap = new Map()
        const allNames = dataRows.map(r => getMappedValue(r, mapping, 'name')).filter(Boolean)
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
        
        if (LOVABLE_API_KEY) {
          // Process in batches of 50
          for (let b = 0; b < allNames.length; b += 50) {
            const batch = allNames.slice(b, b + 50)
            try {
              const { data: cats } = await supabase
                .from('product_categories')
                .select('id, name, parent_id')
                .eq('workspace_id', feed.workspace_id)

              const categoryList = (cats || []).map((c: any) => {
                const parent = cats?.find((p: any) => p.id === c.parent_id)
                return parent ? `${parent.name} > ${c.name}` : c.name
              })

              const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash-lite',
                  messages: [
                    {
                      role: 'system',
                      content: `Classifica produtos em categorias. Categorias existentes: ${categoryList.join(', ') || 'nenhuma'}.
Responde APENAS JSON: [{"product_name":"...","category":"...","subcategory":"..."}]`
                    },
                    { role: 'user', content: batch.join('\n') }
                  ],
                  tools: [{
                    type: 'function',
                    function: {
                      name: 'classify',
                      description: 'Classify products',
                      parameters: {
                        type: 'object',
                        properties: {
                          items: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                product_name: { type: 'string' },
                                category: { type: 'string' },
                                subcategory: { type: 'string' }
                              },
                              required: ['product_name', 'category', 'subcategory'],
                              additionalProperties: false
                            }
                          }
                        },
                        required: ['items'],
                        additionalProperties: false
                      }
                    }
                  }],
                  tool_choice: { type: 'function', function: { name: 'classify' } },
                }),
              })

              if (aiRes.ok) {
                const aiData = await aiRes.json()
                const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0]
                if (toolCall?.function?.arguments) {
                  const parsed = JSON.parse(toolCall.function.arguments)
                  for (const item of parsed.items || []) {
                    aiCategoryMap!.set(item.product_name, {
                      category: item.category,
                      subcategory: item.subcategory,
                    })
                  }
                }
              }
            } catch {
              // AI failure: continue without AI categories
              console.error('AI category suggestion failed for batch, continuing without AI')
            }
          }
        }
      }

      // Process in batches of 100
      for (let i = 0; i < dataRows.length; i += 100) {
        const batch = dataRows.slice(i, i + 100)

        for (const row of batch) {
          try {
            const sku = getMappedValue(row, mapping, 'sku')
            if (!sku) { skipped++; continue }

            const name = getMappedValue(row, mapping, 'name') || sku
            const price = parseFloat(getMappedValue(row, mapping, 'price') || '0')
            let category = getMappedValue(row, mapping, 'category') || null
            let subcategory = getMappedValue(row, mapping, 'subcategory') || null
            
            // Override with AI suggestions if available
            if (aiCategoryMap && name) {
              const aiSug = aiCategoryMap.get(name)
              if (aiSug) {
                category = aiSug.category
                subcategory = aiSug.subcategory
              }
            }
            
            const brand = getMappedValue(row, mapping, 'brand') || null
            const description = getMappedValue(row, mapping, 'description') || null
            const barcode = getMappedValue(row, mapping, 'barcode') || null
            const imageUrl = getMappedValue(row, mapping, 'image_url') || null
            const stock = parseInt(getMappedValue(row, mapping, 'stock') || '0') || 0

            // Check if product exists by SKU
            const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('workspace_id', feed.workspace_id)
              .eq('sku', sku)
              .maybeSingle()

            if (existingProduct) {
              // Update existing product price/stock
              await supabase
                .from('products')
                .update({
                  base_price: price || undefined,
                  stock_quantity: stock || undefined,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingProduct.id)

              // Upsert supplier_products link
              if (feed.supplier_id) {
                await supabase
                  .from('supplier_products')
                  .upsert({
                    workspace_id: feed.workspace_id,
                    supplier_id: feed.supplier_id,
                    product_id: existingProduct.id,
                    supplier_sku: sku,
                    unit_price: price,
                    barcode,
                    category,
                    last_price_date: new Date().toISOString(),
                    price_source: 'feed',
                  }, { onConflict: 'supplier_id,product_id' })
              }

              updated++
            } else {
              // Create new product as draft
              const { data: newProduct } = await supabase
                .from('products')
                .insert({
                  workspace_id: feed.workspace_id,
                  name,
                  sku,
                  base_price: price,
                  category,
                  short_description: description,
                  status: 'draft',
                  stock_quantity: stock,
                  images: imageUrl ? [imageUrl] : [],
                })
                .select('id')
                .single()

              // Create supplier_products link
              if (newProduct && feed.supplier_id) {
                await supabase
                  .from('supplier_products')
                  .insert({
                    workspace_id: feed.workspace_id,
                    supplier_id: feed.supplier_id,
                    product_id: newProduct.id,
                    supplier_sku: sku,
                    unit_price: price,
                    barcode,
                    category,
                    last_price_date: new Date().toISOString(),
                    price_source: 'feed',
                  })
              }

              created++
            }
          } catch {
            errors++
          }
        }
      }

      // Update log
      if (logId) {
        await supabase
          .from('supplier_feed_logs')
          .update({
            status: 'completed',
            total_rows: dataRows.length,
            created_count: created,
            updated_count: updated,
            skipped_count: skipped,
            error_count: errors,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logId)
      }

      // Update feed status
      await supabase
        .from('supplier_feeds')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'completed',
          last_sync_rows: dataRows.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feed_id)

      const summary = { total: dataRows.length, created, updated, skipped, errors }
      return new Response(
        JSON.stringify({ success: true, summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (syncError) {
      // Update log with error
      if (logId) {
        await supabase
          .from('supplier_feed_logs')
          .update({
            status: 'failed',
            error_message: (syncError as Error).message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logId)
      }

      await supabase
        .from('supplier_feeds')
        .update({
          last_sync_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', feed_id)

      throw syncError
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function getMappedValue(
  row: Record<string, string>,
  mapping: Record<string, string>,
  field: string
): string {
  const csvColumn = mapping[field]
  if (!csvColumn) return ''
  return row[csvColumn] || ''
}

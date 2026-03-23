import { logAIUsage } from '../_shared/ai-instrumentation.ts';
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
      const defaultMarkupPct = feed.default_markup_pct ?? 30
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
            const sku = stripHtml(getMappedValue(row, mapping, 'sku'))
            if (!sku) { skipped++; continue }

            // Validate SKU - skip HTML/descriptive values
            if (isInvalidSKU(sku)) { skipped++; continue }

            const rawName = getMappedValue(row, mapping, 'name') || sku
            const name = stripHtml(rawName)
            const costPrice = parsePrice(getMappedValue(row, mapping, 'cost_price'))
            const salePrice = parsePrice(getMappedValue(row, mapping, 'sale_price'))
            // Legacy: if only "price" mapped (old feeds), treat as sale price
            const legacyPrice = parsePrice(getMappedValue(row, mapping, 'price'))
            
            // Compute final sale price: PVP > legacy price > cost + markup
            const finalSalePrice = salePrice || legacyPrice || (costPrice && defaultMarkupPct > 0
              ? costPrice * (1 + defaultMarkupPct / 100)
              : null)
            const finalCost = costPrice || null

            let category = stripHtml(getMappedValue(row, mapping, 'category')) || null
            let subcategory = stripHtml(getMappedValue(row, mapping, 'subcategory')) || null
            
            // Override with AI suggestions if available
            if (aiCategoryMap && name) {
              const aiSug = aiCategoryMap.get(rawName) || aiCategoryMap.get(name)
              if (aiSug) {
                category = aiSug.category
                subcategory = aiSug.subcategory
              }
            }
            
            const brand = stripHtml(getMappedValue(row, mapping, 'brand')) || null
            const description = stripHtml(getMappedValue(row, mapping, 'description')) || null
            const longDescription = stripHtml(getMappedValue(row, mapping, 'long_description')) || null
            const barcode = getMappedValue(row, mapping, 'barcode') || getMappedValue(row, mapping, 'ean') || null
            const imageUrl = getMappedValue(row, mapping, 'image_url')?.trim() || null
            const stock = parseInt(getMappedValue(row, mapping, 'stock') || '0') || 0
            const weight = getMappedValue(row, mapping, 'weight') || null
            const warranty = getMappedValue(row, mapping, 'warranty') || null
            const datasheetUrl = getMappedValue(row, mapping, 'datasheet_url')?.trim() || null

            // Check if product exists by SKU
            const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('workspace_id', feed.workspace_id)
              .eq('sku', sku)
              .maybeSingle()

            if (existingProduct) {
              // Update existing product
              const updatePayload: Record<string, any> = {
                updated_at: new Date().toISOString(),
              }
              if (finalSalePrice) updatePayload.base_price = finalSalePrice
              if (finalCost) updatePayload.direct_cost = finalCost
              if (stock) updatePayload.stock_quantity = stock
              if (brand) updatePayload.brand = brand
              
              await supabase
                .from('products')
                .update(updatePayload)
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
                    unit_price: finalCost || finalSalePrice,
                    barcode,
                    category,
                    last_price_date: new Date().toISOString(),
                    price_source: 'feed',
                  }, { onConflict: 'supplier_id,product_id' })
              }

              // Upsert image if provided
              if (imageUrl) {
                await supabase
                  .from('product_images')
                  .upsert({
                    product_id: existingProduct.id,
                    workspace_id: feed.workspace_id,
                    url: imageUrl,
                    position: 0,
                    source: feed.feed_name || 'feed',
                  }, { onConflict: 'product_id,url' })
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
                  base_price: finalSalePrice || 0,
                  direct_cost: finalCost,
                  category,
                  subcategory,
                  brand,
                  short_description: description,
                  commercial_description: longDescription,
                  status: 'draft',
                  stock_quantity: stock,
                  images: imageUrl ? [imageUrl] : [],
                })
                .select('id')
                .single()

              if (newProduct) {
                // Create supplier_products link
                if (feed.supplier_id) {
                  await supabase
                    .from('supplier_products')
                    .insert({
                      workspace_id: feed.workspace_id,
                      supplier_id: feed.supplier_id,
                      product_id: newProduct.id,
                      supplier_sku: sku,
                      unit_price: finalCost || finalSalePrice,
                      barcode,
                      category,
                      last_price_date: new Date().toISOString(),
                      price_source: 'feed',
                    })
                }

                // Create product_images record
                if (imageUrl) {
                  await supabase
                    .from('product_images')
                    .insert({
                      product_id: newProduct.id,
                      workspace_id: feed.workspace_id,
                      url: imageUrl,
                      position: 0,
                      source: feed.feed_name || 'feed',
                    })
                }
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

// ─── Helpers ────────────────────────────────────────────────────────

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

function parsePrice(value?: string): number | null {
  if (!value) return null
  const cleaned = value.replace(/[^\d,.]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) || num <= 0 ? null : num
}

/** Strip HTML tags from a string, returning plain text */
function stripHtml(value: string): string {
  if (!value || !value.includes('<')) return value
  // Remove HTML tags, decode entities, normalize whitespace
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|li|tr|td|th|ul|ol|table|thead|tbody|h[1-6])[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Check if a SKU value looks like HTML/descriptive text rather than a valid SKU */
function isInvalidSKU(sku: string): boolean {
  // Contains HTML tags
  if (/<[^>]+>/.test(sku)) return true
  // Too long for a SKU (likely descriptive text)
  if (sku.length > 80) return true
  // Contains too many spaces (likely descriptive)
  if ((sku.match(/\s/g) || []).length > 3) return true
  return false
}

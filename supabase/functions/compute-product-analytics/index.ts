import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { workspace_id, product_id, days_inactive = 90 } = await req.json()

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id obrigatório' }), { status: 400, headers: corsHeaders })
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: corsHeaders })
    }

    // If product_id provided, return single product analytics
    if (product_id) {
      const analytics = await computeSingleProductAnalytics(supabase, workspace_id, product_id)
      return new Response(JSON.stringify(analytics), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Otherwise, compute workspace-wide analytics
    const [
      topInProposals,
      conversionRates,
      avgMargins,
      priceTrends,
      inactiveProducts,
      topByCategory,
    ] = await Promise.all([
      getTopProductsInProposals(supabase, workspace_id),
      getConversionRates(supabase, workspace_id),
      getAverageMargins(supabase, workspace_id),
      getPriceTrends(supabase, workspace_id),
      getInactiveProducts(supabase, workspace_id, days_inactive),
      getTopByCategory(supabase, workspace_id),
    ])

    return new Response(JSON.stringify({
      top_in_proposals: topInProposals,
      conversion_rates: conversionRates,
      avg_margins: avgMargins,
      price_trends: priceTrends,
      inactive_products: inactiveProducts,
      top_by_category: topByCategory,
      computed_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})

// ── Top produtos em propostas ──────────────────────────────────────────────
async function getTopProductsInProposals(supabase: any, workspaceId: string) {
  const { data } = await supabase
    .from('proposal_items')
    .select('product_id, name, quantity, unit_price')
    .eq('workspace_id', workspaceId)
    .not('product_id', 'is', null)
    .eq('is_enabled', true)

  if (!data?.length) return []

  const counts: Record<string, { name: string; count: number; total_value: number; total_qty: number }> = {}
  for (const item of data) {
    if (!item.product_id) continue
    if (!counts[item.product_id]) {
      counts[item.product_id] = { name: item.name, count: 0, total_value: 0, total_qty: 0 }
    }
    counts[item.product_id].count++
    counts[item.product_id].total_value += (item.unit_price * item.quantity)
    counts[item.product_id].total_qty += item.quantity
  }

  return Object.entries(counts)
    .map(([product_id, stats]) => ({ product_id, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

// ── Taxa de conversão por produto ──────────────────────────────────────────
async function getConversionRates(supabase: any, workspaceId: string) {
  // Get products in proposals
  const { data: proposalData } = await supabase
    .from('proposal_items')
    .select('product_id, name, proposal_id')
    .eq('workspace_id', workspaceId)
    .not('product_id', 'is', null)
    .eq('is_enabled', true)

  if (!proposalData?.length) return []

  // Count proposals per product
  const proposalCounts: Record<string, { name: string; proposals: Set<string> }> = {}
  for (const item of proposalData) {
    if (!item.product_id) continue
    if (!proposalCounts[item.product_id]) {
      proposalCounts[item.product_id] = { name: item.name, proposals: new Set() }
    }
    proposalCounts[item.product_id].proposals.add(item.proposal_id)
  }

  // Get products in invoices (converted)
  const { data: invoiceData } = await supabase
    .from('invoice_items')
    .select('product_id, invoice_id')
    .not('product_id', 'is', null)

  const invoiceCounts: Record<string, Set<string>> = {}
  for (const item of invoiceData ?? []) {
    if (!item.product_id) continue
    if (!invoiceCounts[item.product_id]) invoiceCounts[item.product_id] = new Set()
    invoiceCounts[item.product_id].add(item.invoice_id)
  }

  return Object.entries(proposalCounts)
    .map(([product_id, info]) => {
      const proposalCount = info.proposals.size
      const invoiceCount = invoiceCounts[product_id]?.size ?? 0
      return {
        product_id,
        name: info.name,
        proposals_count: proposalCount,
        invoices_count: invoiceCount,
        conversion_rate: proposalCount > 0 ? Math.round((invoiceCount / proposalCount) * 100) : 0,
      }
    })
    .sort((a, b) => b.proposals_count - a.proposals_count)
    .slice(0, 20)
}

// ── Margem média realizada ─────────────────────────────────────────────────
async function getAverageMargins(supabase: any, workspaceId: string) {
  // Get products with cost data
  const { data: products } = await supabase
    .from('products')
    .select('id, name, base_price, direct_cost, category')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .not('direct_cost', 'is', null)

  if (!products?.length) return []

  // Get actual invoice prices
  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('product_id, unit_price, quantity')
    .not('product_id', 'is', null)

  const avgSellPrices: Record<string, { totalPrice: number; totalQty: number }> = {}
  for (const item of invoiceItems ?? []) {
    if (!item.product_id) continue
    if (!avgSellPrices[item.product_id]) avgSellPrices[item.product_id] = { totalPrice: 0, totalQty: 0 }
    avgSellPrices[item.product_id].totalPrice += item.unit_price * item.quantity
    avgSellPrices[item.product_id].totalQty += item.quantity
  }

  return products
    .map((p: any) => {
      const sold = avgSellPrices[p.id]
      const avgPrice = sold && sold.totalQty > 0 ? sold.totalPrice / sold.totalQty : p.base_price
      const cost = p.direct_cost ?? 0
      const margin = avgPrice > 0 ? ((avgPrice - cost) / avgPrice) * 100 : 0
      return {
        product_id: p.id,
        name: p.name,
        category: p.category,
        cost,
        avg_sell_price: Math.round(avgPrice * 100) / 100,
        base_price: p.base_price,
        margin_pct: Math.round(margin * 10) / 10,
        units_sold: sold?.totalQty ?? 0,
      }
    })
    .sort((a: any, b: any) => b.margin_pct - a.margin_pct)
    .slice(0, 30)
}

// ── Tendência de preço ─────────────────────────────────────────────────────
async function getPriceTrends(supabase: any, workspaceId: string) {
  // Get invoice items with dates for top products
  const { data: items } = await supabase
    .from('invoice_items')
    .select('product_id, unit_price, quantity, created_at')
    .not('product_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1000)

  if (!items?.length) return []

  // Group by product and month
  const trends: Record<string, { name: string; months: Record<string, { avgPrice: number; count: number }> }> = {}
  
  for (const item of items) {
    if (!item.product_id) continue
    const month = item.created_at.substring(0, 7) // YYYY-MM
    if (!trends[item.product_id]) trends[item.product_id] = { name: '', months: {} }
    if (!trends[item.product_id].months[month]) {
      trends[item.product_id].months[month] = { avgPrice: 0, count: 0 }
    }
    const m = trends[item.product_id].months[month]
    m.avgPrice = (m.avgPrice * m.count + item.unit_price) / (m.count + 1)
    m.count++
  }

  // Get product names
  const productIds = Object.keys(trends).slice(0, 10)
  if (!productIds.length) return []

  const { data: products } = await supabase
    .from('products')
    .select('id, name, direct_cost')
    .in('id', productIds)

  const nameMap = new Map((products ?? []).map((p: any) => [p.id, { name: p.name, cost: p.direct_cost }]))

  return productIds.map(pid => {
    const info = nameMap.get(pid)
    const monthData = Object.entries(trends[pid].months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        avg_price: Math.round(data.avgPrice * 100) / 100,
        volume: data.count,
      }))

    return {
      product_id: pid,
      name: info?.name ?? 'Desconhecido',
      cost: info?.cost ?? 0,
      trend: monthData,
    }
  })
}

// ── Produtos sem movimento ─────────────────────────────────────────────────
async function getInactiveProducts(supabase: any, workspaceId: string, daysThreshold: number) {
  const cutoffDate = new Date(Date.now() - daysThreshold * 86400000).toISOString()

  // Get all active products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, category, base_price, stock_quantity, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  if (!products?.length) return []

  // Get latest movement per product
  const { data: movements } = await supabase
    .from('product_stock_movements')
    .select('product_id, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  const latestMovement: Record<string, string> = {}
  for (const m of movements ?? []) {
    if (!latestMovement[m.product_id]) latestMovement[m.product_id] = m.created_at
  }

  // Get latest proposal inclusion
  const { data: proposalItems } = await supabase
    .from('proposal_items')
    .select('product_id, created_at')
    .eq('workspace_id', workspaceId)
    .not('product_id', 'is', null)
    .order('created_at', { ascending: false })

  const latestProposal: Record<string, string> = {}
  for (const p of proposalItems ?? []) {
    if (p.product_id && !latestProposal[p.product_id]) latestProposal[p.product_id] = p.created_at
  }

  return products
    .map((p: any) => {
      const lastMove = latestMovement[p.id]
      const lastProp = latestProposal[p.id]
      const lastActivity = [lastMove, lastProp, p.updated_at].filter(Boolean).sort().reverse()[0]
      return {
        product_id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        base_price: p.base_price,
        stock_quantity: p.stock_quantity ?? 0,
        last_activity: lastActivity,
        days_inactive: Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000),
      }
    })
    .filter((p: any) => p.last_activity < cutoffDate)
    .sort((a: any, b: any) => b.days_inactive - a.days_inactive)
}

// ── Top por categoria ──────────────────────────────────────────────────────
async function getTopByCategory(supabase: any, workspaceId: string) {
  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('product_id, unit_price, quantity')
    .not('product_id', 'is', null)

  if (!invoiceItems?.length) return []

  // Aggregate revenue per product
  const productRevenue: Record<string, number> = {}
  for (const item of invoiceItems) {
    if (!item.product_id) continue
    productRevenue[item.product_id] = (productRevenue[item.product_id] ?? 0) + (item.unit_price * item.quantity)
  }

  // Get product details
  const productIds = Object.keys(productRevenue)
  if (!productIds.length) return []

  const { data: products } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('workspace_id', workspaceId)
    .in('id', productIds)

  // Group by category
  const categories: Record<string, { products: { id: string; name: string; revenue: number }[]; total: number }> = {}
  for (const p of products ?? []) {
    const cat = p.category ?? 'Sem Categoria'
    if (!categories[cat]) categories[cat] = { products: [], total: 0 }
    const rev = productRevenue[p.id] ?? 0
    categories[cat].products.push({ id: p.id, name: p.name, revenue: Math.round(rev * 100) / 100 })
    categories[cat].total += rev
  }

  // Sort products within categories, sort categories by total
  return Object.entries(categories)
    .map(([category, data]) => ({
      category,
      total_revenue: Math.round(data.total * 100) / 100,
      products: data.products.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
}

// ── Analytics de produto individual ────────────────────────────────────────
async function computeSingleProductAnalytics(supabase: any, workspaceId: string, productId: string) {
  const [product, proposalItems, invoiceItems, movements] = await Promise.all([
    supabase.from('products').select('id, name, base_price, direct_cost, category').eq('id', productId).single(),
    supabase.from('proposal_items').select('proposal_id, quantity, unit_price, created_at')
      .eq('workspace_id', workspaceId).eq('product_id', productId).eq('is_enabled', true),
    supabase.from('invoice_items').select('invoice_id, quantity, unit_price, created_at')
      .eq('product_id', productId),
    supabase.from('product_stock_movements').select('movement_type, quantity, created_at')
      .eq('workspace_id', workspaceId).eq('product_id', productId)
      .order('created_at', { ascending: true }),
  ])

  const p = product.data
  const proposals = proposalItems.data ?? []
  const invoices = invoiceItems.data ?? []
  const moves = movements.data ?? []

  const uniqueProposals = new Set(proposals.map((i: any) => i.proposal_id)).size
  const uniqueInvoices = new Set(invoices.map((i: any) => i.invoice_id)).size
  const totalQtySold = invoices.reduce((s: number, i: any) => s + i.quantity, 0)
  const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.unit_price * i.quantity), 0)
  const avgSellPrice = totalQtySold > 0 ? totalRevenue / totalQtySold : p?.base_price ?? 0
  const cost = p?.direct_cost ?? 0
  const margin = avgSellPrice > 0 ? ((avgSellPrice - cost) / avgSellPrice) * 100 : 0

  // Monthly trend
  const monthlyTrend: Record<string, { revenue: number; qty: number; proposals: number }> = {}
  for (const inv of invoices) {
    const m = inv.created_at.substring(0, 7)
    if (!monthlyTrend[m]) monthlyTrend[m] = { revenue: 0, qty: 0, proposals: 0 }
    monthlyTrend[m].revenue += inv.unit_price * inv.quantity
    monthlyTrend[m].qty += inv.quantity
  }
  for (const prop of proposals) {
    const m = prop.created_at.substring(0, 7)
    if (!monthlyTrend[m]) monthlyTrend[m] = { revenue: 0, qty: 0, proposals: 0 }
    monthlyTrend[m].proposals++
  }

  return {
    product_id: productId,
    name: p?.name,
    category: p?.category,
    proposals_count: uniqueProposals,
    invoices_count: uniqueInvoices,
    conversion_rate: uniqueProposals > 0 ? Math.round((uniqueInvoices / uniqueProposals) * 100) : 0,
    total_qty_sold: totalQtySold,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    avg_sell_price: Math.round(avgSellPrice * 100) / 100,
    cost,
    margin_pct: Math.round(margin * 10) / 10,
    stock_movements_count: moves.length,
    monthly_trend: Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data })),
  }
}

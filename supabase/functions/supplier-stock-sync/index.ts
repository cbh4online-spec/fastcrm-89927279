// FastCRM — Leitura da disponibilidade nas páginas dos fornecedores.
//
// Segurança (fail-closed):
// - Chamada interna: service role OU segredo do agendador (_cron_config).
// - Chamada de utilizador: JWT válido + membro owner/admin do workspace.
// - Sem evidência clara de stock na página, não inventa nada: registra o motivo.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { firecrawl } from '../_shared/firecrawl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

type Level = 'high' | 'low' | 'none'

interface Parsed {
  level: Level
  qty: number | null
  evidence: string
}

const OUT_PATTERNS = [
  /sem stock/i, /esgotado/i, /indispon[ií]vel/i, /out of stock/i, /sold out/i,
  /agotado/i, /sin stock/i, /n[ãa]o dispon[ií]vel/i, /sob (consulta|encomenda)/i,
]
const LOW_PATTERNS = [
  /[úu]ltimas? unidades?/i, /stock (reduzido|limitado|baixo)/i, /low stock/i,
  /poucas unidades/i, /reposi[çc][ãa]o/i, /pocas unidades/i,
]
const IN_PATTERNS = [
  /em stock/i, /dispon[ií]vel/i, /in stock/i, /entrega imediata/i, /con stock/i,
]

/** Extrai o nível de stock a partir do conteúdo da página do fornecedor. */
export function parseStock(text: string): Parsed {
  const t = text.slice(0, 20000)

  const qtyMatch =
    t.match(/(\d{1,5})\s*(?:unidades?|un\.?|uds?\.?|em stock|in stock|disponibles?)/i) ||
    t.match(/stock\s*[:\-]?\s*(\d{1,5})/i)
  const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : null

  for (const p of OUT_PATTERNS) {
    const m = t.match(p)
    if (m) return { level: 'none', qty: qty ?? 0, evidence: m[0] }
  }
  if (qty != null) {
    if (qty <= 0) return { level: 'none', qty, evidence: qtyMatch![0] }
    if (qty < 5) return { level: 'low', qty, evidence: qtyMatch![0] }
    return { level: 'high', qty, evidence: qtyMatch![0] }
  }
  for (const p of LOW_PATTERNS) {
    const m = t.match(p)
    if (m) return { level: 'low', qty: null, evidence: m[0] }
  }
  for (const p of IN_PATTERNS) {
    const m = t.match(p)
    if (m) return { level: 'high', qty: null, evidence: m[0] }
  }
  throw new Error('sem_evidencia_de_stock')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  try {
    const body = await req.json().catch(() => ({}))
    let workspaceId: string | undefined = body.workspace_id
    const supplierProductIds: string[] | undefined = body.supplier_product_ids
    const limit: number = Math.min(Number(body.limit) || 25, 100)
    const dryRun: boolean = body.dry_run === true

    // Autorização
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const cronSecret = req.headers.get('x-cron-secret')

    let isInternal = Boolean(token) && token === serviceKey
    if (!isInternal && cronSecret) {
      const { data: cfg } = await admin
        .from('_cron_config')
        .select('value')
        .eq('key', 'supplier_stock_sync_cron_secret')
        .maybeSingle()
      isInternal = Boolean(cfg?.value) && cfg!.value === cronSecret
    }

    if (!isInternal) {
      if (!token) return json({ error: 'nao_autenticado' }, 401)
      const { data: userData } = await admin.auth.getUser(token)
      const userId = userData?.user?.id
      if (!userId) return json({ error: 'nao_autenticado' }, 401)
      if (!workspaceId) return json({ error: 'workspace_id é obrigatório' }, 400)
      const { data: member } = await admin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle()
      if (!member || !['owner', 'admin'].includes(member.role)) {
        return json({ error: 'sem_permissao' }, 403)
      }
    }

    // Chamada interna sem workspace: percorre todos os workspaces com leitura ligada.
    let workspaceIds: string[]
    if (workspaceId) {
      workspaceIds = [workspaceId]
    } else {
      const { data: wsRows, error: wsErr } = await admin
        .from('supplier_products')
        .select('workspace_id')
        .eq('stock_sync_enabled', true)
        .not('product_url', 'is', null)
      if (wsErr) throw wsErr
      workspaceIds = Array.from(new Set((wsRows ?? []).map((r) => r.workspace_id as string)))
    }

    const results: Array<Record<string, unknown>> = []
    let checked = 0
    let updated = 0
    let failed = 0

    for (const wsId of workspaceIds) {
      let query = admin
        .from('supplier_products')
        .select('id, product_id, product_url, supplier_sku')
        .eq('workspace_id', wsId)
        .eq('stock_sync_enabled', true)
        .not('product_url', 'is', null)
        .order('stock_checked_at', { ascending: true, nullsFirst: true })
        .limit(limit)

      if (supplierProductIds?.length) query = query.in('id', supplierProductIds)

      const { data: rows, error } = await query
      if (error) throw error
      checked += rows?.length ?? 0

      for (const row of rows ?? []) {
        try {
          const scrape = await firecrawl.scrape(row.product_url as string, {
            formats: ['markdown'],
            onlyMainContent: true,
          })
          if (!scrape.success || !scrape.data?.markdown) throw new Error('pagina_nao_lida')

          const parsed = parseStock(scrape.data.markdown)

          if (!dryRun) {
            await admin
              .from('supplier_products')
              .update({
                reported_stock_level: parsed.level,
                reported_stock_qty: parsed.qty,
                stock_checked_at: new Date().toISOString(),
                stock_sync_error: null,
              })
              .eq('id', row.id)

            // Reflete no catálogo: sem stock no fornecedor → sob encomenda na loja
            const stockStatus =
              parsed.level === 'none' ? 'out_of_stock' : parsed.level === 'low' ? 'low_stock' : 'in_stock'
            await admin
              .from('products')
              .update({ stock_status: stockStatus })
              .eq('id', row.product_id)
              .eq('workspace_id', wsId)
          }

          updated++
          results.push({ id: row.id, level: parsed.level, qty: parsed.qty, evidence: parsed.evidence })
        } catch (e) {
          failed++
          const reason = e instanceof Error ? e.message : String(e)
          if (!dryRun) {
            await admin
              .from('supplier_products')
              .update({ stock_sync_error: reason, stock_checked_at: new Date().toISOString() })
              .eq('id', row.id)
          }
          results.push({ id: row.id, error: reason })
        }
        await new Promise((r) => setTimeout(r, 800))
      }
    }

    return json({ checked, updated, failed, dry_run: dryRun, workspaces: workspaceIds.length, results })
  } catch (e) {
    return json({ error: 'internal_error', reason: e instanceof Error ? e.message : String(e) })
  }
})

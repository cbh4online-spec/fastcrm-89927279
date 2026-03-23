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

    const body = await req.json()
    const {
      workspace_id,
      product_id,
      variant_id,
      location_id,
      movement_type, // in, out, adjustment, reserve, release, transfer, return
      quantity,
      reason,
      reference_type,
      reference_id,
      notes,
      unit_cost,
    } = body

    if (!workspace_id || !product_id || !movement_type || !quantity) {
      return new Response(JSON.stringify({ error: 'workspace_id, product_id, movement_type, quantity são obrigatórios' }), {
        status: 400, headers: corsHeaders
      })
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

    // Get current stock
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity, stock_reserved, track_stock')
      .eq('id', product_id)
      .eq('workspace_id', workspace_id)
      .single()

    if (!product) {
      return new Response(JSON.stringify({ error: 'Produto não encontrado' }), { status: 404, headers: corsHeaders })
    }

    const currentQty = product.stock_quantity ?? 0
    const currentReserved = product.stock_reserved ?? 0
    let newQty = currentQty
    let newReserved = currentReserved

    // Calculate new stock based on movement type
    switch (movement_type) {
      case 'in':
      case 'return':
        newQty = currentQty + Math.abs(quantity)
        break
      case 'out':
        newQty = Math.max(0, currentQty - Math.abs(quantity))
        break
      case 'adjustment':
        // quantity can be positive or negative for adjustments
        newQty = Math.max(0, currentQty + quantity)
        break
      case 'reserve':
        if (Math.abs(quantity) > (currentQty - currentReserved)) {
          return new Response(JSON.stringify({
            error: 'Stock insuficiente para reserva',
            available: currentQty - currentReserved
          }), { status: 400, headers: corsHeaders })
        }
        newReserved = currentReserved + Math.abs(quantity)
        break
      case 'release':
        newReserved = Math.max(0, currentReserved - Math.abs(quantity))
        break
      case 'transfer':
        // For transfers, we just record the movement (location changes)
        break
      default:
        return new Response(JSON.stringify({ error: 'Tipo de movimento inválido' }), { status: 400, headers: corsHeaders })
    }

    // Record movement
    const { data: movement, error: movErr } = await supabase
      .from('product_stock_movements')
      .insert({
        workspace_id,
        product_id,
        variant_id: variant_id || null,
        location_id: location_id || null,
        movement_type,
        quantity,
        reason: reason || 'manual_adjustment',
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        notes: notes || null,
        unit_cost: unit_cost || null,
        balance_after: newQty,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (movErr) {
      return new Response(JSON.stringify({ error: movErr.message }), { status: 500, headers: corsHeaders })
    }

    // Update product stock
    const { error: updateErr } = await supabase
      .from('products')
      .update({
        stock_quantity: newQty,
        stock_reserved: newReserved,
        track_stock: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product_id)
      .eq('workspace_id', workspace_id)

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders })
    }

    // Check low stock alert
    const lowStockThreshold = product.low_stock_threshold ?? 5
    const isLowStock = newQty > 0 && (newQty - newReserved) <= lowStockThreshold
    const isOutOfStock = newQty <= 0

    // Create notification if low stock
    if (isLowStock || isOutOfStock) {
      await supabase.from('admin_notifications').insert({
        workspace_id,
        type: isOutOfStock ? 'stock_out' : 'stock_low',
        title: isOutOfStock ? 'Produto sem stock' : 'Stock baixo',
        message: isOutOfStock
          ? `O produto está sem stock (0 unidades).`
          : `O produto tem apenas ${newQty - newReserved} unidades disponíveis (threshold: ${lowStockThreshold}).`,
        metadata: { product_id, stock_quantity: newQty, stock_reserved: newReserved, threshold: lowStockThreshold },
      }).then(() => {})
    }

    return new Response(JSON.stringify({
      success: true,
      movement_id: movement.id,
      stock: {
        quantity: newQty,
        reserved: newReserved,
        available: newQty - newReserved,
        is_low_stock: isLowStock,
        is_out_of_stock: isOutOfStock,
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders
    })
  }
})

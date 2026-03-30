import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-RECOVER] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { token, workspaceSlug } = await req.json();

    if (!token || !workspaceSlug) {
      return new Response(JSON.stringify({ error: 'Token e workspaceSlug obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Recovery attempt', { token: token.substring(0, 8) + '...', workspaceSlug });

    // Find abandoned cart by recovery_token
    const { data: cart, error: cartError } = await supabase
      .from('store_abandoned_carts')
      .select('*')
      .eq('recovery_token', token)
      .maybeSingle();

    if (cartError || !cart) {
      logStep('Cart not found', { token });
      return new Response(JSON.stringify({ error: 'Link de recuperação inválido' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate workspace via store_settings slug or direct workspace_id
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('workspace_id')
      .eq('store_slug', workspaceSlug)
      .maybeSingle();

    const resolvedWorkspaceId = storeSettings?.workspace_id || workspaceSlug;

    if (cart.workspace_id !== resolvedWorkspaceId) {
      logStep('Workspace mismatch', { cartWs: cart.workspace_id, resolved: resolvedWorkspaceId });
      return new Response(JSON.stringify({ error: 'Link de recuperação inválido' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiration
    if (cart.recovery_token_expires_at && new Date(cart.recovery_token_expires_at) < new Date()) {
      logStep('Token expired', { expiresAt: cart.recovery_token_expires_at });
      return new Response(JSON.stringify({ error: 'Link de recuperação expirado', expired: true }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already recovered
    if (cart.recovery_status === 'recovered') {
      logStep('Cart already recovered', { cartId: cart.id });
      return new Response(JSON.stringify({ error: 'Este carrinho já foi recuperado', already_recovered: true }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate products availability
    const items = (cart.items || []) as any[];
    const productIds = items.map((i: any) => i.productId).filter(Boolean);

    const { data: products } = await supabase
      .from('products')
      .select('id, name, base_price, status, stock_quantity, images, primary_image_index')
      .in('id', productIds)
      .eq('workspace_id', cart.workspace_id);

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));

    const validItems: any[] = [];
    const unavailableItems: any[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== 'active') {
        unavailableItems.push({ ...item, reason: 'unavailable' });
        continue;
      }
      if (product.stock_quantity !== null && product.stock_quantity !== undefined && product.stock_quantity < item.quantity) {
        if (product.stock_quantity <= 0) {
          unavailableItems.push({ ...item, reason: 'out_of_stock' });
          continue;
        }
        // Reduce quantity to available stock
        validItems.push({
          ...item,
          quantity: product.stock_quantity,
          price: product.base_price,
          name: product.name,
          image: ((product.images as any[]) || [])[product.primary_image_index ?? 0] || null,
          adjusted: true,
        });
        continue;
      }
      validItems.push({
        ...item,
        price: product.base_price,
        name: product.name,
        image: ((product.images as any[]) || [])[product.primary_image_index ?? 0] || null,
      });
    }

    // Record recovery_link_opened event
    await supabase.from('store_automation_events').insert({
      workspace_id: cart.workspace_id,
      event_type: 'recovery_link_opened',
      entity_type: 'abandoned_cart',
      entity_id: cart.id,
      payload: {
        token: token.substring(0, 8),
        valid_items: validItems.length,
        unavailable_items: unavailableItems.length,
      },
    }).catch((e: any) => logStep('Event insert error (non-blocking)', { error: String(e) }));

    // Increment recovery_attempts
    await supabase
      .from('store_abandoned_carts')
      .update({
        recovery_attempts: (cart.recovery_attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cart.id);

    logStep('Recovery data returned', {
      cartId: cart.id,
      validItems: validItems.length,
      unavailableItems: unavailableItems.length,
    });

    return new Response(JSON.stringify({
      cart_id: cart.id,
      workspace_id: cart.workspace_id,
      items: validItems,
      unavailable_items: unavailableItems,
      subtotal: cart.subtotal,
      currency: cart.currency || 'EUR',
      customer_name: cart.customer_name,
      customer_email: cart.customer_email,
      customer_phone: cart.customer_phone,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logStep('ERROR', { message: (error as Error).message });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

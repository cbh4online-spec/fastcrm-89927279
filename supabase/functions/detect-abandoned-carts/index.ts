import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

/**
 * Detect Abandoned Carts
 * 
 * Scans store_visitor_sessions for sessions with cart_items that have been
 * inactive for 30+ minutes. Creates store_abandoned_carts records with
 * recovery tokens and marks sessions as processed.
 */

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-ABANDONED] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const inactiveMinutes = body.inactiveMinutes || 30;

    logStep('Starting detection', { inactiveMinutes });

    const threshold = new Date(Date.now() - inactiveMinutes * 60 * 1000).toISOString();

    // Find sessions with cart items that are inactive and not yet processed
    const { data: sessions, error: fetchError } = await supabase
      .from('store_visitor_sessions')
      .select('*')
      .not('cart_items', 'is', null)
      .eq('cart_processed', false)
      .lt('last_activity_at', threshold)
      .limit(100);

    if (fetchError) throw fetchError;

    if (!sessions || sessions.length === 0) {
      logStep('No abandoned sessions found');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Found inactive sessions with carts', { count: sessions.length });

    let created = 0;

    for (const session of sessions) {
      const cartItems = session.cart_items as any[];
      if (!cartItems || cartItems.length === 0) continue;

      const subtotal = session.cart_subtotal || 0;
      const recoveryToken = crypto.randomUUID();
      const recoveryTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      // Create abandoned cart record with recovery token
      const { data: insertedCart, error: insertError } = await supabase
        .from('store_abandoned_carts')
        .insert({
          workspace_id: session.workspace_id,
          session_id: session.session_id,
          items: cartItems,
          subtotal: subtotal,
          currency: 'EUR',
          abandoned_at: session.cart_updated_at || session.last_activity_at,
          recovery_status: 'abandoned',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          recovery_token: recoveryToken,
          recovery_token_expires_at: recoveryTokenExpiresAt,
          customer_name: session.customer_name || null,
          customer_email: session.customer_email || null,
          customer_phone: session.customer_phone || null,
          device_type: session.device_type || null,
          referrer: session.referrer || null,
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        logStep('Insert error', { sessionId: session.session_id, error: insertError.message });
        continue;
      }

      // Emit automation events
      if (insertedCart) {
        // abandoned_cart_created event
        await supabase.from('store_automation_events').insert({
          workspace_id: session.workspace_id,
          event_type: 'abandoned_cart_created',
          entity_type: 'abandoned_cart',
          entity_id: insertedCart.id,
          payload: {
            session_id: session.session_id,
            subtotal,
            items_count: cartItems.length,
            customer_email: session.customer_email || null,
            customer_phone: session.customer_phone || null,
          },
        }).catch((e: any) => logStep('Event insert error', { error: String(e) }));

        // recovery_link_created event (ready for future campaigns)
        await supabase.from('store_automation_events').insert({
          workspace_id: session.workspace_id,
          event_type: 'recovery_link_created',
          entity_type: 'abandoned_cart',
          entity_id: insertedCart.id,
          payload: {
            recovery_token: recoveryToken,
            expires_at: recoveryTokenExpiresAt,
            customer_email: session.customer_email || null,
            customer_phone: session.customer_phone || null,
          },
        }).catch((e: any) => logStep('Recovery event insert error', { error: String(e) }));
      }

      // Emit CART.ABANDONED kernel event
      try {
        await fetch(`${supabaseUrl}/functions/v1/kernel-ingest-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            workspace_id: session.workspace_id,
            type: 'CART.ABANDONED',
            entity_kind: 'store_abandoned_cart',
            entity_id: session.session_id,
            actor_type: 'system',
            source_module: 'store-ecommerce',
            schema_version: 1,
            occurred_at: new Date().toISOString(),
            payload: {
              session_id: session.session_id,
              subtotal: subtotal,
              items_count: cartItems.length,
            },
          }),
        });
      } catch (e) {
        logStep('Kernel emit CART.ABANDONED failed', { error: (e as Error).message });
      }

      // Mark session as processed
      await supabase
        .from('store_visitor_sessions')
        .update({ cart_processed: true })
        .eq('id', session.id);

      created++;
    }

    logStep('Detection complete', { created, total: sessions.length });

    return new Response(
      JSON.stringify({ processed: created, total: sessions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logStep('ERROR', { message: (error as Error).message });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

/**
 * Store Cart Abandonment Detector
 * 
 * Called periodically (via cron) to detect abandoned carts and fire automation events.
 * Checks for carts that have been idle for a configurable threshold (default: 1 hour).
 */

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ECOMMERCE] ${step}${detailsStr}`);
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
    const thresholdMinutes = body.thresholdMinutes || 60;

    logStep('Starting abandonment detection', { thresholdMinutes });

    // Find abandoned carts that haven't been processed yet
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

    const { data: abandonedCarts, error: fetchError } = await supabase
      .from('store_abandoned_carts')
      .select('*')
      .eq('recovery_status', 'abandoned')
      .lt('abandoned_at', threshold)
      .eq('recovery_attempts', 0)
      .gt('expires_at', new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;

    if (!abandonedCarts || abandonedCarts.length === 0) {
      logStep('No abandoned carts found');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Found abandoned carts', { count: abandonedCarts.length });

    let processed = 0;

    for (const cart of abandonedCarts) {
      // Create automation event
      const { error: eventError } = await supabase
        .from('store_automation_events')
        .insert({
          workspace_id: cart.workspace_id,
          event_type: 'cart_abandoned',
          abandoned_cart_id: cart.id,
          contact_id: cart.contact_id,
          event_data: {
            session_id: cart.session_id,
            customer_email: cart.customer_email,
            customer_name: cart.customer_name,
            items: cart.items,
            subtotal: cart.subtotal,
            currency: cart.currency,
            abandoned_at: cart.abandoned_at,
            minutes_since_abandonment: Math.round(
              (Date.now() - new Date(cart.abandoned_at).getTime()) / 60000
            ),
          },
        });

      if (eventError) {
        logStep('Event creation error', { cartId: cart.id, error: eventError.message });
        continue;
      }

      // Mark as contacted so we don't re-process
      await supabase
        .from('store_abandoned_carts')
        .update({
          recovery_status: 'contacted',
          recovery_attempts: 1,
          last_recovery_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cart.id);

      processed++;
    }

    // Expire old abandoned carts
    const { count: expiredCount } = await supabase
      .from('store_abandoned_carts')
      .update({ recovery_status: 'expired', updated_at: new Date().toISOString() })
      .lt('expires_at', new Date().toISOString())
      .eq('recovery_status', 'abandoned')
      .select('id', { count: 'exact', head: true });

    logStep('Processing complete', { processed, expired: expiredCount });

    return new Response(
      JSON.stringify({ processed, expired: expiredCount || 0, total: abandonedCarts.length }),
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

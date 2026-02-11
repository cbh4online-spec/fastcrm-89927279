import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

/**
 * Detect Abandoned Carts
 * 
 * Scans store_visitor_sessions for sessions with cart_items that have been
 * inactive for 30+ minutes. Creates store_abandoned_carts records and marks
 * sessions as processed.
 */

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DETECT-ABANDONED] ${step}${detailsStr}`);
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

      // Create abandoned cart record
      const { error: insertError } = await supabase
        .from('store_abandoned_carts')
        .insert({
          workspace_id: session.workspace_id,
          session_id: session.session_id,
          items: cartItems,
          subtotal: subtotal,
          currency: 'EUR',
          abandoned_at: session.cart_updated_at || session.last_activity_at,
          recovery_status: 'abandoned',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (insertError) {
        logStep('Insert error', { sessionId: session.session_id, error: insertError.message });
        continue;
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

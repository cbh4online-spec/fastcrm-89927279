import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

/**
 * Detect Abandoned Carts
 * 
 * Scans store_visitor_sessions for sessions with cart_items that have been
 * inactive for 30+ minutes. Creates store_abandoned_carts records with
 * recovery tokens and marks sessions as processed.
 * 
 * If auto-enrollment is enabled via store_recovery_settings, automatically
 * enrolls eligible carts into the configured recovery sequence.
 */

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-ABANDONED] ${step}${detailsStr}`);
};

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

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

    // Pre-load recovery settings for all workspaces involved
    const workspaceIds = [...new Set(sessions.map((s: any) => s.workspace_id))];
    const { data: allRecoverySettings } = await supabase
      .from('store_recovery_settings')
      .select('*')
      .in('workspace_id', workspaceIds)
      .eq('is_enabled', true);

    const settingsMap: Record<string, any> = {};
    for (const rs of allRecoverySettings || []) {
      settingsMap[rs.workspace_id] = rs;
    }

    let created = 0;

    for (const session of sessions) {
      const cartItems = session.cart_items as any[];
      if (!cartItems || cartItems.length === 0) continue;

      const subtotal = session.cart_subtotal || 0;
      const recoveryToken = crypto.randomUUID();
      const recoveryTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
          outreach_status: 'pending',
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        logStep('Insert error', { sessionId: session.session_id, error: insertError.message });
        continue;
      }

      if (insertedCart) {
        // Emit events
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

        // Auto-enrollment check
        const rs = settingsMap[session.workspace_id];
        if (rs && rs.auto_enroll_enabled && rs.default_sequence_id) {
          const email = session.customer_email;
          const phone = session.customer_phone;

          const eligible =
            (!rs.require_email || !!email) &&
            (!rs.require_phone || !!phone) &&
            (subtotal >= (rs.min_cart_value || 0));

          if (eligible && email) {
            try {
              // Find or create contact
              let contactId: string | null = null;
              const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('workspace_id', session.workspace_id)
                .eq('email', email)
                .maybeSingle();

              if (existingContact) {
                contactId = existingContact.id;
              } else {
                const { data: newContact } = await supabase
                  .from('contacts')
                  .insert({
                    workspace_id: session.workspace_id,
                    email: email,
                    first_name: session.customer_name || null,
                    phone: phone || null,
                    source: 'store_abandoned_cart',
                  })
                  .select('id')
                  .single();
                contactId = newContact?.id || null;
              }

              if (contactId) {
                // Check not already enrolled
                const { data: existingEnr } = await supabase
                  .from('email_sequence_enrollments')
                  .select('id')
                  .eq('contact_id', contactId)
                  .eq('sequence_id', rs.default_sequence_id)
                  .eq('workspace_id', session.workspace_id)
                  .in('status', ['active', 'paused'])
                  .maybeSingle();

                if (!existingEnr) {
                  const { data: enrollment } = await supabase
                    .from('email_sequence_enrollments')
                    .insert({
                      workspace_id: session.workspace_id,
                      sequence_id: rs.default_sequence_id,
                      contact_id: contactId,
                      enrolled_by: SYSTEM_USER_ID,
                      status: 'active',
                      current_step: 0,
                    })
                    .select('id')
                    .single();

                  if (enrollment) {
                    await supabase.from('store_abandoned_carts').update({
                      contact_id: contactId,
                      sequence_id: rs.default_sequence_id,
                      sequence_enrollment_id: enrollment.id,
                      outreach_status: 'enrolled',
                      outreach_started_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }).eq('id', insertedCart.id);

                    await supabase.from('store_automation_events').insert({
                      workspace_id: session.workspace_id,
                      event_type: 'abandoned_cart_auto_enrolled',
                      entity_type: 'abandoned_cart',
                      entity_id: insertedCart.id,
                      payload: {
                        sequence_id: rs.default_sequence_id,
                        enrollment_id: enrollment.id,
                        contact_id: contactId,
                      },
                    });

                    logStep('Auto-enrolled cart', { cartId: insertedCart.id, enrollmentId: enrollment.id });
                  }
                }
              }
            } catch (enrollErr) {
              logStep('Auto-enrollment error', { cartId: insertedCart.id, error: (enrollErr as Error).message });
            }
          }
        }
      }

      // Emit kernel event
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
            payload: { session_id: session.session_id, subtotal, items_count: cartItems.length },
          }),
        });
      } catch (e) {
        logStep('Kernel emit CART.ABANDONED failed', { error: (e as Error).message });
      }

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

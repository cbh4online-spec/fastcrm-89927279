import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

/**
 * Process Store Recovery
 * 
 * 1. Auto-enroll eligible abandoned carts into recovery sequences
 * 2. Process active enrollments (advance steps, check exit conditions)
 * 3. Log everything in store_automation_events
 */

const log = (step: string, details?: unknown) => {
  console.log(`[STORE-RECOVERY] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
    log('Starting recovery processing');

    // 1. Get all active recovery settings
    const { data: allSettings, error: settingsErr } = await supabase
      .from('store_recovery_settings')
      .select('*')
      .eq('is_enabled', true);

    if (settingsErr) throw settingsErr;
    if (!allSettings?.length) {
      log('No active recovery settings found');
      return new Response(JSON.stringify({ enrolled: 0, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalEnrolled = 0;
    let totalProcessed = 0;

    for (const settings of allSettings) {
      if (!settings.default_sequence_id || !settings.auto_enroll_enabled) continue;

      const wid = settings.workspace_id;
      log('Processing workspace', { wid });

      // 2. Find eligible carts: outreach_status='pending', not recovered/expired
      const query = supabase
        .from('store_abandoned_carts')
        .select('*')
        .eq('workspace_id', wid)
        .eq('outreach_status', 'pending')
        .not('recovery_status', 'in', '("recovered","expired")')
        .limit(50);

      const { data: carts, error: cartsErr } = await query;
      if (cartsErr) {
        log('Error fetching carts', { wid, error: cartsErr.message });
        continue;
      }

      for (const cart of carts || []) {
        // Check eligibility
        if (settings.require_email && !cart.customer_email) continue;
        if (settings.require_phone && !cart.customer_phone) continue;
        if ((cart.subtotal || 0) < (settings.min_cart_value || 0)) continue;

        // Find or create CRM contact
        let contactId = cart.contact_id;
        if (!contactId && cart.customer_email) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('workspace_id', wid)
            .eq('email', cart.customer_email)
            .maybeSingle();

          if (existing) {
            contactId = existing.id;
          } else {
            const { data: newContact } = await supabase
              .from('contacts')
              .insert({
                workspace_id: wid,
                email: cart.customer_email,
                first_name: cart.customer_name || null,
                phone: cart.customer_phone || null,
                source: 'store_abandoned_cart',
              })
              .select('id')
              .single();
            contactId = newContact?.id;
          }
        }

        if (!contactId) {
          log('No contact for cart', { cartId: cart.id });
          continue;
        }

        // Check if already enrolled in this sequence
        const { data: existingEnrollment } = await supabase
          .from('email_sequence_enrollments')
          .select('id')
          .eq('contact_id', contactId)
          .eq('sequence_id', settings.default_sequence_id)
          .eq('workspace_id', wid)
          .in('status', ['active', 'paused'])
          .maybeSingle();

        if (existingEnrollment) {
          log('Already enrolled', { cartId: cart.id, contactId });
          continue;
        }

        // Get first step to calc next_send_at
        const { data: firstStep } = await supabase
          .from('email_sequence_steps')
          .select('delay_days, delay_hours')
          .eq('sequence_id', settings.default_sequence_id)
          .eq('is_active', true)
          .order('step_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        const delayMs = ((firstStep?.delay_days || 0) * 86400000) + ((firstStep?.delay_hours || 0) * 3600000);
        const nextSendAt = new Date(Date.now() + delayMs).toISOString();

        // Create enrollment
        const { data: enrollment, error: enrollErr } = await supabase
          .from('email_sequence_enrollments')
          .insert({
            workspace_id: wid,
            sequence_id: settings.default_sequence_id,
            contact_id: contactId,
            enrolled_by: SYSTEM_USER_ID,
            status: 'active',
            current_step: 0,
            next_send_at: nextSendAt,
          })
          .select('id')
          .single();

        if (enrollErr) {
          log('Enrollment error', { cartId: cart.id, error: enrollErr.message });
          continue;
        }

        // Update abandoned cart
        await supabase
          .from('store_abandoned_carts')
          .update({
            contact_id: contactId,
            sequence_id: settings.default_sequence_id,
            sequence_enrollment_id: enrollment.id,
            outreach_status: 'enrolled',
            outreach_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', cart.id);

        // Emit event
        await supabase.from('store_automation_events').insert({
          workspace_id: wid,
          event_type: 'abandoned_cart_auto_enrolled',
          entity_type: 'abandoned_cart',
          entity_id: cart.id,
          payload: {
            sequence_id: settings.default_sequence_id,
            enrollment_id: enrollment.id,
            contact_id: contactId,
            subtotal: cart.subtotal,
          },
        });

        totalEnrolled++;
        log('Enrolled cart', { cartId: cart.id, enrollmentId: enrollment.id });
      }

      // 3. Process active enrollments for this workspace
      const { data: activeEnrollments } = await supabase
        .from('store_abandoned_carts')
        .select('*, email_sequence_enrollments!sequence_enrollment_id(*)')
        .eq('workspace_id', wid)
        .in('outreach_status', ['enrolled', 'in_progress'])
        .not('sequence_enrollment_id', 'is', null)
        .limit(50);

      for (const cart of activeEnrollments || []) {
        const enr = (cart as any).email_sequence_enrollments;
        if (!enr) continue;

        // Exit condition: cart already recovered
        if (cart.recovery_status === 'recovered') {
          await supabase.from('email_sequence_enrollments').update({
            status: 'exited',
            exit_reason: 'cart_recovered',
            updated_at: new Date().toISOString(),
          }).eq('id', enr.id);

          await supabase.from('store_abandoned_carts').update({
            outreach_status: 'recovered',
            exit_reason: 'cart_recovered',
            updated_at: new Date().toISOString(),
          }).eq('id', cart.id);

          await supabase.from('store_automation_events').insert({
            workspace_id: wid,
            event_type: 'abandoned_cart_sequence_recovered',
            entity_type: 'abandoned_cart',
            entity_id: cart.id,
            payload: { enrollment_id: enr.id },
          });

          totalProcessed++;
          continue;
        }

        // Exit condition: cart expired
        if (cart.recovery_status === 'expired' || (cart.expires_at && new Date(cart.expires_at) < new Date())) {
          await supabase.from('email_sequence_enrollments').update({
            status: 'exited',
            exit_reason: 'cart_expired',
            updated_at: new Date().toISOString(),
          }).eq('id', enr.id);

          await supabase.from('store_abandoned_carts').update({
            outreach_status: 'exited',
            exit_reason: 'cart_expired',
            updated_at: new Date().toISOString(),
          }).eq('id', cart.id);

          await supabase.from('store_automation_events').insert({
            workspace_id: wid,
            event_type: 'abandoned_cart_sequence_exited',
            entity_type: 'abandoned_cart',
            entity_id: cart.id,
            payload: { enrollment_id: enr.id, reason: 'cart_expired' },
          });

          totalProcessed++;
          continue;
        }

        // Check if next_send_at is due
        if (!enr.next_send_at || new Date(enr.next_send_at) > new Date()) continue;

        // Get current step
        const currentStepOrder = enr.current_step || 0;
        const { data: step } = await supabase
          .from('email_sequence_steps')
          .select('*')
          .eq('sequence_id', cart.sequence_id)
          .eq('step_order', currentStepOrder)
          .eq('is_active', true)
          .maybeSingle();

        if (!step) {
          // No more steps — sequence complete
          await supabase.from('email_sequence_enrollments').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', enr.id);

          await supabase.from('store_abandoned_carts').update({
            outreach_status: 'exited',
            exit_reason: 'sequence_completed',
            updated_at: new Date().toISOString(),
          }).eq('id', cart.id);

          totalProcessed++;
          continue;
        }

        // Build merge variables
        const { data: storeSettings } = await supabase
          .from('store_settings')
          .select('store_name, store_slug')
          .eq('workspace_id', wid)
          .maybeSingle();

        const cartItems = (cart.items as any[]) || [];
        const variables: Record<string, string> = {
          contact_name: cart.customer_name || cart.customer_email || 'Cliente',
          store_name: storeSettings?.store_name || 'Loja',
          cart_total: `€${(cart.subtotal || 0).toFixed(2)}`,
          cart_items_summary: cartItems.map((i: any) => `${i.name} ×${i.quantity}`).join(', '),
          recovery_link: cart.recovery_token && storeSettings?.store_slug
            ? `${supabaseUrl.replace('.supabase.co', '')}/store/${storeSettings.store_slug}/recover/${cart.recovery_token}`
            : '',
          abandoned_at: cart.abandoned_at ? new Date(cart.abandoned_at).toLocaleString('pt-PT') : '',
        };

        // Log the step execution (payload ready for actual sending)
        await supabase.from('store_automation_events').insert({
          workspace_id: wid,
          event_type: 'abandoned_cart_sequence_step_processed',
          entity_type: 'abandoned_cart',
          entity_id: cart.id,
          payload: {
            enrollment_id: enr.id,
            step_id: step.id,
            step_order: step.step_order,
            channel: step.channel,
            subject: step.subject,
            template_id: step.template_id,
            merge_variables: variables,
          },
        });

        // Advance to next step
        const { data: nextStep } = await supabase
          .from('email_sequence_steps')
          .select('step_order, delay_days, delay_hours')
          .eq('sequence_id', cart.sequence_id)
          .gt('step_order', currentStepOrder)
          .eq('is_active', true)
          .order('step_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        const nextStepOrder = nextStep ? nextStep.step_order : currentStepOrder + 1;
        const nextDelayMs = nextStep
          ? ((nextStep.delay_days || 0) * 86400000) + ((nextStep.delay_hours || 0) * 3600000)
          : 86400000; // default 1 day

        await supabase.from('email_sequence_enrollments').update({
          current_step: nextStepOrder,
          next_send_at: nextStep ? new Date(Date.now() + nextDelayMs).toISOString() : null,
          status: nextStep ? 'active' : 'completed',
          completed_at: nextStep ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', enr.id);

        await supabase.from('store_abandoned_carts').update({
          outreach_status: nextStep ? 'in_progress' : 'exited',
          outreach_step: nextStepOrder,
          last_outreach_at: new Date().toISOString(),
          exit_reason: nextStep ? null : 'sequence_completed',
          updated_at: new Date().toISOString(),
        }).eq('id', cart.id);

        totalProcessed++;
        log('Processed step', { cartId: cart.id, step: currentStepOrder });
      }
    }

    log('Complete', { totalEnrolled, totalProcessed });

    return new Response(
      JSON.stringify({ enrolled: totalEnrolled, processed: totalProcessed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    log('ERROR', { message: (error as Error).message });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

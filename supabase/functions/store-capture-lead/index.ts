import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-CAPTURE-LEAD] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { workspaceId, sessionId, name, phone, email, cartItems } = await req.json();

    if (!workspaceId || !sessionId) {
      throw new Error('workspaceId and sessionId are required');
    }

    logStep('Capturing lead', { workspaceId, sessionId, name, phone, hasEmail: !!email });

    // Resolve workspace ID from slug if needed
    let resolvedWorkspaceId = workspaceId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId);
    if (!isUuid) {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceId)
        .single();
      if (ws) resolvedWorkspaceId = ws.id;
      else throw new Error('Workspace not found');
    }

    // --- Upsert contact ---
    let contactId: string | null = null;

    // Try to find existing contact by phone first
    if (phone) {
      const phoneClean = phone.replace(/\s/g, '');
      const { data: byPhone } = await supabase
        .from('contacts')
        .select('id, email')
        .eq('workspace_id', resolvedWorkspaceId)
        .eq('phone', phoneClean)
        .limit(1)
        .maybeSingle();

      if (byPhone) {
        contactId = byPhone.id;
        const updates: Record<string, unknown> = {};
        if (name) updates.name = name;
        if (email && !byPhone.email) updates.email = email;
        if (Object.keys(updates).length > 0) {
          await supabase.from('contacts').update(updates).eq('id', contactId);
        }
        logStep('Found contact by phone', { contactId });
      }
    }

    // Fallback: find by email
    if (!contactId && email) {
      const { data: byEmail } = await supabase
        .from('contacts')
        .select('id')
        .eq('workspace_id', resolvedWorkspaceId)
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      if (byEmail) {
        contactId = byEmail.id;
        const updates: Record<string, unknown> = {};
        if (name) updates.name = name;
        if (phone) updates.phone = phone.replace(/\s/g, '');
        if (Object.keys(updates).length > 0) {
          await supabase.from('contacts').update(updates).eq('id', contactId);
        }
        logStep('Found contact by email', { contactId });
      }
    }

    // Create new contact if not found
    if (!contactId) {
      const { data: newContact, error: insertErr } = await supabase
        .from('contacts')
        .insert({
          workspace_id: resolvedWorkspaceId,
          name: name || 'Lead Checkout',
          phone: phone ? phone.replace(/\s/g, '') : null,
          email: email || null,
          source: 'store_checkout',
          tags: ['loja-online', 'lead-checkout'],
        })
        .select('id')
        .single();

      if (insertErr) {
        logStep('Contact insert error', { message: insertErr.message });
      } else {
        contactId = newContact.id;
        logStep('Created new contact', { contactId });
      }
    }

    // --- Domain auto-link: associate contact with company by email domain ---
    if (contactId && email) {
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (emailDomain) {
        // Check if contact already has a company_id
        const { data: currentContact } = await supabase
          .from('contacts')
          .select('company_id')
          .eq('id', contactId)
          .single();

        if (currentContact && !currentContact.company_id) {
          const { data: matchedCompany } = await supabase
            .from('companies')
            .select('id, name')
            .eq('workspace_id', resolvedWorkspaceId)
            .ilike('domain', emailDomain)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle();

          if (matchedCompany) {
            await supabase
              .from('contacts')
              .update({ company_id: matchedCompany.id, company: matchedCompany.name })
              .eq('id', contactId);
            logStep('Auto-linked contact to company', { contactId, companyId: matchedCompany.id });
          }
        }
      }
    }

    // --- Upsert abandoned cart ---
    const subtotal = (cartItems || []).reduce(
      (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
      0
    );

    const cartPayload = {
      workspace_id: resolvedWorkspaceId,
      session_id: sessionId,
      contact_id: contactId,
      customer_name: name || null,
      customer_phone: phone || null,
      customer_email: email || null,
      items: cartItems || [],
      subtotal,
      currency: 'EUR',
      recovery_status: 'abandoned',
      abandoned_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try update first (by session_id)
    const { data: existingCart } = await supabase
      .from('store_abandoned_carts')
      .select('id')
      .eq('session_id', sessionId)
      .eq('workspace_id', resolvedWorkspaceId)
      .maybeSingle();

    let cartId: string | null = null;

    if (existingCart) {
      await supabase
        .from('store_abandoned_carts')
        .update({
          contact_id: contactId,
          customer_name: name || null,
          customer_phone: phone || null,
          customer_email: email || null,
          items: cartItems || [],
          subtotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCart.id);
      cartId = existingCart.id;
      logStep('Updated abandoned cart', { cartId });
    } else {
      const { data: newCart, error: cartErr } = await supabase
        .from('store_abandoned_carts')
        .insert(cartPayload)
        .select('id')
        .single();

      if (cartErr) {
        logStep('Cart insert error', { message: cartErr.message });
      } else {
        cartId = newCart.id;
        logStep('Created abandoned cart', { cartId });
      }
    }

    return new Response(
      JSON.stringify({ contactId, cartId }),
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

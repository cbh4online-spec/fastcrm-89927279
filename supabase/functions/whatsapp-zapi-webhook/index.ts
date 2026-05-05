// whatsapp-zapi-webhook
// Receives all events from Z-API instance (messages, status changes, etc.)
// Public endpoint (no JWT) — secured via workspace_id query param + instance_id match.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('ws');

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'workspace identifier missing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = await req.json().catch(() => ({}));
    console.log(`[zapi-webhook] ws=${workspaceId} type=${payload?.type ?? payload?.event ?? 'unknown'}`);

    // Verify the instance_id matches this workspace
    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('id, instance_id, status')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!conn) {
      console.warn(`[zapi-webhook] No Z-API connection for workspace ${workspaceId}`);
      return new Response(
        JSON.stringify({ ok: true, ignored: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eventType: string = (payload?.type ?? payload?.event ?? '').toString();
    const updates: Record<string, unknown> = { last_seen_at: new Date().toISOString() };

    // Connection events
    if (eventType === 'ConnectedCallback' || payload?.connected === true) {
      updates.status = 'connected';
      updates.connected_at = new Date().toISOString();
      updates.qr_code = null;
      updates.phone_number = payload?.phone ?? payload?.connectedPhone ?? null;
    } else if (eventType === 'DisconnectedCallback') {
      updates.status = 'disconnected';
      updates.disconnected_at = new Date().toISOString();
    } else if (
      eventType === 'ReceivedCallback' ||
      eventType === 'message' ||
      payload?.messageId
    ) {
      updates.last_inbound_message_at = new Date().toISOString();
      // TODO Phase 2: insert into unified inbox (messages table)
    } else if (eventType === 'MessageStatusCallback') {
      // Delivery / read receipts
      // TODO Phase 2: update message status in inbox
    }

    if (Object.keys(updates).length > 0) {
      await admin
        .from('whatsapp_zapi_connections')
        .update(updates)
        .eq('workspace_id', workspaceId);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[zapi-webhook] Internal error:', err);
    // Always 200 OK so Z-API doesn't retry-storm
    return new Response(
      JSON.stringify({ ok: true, error: 'internal_error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

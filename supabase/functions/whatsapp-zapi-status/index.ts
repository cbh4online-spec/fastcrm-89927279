// whatsapp-zapi-status
// Polls the current Z-API instance status and refreshes QR if needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
import { zapiCall, safeJson } from '../_shared/zapi.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const { workspaceId } = await req.json();
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'workspaceId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: membership } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    let isSuperAdmin = false;
    if (!membership) {
      const { data: superAdminCheck } = await admin.rpc('is_super_admin', { _user_id: userId });
      isSuperAdmin = superAdminCheck === true;
    }

    if (!membership && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!conn?.instance_id || !conn?.instance_token || !conn?.client_token) {
      return new Response(
        JSON.stringify({ status: 'not_configured', fallback: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check connection status
    const statusRes = await zapiCall(
      { instanceId: conn.instance_id, instanceToken: conn.instance_token, clientToken: conn.client_token },
      '/status'
    );
    const statusJson = await safeJson(statusRes);
    const connected = statusJson?.connected === true;

    let newStatus = conn.status;
    let qrCode = conn.qr_code;
    let phoneNumber = conn.phone_number;

    if (connected) {
      newStatus = 'connected';
      qrCode = null;
      // Try to fetch phone number
      try {
        const profRes = await zapiCall(
          { instanceId: conn.instance_id, instanceToken: conn.instance_token, clientToken: conn.client_token },
          '/me'
        );
        const profJson = await safeJson(profRes);
        phoneNumber = profJson?.phone ?? profJson?.id ?? phoneNumber;
      } catch {}
    } else if (conn.status === 'waiting_for_scan' || conn.status === 'qr_pending') {
      // Refresh QR
      const qrRes = await zapiCall(
        { instanceId: conn.instance_id, instanceToken: conn.instance_token, clientToken: conn.client_token },
        '/qr-code/image'
      );
      const qrJson = await safeJson(qrRes);
      qrCode = qrJson?.value ?? null;
      newStatus = qrCode ? 'waiting_for_scan' : 'qr_expired';
    } else {
      newStatus = 'disconnected';
    }

    await admin
      .from('whatsapp_zapi_connections')
      .update({
        status: newStatus,
        qr_code: qrCode,
        qr_updated_at: qrCode ? new Date().toISOString() : conn.qr_updated_at,
        phone_number: phoneNumber,
        connected_at: connected && !conn.connected_at ? new Date().toISOString() : conn.connected_at,
        last_seen_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId);

    return new Response(
      JSON.stringify({ status: newStatus, qr_code: qrCode, phone_number: phoneNumber, connected }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[zapi-status] Internal error:', err);
    return new Response(
      JSON.stringify({ status: 'error', error: (err as Error).message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

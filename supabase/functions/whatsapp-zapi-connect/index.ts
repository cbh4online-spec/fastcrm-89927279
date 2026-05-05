// whatsapp-zapi-connect
// Creates (or reuses) a Z-API instance for the workspace and returns QR code.
// Uses master account in 'master' mode, or BYO credentials if provided.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
import { getMasterCredentials, zapiCall, zapiMasterCall, safeJson } from '../_shared/zapi.ts';

interface ConnectBody {
  workspaceId: string;
  // Optional BYO mode credentials
  byo?: {
    instanceId: string;
    instanceToken: string;
    clientToken: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: claims, error: authErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const body: ConnectBody = await req.json();
    if (!body?.workspaceId) {
      return new Response(JSON.stringify({ error: 'workspaceId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify workspace membership
    const { data: membership } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', body.workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create connection row
    const { data: existing } = await admin
      .from('whatsapp_zapi_connections')
      .select('*')
      .eq('workspace_id', body.workspaceId)
      .maybeSingle();

    let instanceId: string | null = existing?.instance_id ?? null;
    let instanceToken: string | null = existing?.instance_token ?? null;
    let clientToken: string | null = existing?.client_token ?? null;
    let accountMode: 'master' | 'byo' = body.byo ? 'byo' : (existing?.account_mode ?? 'master');

    // BYO mode: use provided credentials
    if (body.byo) {
      instanceId = body.byo.instanceId;
      instanceToken = body.byo.instanceToken;
      clientToken = body.byo.clientToken;
    } else if (!instanceId || !instanceToken || !clientToken) {
      // Master mode: create instance via master account
      const master = getMasterCredentials();
      const createRes = await zapiMasterCall(master, '/instances', {
        method: 'POST',
        body: JSON.stringify({
          name: `ws-${body.workspaceId.slice(0, 8)}`,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('[zapi-connect] Failed to create instance:', createRes.status, errText);
        return new Response(
          JSON.stringify({ error: 'Failed to create Z-API instance', detail: errText, fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const created = await safeJson(createRes);
      instanceId = created?.id ?? created?.instanceId ?? created?.instance?.id;
      instanceToken = created?.token ?? created?.instance?.token;
      clientToken = master.adminToken; // master mode reuses admin token as client-token

      if (!instanceId || !instanceToken) {
        console.error('[zapi-connect] Missing instance fields in response:', created);
        return new Response(
          JSON.stringify({ error: 'Z-API returned invalid instance data', fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Upsert connection
    const upsertPayload = {
      workspace_id: body.workspaceId,
      instance_id: instanceId,
      instance_token: instanceToken,
      client_token: clientToken,
      account_mode: accountMode,
      status: 'qr_pending' as const,
      connected_by: userId,
      last_error: null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await admin
        .from('whatsapp_zapi_connections')
        .update(upsertPayload)
        .eq('workspace_id', body.workspaceId);
    } else {
      await admin
        .from('whatsapp_zapi_connections')
        .insert(upsertPayload);
    }

    // Configure webhook on this instance
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-zapi-webhook?ws=${body.workspaceId}`;
    try {
      await zapiCall(
        { instanceId: instanceId!, instanceToken: instanceToken!, clientToken: clientToken! },
        '/update-webhook-received',
        { method: 'PUT', body: JSON.stringify({ value: webhookUrl }) }
      );
      await zapiCall(
        { instanceId: instanceId!, instanceToken: instanceToken!, clientToken: clientToken! },
        '/update-webhook-connected',
        { method: 'PUT', body: JSON.stringify({ value: webhookUrl }) }
      );
      await zapiCall(
        { instanceId: instanceId!, instanceToken: instanceToken!, clientToken: clientToken! },
        '/update-webhook-disconnected',
        { method: 'PUT', body: JSON.stringify({ value: webhookUrl }) }
      );
    } catch (whErr) {
      console.warn('[zapi-connect] Webhook config warning:', whErr);
    }

    // Fetch QR code (image base64)
    const qrRes = await zapiCall(
      { instanceId: instanceId!, instanceToken: instanceToken!, clientToken: clientToken! },
      '/qr-code/image'
    );
    const qrJson = await safeJson(qrRes);
    const qrCode = qrJson?.value ?? null; // base64 image data:image/png;base64,...
    const connected = qrJson?.connected === true;

    await admin
      .from('whatsapp_zapi_connections')
      .update({
        qr_code: qrCode,
        qr_updated_at: new Date().toISOString(),
        status: connected ? 'connected' : 'waiting_for_scan',
        connected_at: connected ? new Date().toISOString() : null,
      })
      .eq('workspace_id', body.workspaceId);

    return new Response(
      JSON.stringify({
        success: true,
        instance_id: instanceId,
        status: connected ? 'connected' : 'waiting_for_scan',
        qr_code: qrCode,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[zapi-connect] Internal error:', err);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: (err as Error).message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

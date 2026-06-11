// whatsapp-zapi-move-instance
// Super-admin only. Move uma instância Z-API entre workspaces:
//   1. Localiza a ligação actual pelo instance_id (ou pelo fromWorkspaceId)
//   2. Desactiva whatsapp_provider_instances Z-API no workspace de origem
//   3. Move whatsapp_zapi_connections.workspace_id → toWorkspaceId
//      (preservando instance_id/instance_token/client_token/webhook_secret)
//   4. Activa/actualiza whatsapp_provider_instances Z-API no destino
//   5. Reconfigura webhook na Z-API para o novo ?ws=toWorkspaceId
//   6. Faz poll /status para refrescar phone_number / status / connected_at
//
// Resposta 200 OK com summary mesmo em falhas parciais (padrão de resiliência).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
import { zapiCall, safeJson } from '../_shared/zapi.ts';

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const WEBHOOK_TYPES = [
  'message-received',
  'message-status',
  'connected',
  'disconnected',
  'chat-presence',
] as const;

interface MoveBody {
  instanceId?: string;
  fromWorkspaceId?: string;
  toWorkspaceId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims?.sub) return jsonRes({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { data: isSuper } = await admin.rpc('is_super_admin', { _user_id: userId });
    if (!isSuper) return jsonRes({ error: 'Forbidden — super-admin only' }, 403);

    const body = (await req.json()) as MoveBody;
    if (!body?.toWorkspaceId) return jsonRes({ error: 'toWorkspaceId required' }, 400);
    if (!body.instanceId && !body.fromWorkspaceId) {
      return jsonRes({ error: 'instanceId or fromWorkspaceId required' }, 400);
    }

    // 1. Localizar ligação actual
    const lookup = admin.from('whatsapp_zapi_connections').select('*');
    const { data: conn } = body.instanceId
      ? await lookup.eq('instance_id', body.instanceId).maybeSingle()
      : await lookup.eq('workspace_id', body.fromWorkspaceId!).maybeSingle();

    if (!conn) return jsonRes({ ok: false, error: 'Instância não encontrada' }, 404);
    if (!conn.instance_id || !conn.instance_token || !conn.client_token) {
      return jsonRes({ ok: false, error: 'Credenciais Z-API incompletas' }, 400);
    }

    const fromWs = conn.workspace_id;
    const toWs = body.toWorkspaceId;

    if (fromWs === toWs) {
      // mesma workspace — só reconfigurar webhook + status
    } else {
      // 2. Desactivar provider_instances Z-API no workspace de origem
      await admin
        .from('whatsapp_provider_instances')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('workspace_id', fromWs)
        .eq('provider_name', 'zapi');

      // 3. Garantir que o destino não tem já uma ligação Z-API conflituante
      const { data: targetExisting } = await admin
        .from('whatsapp_zapi_connections')
        .select('id, instance_id')
        .eq('workspace_id', toWs)
        .maybeSingle();

      if (targetExisting && targetExisting.id !== conn.id) {
        // libertar o slot do destino (apagar — vai ser substituído pela instância movida)
        await admin
          .from('whatsapp_zapi_connections')
          .delete()
          .eq('id', targetExisting.id);
      }

      // 4. Mover a linha
      await admin
        .from('whatsapp_zapi_connections')
        .update({ workspace_id: toWs, updated_at: new Date().toISOString() })
        .eq('id', conn.id);

      // 5. Activar/upsert provider_instances no destino
      const { data: targetProv } = await admin
        .from('whatsapp_provider_instances')
        .select('id')
        .eq('workspace_id', toWs)
        .eq('provider_name', 'zapi')
        .maybeSingle();

      const provPayload = {
        workspace_id: toWs,
        provider_name: 'zapi',
        external_instance_id: conn.instance_id,
        base_url: 'https://api.z-api.io',
        active: true,
        updated_at: new Date().toISOString(),
      };
      if (targetProv) {
        await admin
          .from('whatsapp_provider_instances')
          .update(provPayload)
          .eq('id', targetProv.id);
      } else {
        await admin.from('whatsapp_provider_instances').insert(provPayload);
      }
    }

    // 6. Reconfigurar webhooks na Z-API
    const baseUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co');
    const webhookSecret = conn.webhook_secret ?? '';
    const webhookUrl =
      `${baseUrl}/whatsapp-zapi-webhook?ws=${toWs}` +
      (webhookSecret ? `&secret=${encodeURIComponent(webhookSecret)}` : '');

    const creds = {
      instanceId: conn.instance_id,
      instanceToken: conn.instance_token,
      clientToken: conn.client_token,
    };
    const webhookResults: Record<string, { ok: boolean; status: number }> = {};
    for (const type of WEBHOOK_TYPES) {
      try {
        const res = await zapiCall(creds, `/update-webhook-${type}`, {
          method: 'PUT',
          body: JSON.stringify({ value: webhookUrl }),
        });
        webhookResults[type] = { ok: res.ok, status: res.status };
      } catch (e) {
        webhookResults[type] = { ok: false, status: 0 };
        console.error(`[zapi-move] webhook ${type} failed`, e);
      }
    }
    const webhookAllOk = Object.values(webhookResults).every((r) => r.ok);

    // 7. Refrescar status / phone
    let connected = false;
    let phoneNumber: string | null = conn.phone_number;
    let newStatus = conn.status;
    try {
      const statusRes = await zapiCall(creds, '/status');
      const statusJson = await safeJson(statusRes);
      connected = statusJson?.connected === true;
      if (connected) {
        newStatus = 'connected';
        try {
          const meRes = await zapiCall(creds, '/me');
          const meJson = await safeJson(meRes);
          phoneNumber = meJson?.phone ?? meJson?.id ?? phoneNumber;
        } catch {}
      } else {
        newStatus = 'disconnected';
      }
    } catch (e) {
      console.warn('[zapi-move] status fetch failed', e);
    }

    await admin
      .from('whatsapp_zapi_connections')
      .update({
        status: newStatus,
        phone_number: phoneNumber,
        webhook_configured: webhookAllOk,
        webhook_last_error: webhookAllOk ? null : 'Falha parcial na configuração do webhook após mover',
        connected_at: connected ? new Date().toISOString() : conn.connected_at,
        last_seen_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conn.id);

    return jsonRes({
      ok: true,
      moved: fromWs !== toWs,
      fromWorkspaceId: fromWs,
      toWorkspaceId: toWs,
      instanceId: conn.instance_id,
      webhookConfigured: webhookAllOk,
      webhookResults,
      status: newStatus,
      connected,
      phoneNumber,
      webhookUrl,
    });
  } catch (err) {
    console.error('[zapi-move-instance] error', err);
    return jsonRes({ ok: false, error: (err as Error).message, fallback: true });
  }
});

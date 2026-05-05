// whatsapp-zapi-configure-webhook
// Restrito a super-admin. Configura silenciosamente o webhook na Z-API
// para apontar para a nossa edge function whatsapp-zapi-webhook?ws=...
// Cliente final NÃO sabe que existe a Z-API por trás.

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

    // SUPER-ADMIN apenas
    const { data: isSuper } = await admin.rpc('is_super_admin', { _user_id: userId });
    if (!isSuper) return jsonRes({ error: 'Forbidden — super-admin only' }, 403);

    const { workspaceId } = await req.json();
    if (!workspaceId) return jsonRes({ error: 'workspaceId required' }, 400);

    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!conn?.instance_id || !conn?.instance_token || !conn?.client_token) {
      return jsonRes({ ok: false, error: 'Instância não configurada' });
    }

    // URL do nosso webhook (com workspace + secret)
    const baseUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co');
    const webhookUrl = `${baseUrl}/whatsapp-zapi-webhook?ws=${workspaceId}&secret=${encodeURIComponent(conn.webhook_secret)}`;

    const results: Record<string, { ok: boolean; status: number }> = {};
    for (const type of WEBHOOK_TYPES) {
      try {
        const res = await zapiCall(
          { instanceId: conn.instance_id, instanceToken: conn.instance_token, clientToken: conn.client_token },
          `/update-webhook-${type}`,
          { method: 'PUT', body: JSON.stringify({ value: webhookUrl }) },
        );
        results[type] = { ok: res.ok, status: res.status };
      } catch (e) {
        results[type] = { ok: false, status: 0 };
        console.error(`[configure-webhook] ${type} failed`, e);
      }
    }

    const allOk = Object.values(results).every((r) => r.ok);

    await admin
      .from('whatsapp_zapi_connections')
      .update({
        webhook_configured: allOk,
        webhook_last_error: allOk ? null : 'Falha parcial na configuração do webhook',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conn.id);

    return jsonRes({ ok: allOk, results, webhookUrl });
  } catch (err) {
    console.error('[zapi-configure-webhook] error', err);
    return jsonRes({ ok: false, error: (err as Error).message, fallback: true });
  }
});

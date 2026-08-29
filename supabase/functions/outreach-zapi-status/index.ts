// outreach-zapi-status
// Diagnóstico da ligação Z-API usada pelo módulo "Contacto 1:1 validado".
// Nunca devolve segredos (tokens, secret de webhook) — apenas estado e referências mascaradas.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function mask(value?: string | null): string | null {
  if (!value) return null;
  return value.length <= 6 ? '••••' : `${value.slice(0, 4)}••••${value.slice(-2)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonRes({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const workspaceId = String(body.workspaceId ?? body.workspace_id ?? '');
    if (!workspaceId) return jsonRes({ error: 'workspaceId obrigatório' }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: membership } = await admin
      .from('workspace_members').select('id')
      .eq('workspace_id', workspaceId).eq('user_id', userData.user.id).maybeSingle();
    if (!membership) return jsonRes({ error: 'Not a workspace member' }, 403);

    const [{ data: conn }, { data: link }] = await Promise.all([
      admin.from('whatsapp_zapi_connections')
        .select('instance_id, status, phone_number, webhook_configured, webhook_last_received_at, last_error, webhook_secret')
        .eq('workspace_id', workspaceId).maybeSingle(),
      admin.from('outreach_channel_links')
        .select('enabled, mode, instance_ref, last_diagnostic_at')
        .eq('workspace_id', workspaceId).eq('provider', 'zapi').maybeSingle(),
    ]);

    const diagnostic = {
      providerConfigured: !!conn?.instance_id,
      providerStatus: conn?.status ?? 'not_configured',
      providerPhoneMasked: mask(conn?.phone_number ?? null),
      instanceRefMasked: mask(conn?.instance_id ?? null),
      webhookConfigured: !!conn?.webhook_configured,
      webhookSecretConfigured: !!conn?.webhook_secret,
      webhookLastReceivedAt: conn?.webhook_last_received_at ?? null,
      lastProviderError: conn?.last_error ?? null,
      linkEnabled: !!link?.enabled,
      linkMode: link?.mode ?? 'disabled',
      liveDispatchEnabled: false,
      checkedAt: new Date().toISOString(),
    };

    if (link) {
      await admin.from('outreach_channel_links')
        .update({ last_diagnostic_at: diagnostic.checkedAt, last_diagnostic: diagnostic, updated_at: diagnostic.checkedAt })
        .eq('workspace_id', workspaceId).eq('provider', 'zapi');
    }

    return jsonRes({ success: true, diagnostic });
  } catch (e) {
    console.error('[outreach-zapi-status] error', e instanceof Error ? e.message : String(e));
    return jsonRes({ error: 'internal_error' }, 200);
  }
});

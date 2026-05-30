// whatsapp-zapi-test-send
// Envia uma mensagem de teste pela instância Z-API do workspace e regista o resultado.
// Usado pelo modal "Enviar mensagem de teste" no card de Settings.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';
import { zapiCall, safeJson } from '../_shared/zapi.ts';

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  // Se vier sem indicativo (9 dígitos PT), assumir +351
  if (digits.length === 9 && digits.startsWith('9')) return `351${digits}`;
  return digits;
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

    const { workspaceId, phone, message } = await req.json();
    if (!workspaceId || !phone || !message) {
      return jsonRes({ ok: false, error: 'workspaceId, phone e message são obrigatórios' }, 400);
    }
    if (typeof message !== 'string' || message.length > 2000) {
      return jsonRes({ ok: false, error: 'Mensagem inválida (máx 2000 caracteres)' }, 400);
    }

    // Verificar pertença ao workspace, com bypass seguro para super admin
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

    if (!membership && !isSuperAdmin) return jsonRes({ error: 'Forbidden' }, 403);

    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!conn?.instance_id || !conn?.instance_token || !conn?.client_token) {
      return jsonRes({ ok: false, error: 'Instância WhatsApp não configurada', code: 'not_configured' });
    }
    if (conn.status !== 'connected') {
      return jsonRes({ ok: false, error: 'Instância WhatsApp desconectada — não é possível enviar', code: 'disconnected' });
    }

    const normalized = normalizePhone(phone);
    if (normalized.length < 10) {
      return jsonRes({ ok: false, error: 'Número inválido', code: 'invalid_phone' });
    }

    const startedAt = Date.now();
    const sendRes = await zapiCall(
      { instanceId: conn.instance_id, instanceToken: conn.instance_token, clientToken: conn.client_token },
      '/send-text',
      {
        method: 'POST',
        body: JSON.stringify({ phone: normalized, message }),
      },
    );
    const sendJson = await safeJson(sendRes);
    const durationMs = Date.now() - startedAt;

    const ok = sendRes.ok && (sendJson?.messageId || sendJson?.id);
    let code = 'ok';
    let userError: string | null = null;
    if (!ok) {
      if (sendRes.status === 401 || sendRes.status === 403) {
        code = 'auth_error';
        userError = 'Erro de autenticação com a instância';
      } else if (sendRes.status === 404) {
        code = 'invalid_phone';
        userError = 'Número não existe no WhatsApp';
      } else {
        code = 'zapi_error';
        userError = sendJson?.error || sendJson?.message || `Erro ${sendRes.status}`;
      }
    }

    // Registar log
    await admin.rpc('log_whatsapp_webhook', {
      p_workspace_id: workspaceId,
      p_connection_id: conn.id,
      p_instance_id: conn.instance_id,
      p_event_type: 'TestSend',
      p_payload: { phone: normalized, message_preview: message.slice(0, 80), response: sendJson },
      p_processed: ok,
      p_error: userError,
      p_processing_ms: durationMs,
    });

    if (ok) {
      await admin
        .from('whatsapp_zapi_connections')
        .update({ last_outbound_message_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
        .eq('id', conn.id);

      return jsonRes({ ok: true, messageId: sendJson?.messageId || sendJson?.id, durationMs });
    }

    return jsonRes({ ok: false, error: userError, code, durationMs });
  } catch (err) {
    console.error('[zapi-test-send] error', err);
    return jsonRes({ ok: false, error: (err as Error).message, code: 'internal_error', fallback: true });
  }
});

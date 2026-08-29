// outreach-zapi-webhook
// Webhook verificado para respostas/estados vindos da instância Z-API, dedicado ao
// módulo "Contacto 1:1 validado".
//
// Autenticação: apenas por header `x-webhook-secret`, validado contra
// whatsapp_zapi_connections.webhook_secret do MESMO workspace (fail-closed).
// PROIBIDO segredo em query string: qualquer pedido com `?secret=` é rejeitado.
// Respostas, opt-out e bloqueio criam supressão e param contactos futuros nesse workspace.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';
import { classifyInboundEvent } from '../_shared/outreach-guards.ts';

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function digits(raw?: string | null): string {
  return (raw ?? '').replace(/\D/g, '');
}

function extractText(payload: Record<string, unknown>): string | null {
  const t = payload.text;
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object') {
    const msg = (t as Record<string, unknown>).message;
    if (typeof msg === 'string') return msg;
  }
  if (typeof payload.body === 'string') return payload.body as string;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('ws');
    if (url.searchParams.has('secret') || url.searchParams.has('token')) {
      console.warn('[outreach-zapi-webhook] rejected: secret in query string');
      return jsonRes({ ok: false, error: 'secret_in_query_string_not_allowed' }, 400);
    }
    const secret = req.headers.get('x-webhook-secret');
    if (!workspaceId || !secret) return jsonRes({ ok: false, error: 'unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('id, webhook_secret')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    // fail-closed: sem ligação ou sem segredo correspondente não se processa nada
    if (!conn || !conn.webhook_secret || secret !== conn.webhook_secret) {
      console.warn(`[outreach-zapi-webhook] rejected ws=${workspaceId}`);
      return jsonRes({ ok: false, error: 'unauthorized' }, 401);
    }

    const payload = await req.json().catch(() => ({})) as Record<string, unknown>;
    const rawType = String(payload.type ?? payload.event ?? '').toLowerCase();
    const fromMe = payload.fromMe === true || payload.fromApi === true;
    const externalId = String(payload.messageId ?? payload.id ?? '');
    const phone = digits((payload.phone as string) ?? (payload.from as string) ?? '');

    let kind: 'message' | 'status' | 'block' = 'status';
    if (rawType.includes('block')) kind = 'block';
    else if (!fromMe && (rawType.includes('received') || rawType.includes('message'))) kind = 'message';

    const { suppression } = classifyInboundEvent({
      type: kind,
      text: extractText(payload),
      status: (payload.status as string) ?? null,
    });

    if (!suppression || !phone) {
      console.log(`[outreach-zapi-webhook] ws=${workspaceId} type=${rawType} no_action`);
      return jsonRes({ ok: true, action: 'none' });
    }

    // Resolver entidade dentro do MESMO workspace (isolamento estrito)
    const tail = phone.slice(-9);
    const targets: Array<{ entity_type: 'contact' | 'lead' | 'company'; entity_id: string; company_id: string | null }> = [];

    const [contacts, leads, companies] = await Promise.all([
      admin.from('contacts').select('id, company_id').eq('workspace_id', workspaceId).ilike('phone', `%${tail}`).limit(5),
      admin.from('leads').select('id').eq('workspace_id', workspaceId).ilike('phone', `%${tail}`).limit(5),
      admin.from('companies').select('id').eq('workspace_id', workspaceId).ilike('phone', `%${tail}`).limit(5),
    ]);

    for (const c of contacts.data ?? []) targets.push({ entity_type: 'contact', entity_id: c.id, company_id: c.company_id ?? null });
    for (const l of leads.data ?? []) targets.push({ entity_type: 'lead', entity_id: l.id, company_id: null });
    for (const co of companies.data ?? []) targets.push({ entity_type: 'company', entity_id: co.id, company_id: co.id });

    for (const t of targets) {
      await admin.from('outreach_suppressions').upsert({
        workspace_id: workspaceId,
        entity_type: t.entity_type,
        entity_id: t.entity_id,
        reason: suppression,
        channel: 'whatsapp',
        notes: 'Origem: webhook Z-API (automático)',
      }, { onConflict: 'workspace_id,entity_type,entity_id,reason' });

      await admin.from('outreach_events').insert({
        workspace_id: workspaceId,
        entity_type: t.entity_type,
        entity_id: t.entity_id,
        company_id: t.company_id,
        channel: 'whatsapp',
        event_type: 'stopped',
        reason: suppression,
        details: { source: 'zapi_webhook', external_message_id: externalId || null },
      });
    }

    console.log(
      `[outreach-zapi-webhook] ws=${workspaceId} suppression=${suppression} targets=${targets.length} msg=${externalId || 'n/a'}`,
    );

    return jsonRes({ ok: true, action: suppression, targets: targets.length });
  } catch (e) {
    console.error('[outreach-zapi-webhook] error', e instanceof Error ? e.message : String(e));
    return jsonRes({ ok: false, error: 'internal_error' });
  }
});

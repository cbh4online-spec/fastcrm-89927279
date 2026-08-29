// outreach-zapi-send
// Adaptador server-side do módulo "Contacto 1:1 validado" para a instância Z-API
// já existente do workspace (public.whatsapp_zapi_connections).
//
// BLOQUEADO POR DEFEITO: só executa depois de TODOS os guardas do outreach passarem
// e apenas se a ligação estiver explicitamente activada. Nesta fase o modo `live`
// não faz qualquer chamada externa — devolve sempre resultado simulado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  evaluateSendGuards,
  resolveSendMode,
  type GuardLimits,
  type OutreachLinkMode,
} from '../_shared/outreach-guards.ts';

// Enquanto a fase de envio real não for activada explicitamente, o adaptador
// nunca contacta o fornecedor. Mudar para true só depois de validação humana.
const LIVE_DISPATCH_ENABLED = false;

const DEFAULT_LIMITS: GuardLimits = { daily_limit: 20, per_company_limit: 2, cooldown_days: 14 };

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonRes({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const workspaceId = String(body.workspaceId ?? body.workspace_id ?? '');
    const entityType = String(body.entityType ?? '');
    const entityId = String(body.entityId ?? '');

    if (!workspaceId) return jsonRes({ error: 'workspaceId obrigatório' }, 400);
    if (!['company', 'contact', 'lead'].includes(entityType)) {
      return jsonRes({ error: 'entityType inválido' }, 400);
    }
    if (!entityId) return jsonRes({ error: 'entityId obrigatório' }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // --- isolamento por workspace ---------------------------------------
    const { data: membership } = await admin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!membership) return jsonRes({ error: 'Not a workspace member' }, 403);

    // --- estado do outreach (sempre lido no servidor) --------------------
    const [validationRes, suppressionRes, draftRes, settingsRes, linkRes, connRes] = await Promise.all([
      admin.from('outreach_validations').select('is_validated, legal_basis, allowed_channels')
        .eq('workspace_id', workspaceId).eq('entity_type', entityType).eq('entity_id', entityId).maybeSingle(),
      admin.from('outreach_suppressions').select('reason')
        .eq('workspace_id', workspaceId).eq('entity_type', entityType).eq('entity_id', entityId),
      admin.from('outreach_drafts').select('id, status, body')
        .eq('workspace_id', workspaceId).eq('entity_type', entityType).eq('entity_id', entityId).maybeSingle(),
      admin.from('outreach_settings').select('user_id, daily_limit, per_company_limit, cooldown_days')
        .eq('workspace_id', workspaceId),
      admin.from('outreach_channel_links').select('enabled, mode, instance_ref')
        .eq('workspace_id', workspaceId).eq('provider', 'zapi').maybeSingle(),
      admin.from('whatsapp_zapi_connections').select('instance_id, status')
        .eq('workspace_id', workspaceId).maybeSingle(),
    ]);

    // telefone resolvido no servidor a partir da própria entidade
    const table = entityType === 'company' ? 'companies' : entityType === 'contact' ? 'contacts' : 'leads';
    const selectCols = entityType === 'contact' ? 'phone, company_id' : 'phone';
    const { data: entityRow } = await admin
      .from(table).select(selectCols).eq('id', entityId).eq('workspace_id', workspaceId).maybeSingle();
    if (!entityRow) return jsonRes({ error: 'Entidade não encontrada neste workspace' }, 404);

    const phone = (entityRow as Record<string, unknown>).phone as string | null;
    const companyId = entityType === 'company'
      ? entityId
      : ((entityRow as Record<string, unknown>).company_id as string | null) ?? null;

    const settingsRows = (settingsRes.data ?? []) as Array<{
      user_id: string | null; daily_limit: number; per_company_limit: number; cooldown_days: number;
    }>;
    const mine = settingsRows.find((r) => r.user_id === userId);
    const wsLevel = settingsRows.find((r) => !r.user_id);
    const limits: GuardLimits = {
      daily_limit: mine?.daily_limit ?? wsLevel?.daily_limit ?? DEFAULT_LIMITS.daily_limit,
      per_company_limit: mine?.per_company_limit ?? wsLevel?.per_company_limit ?? DEFAULT_LIMITS.per_company_limit,
      cooldown_days: mine?.cooldown_days ?? wsLevel?.cooldown_days ?? DEFAULT_LIMITS.cooldown_days,
    };

    // utilização (limites e cooldown)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count: todayCount } = await admin
      .from('outreach_events').select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('created_by', userId)
      .eq('event_type', 'assisted_send').gte('created_at', startOfDay.toISOString());

    let companyCount = 0;
    if (companyId) {
      const { count } = await admin
        .from('outreach_events').select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId).eq('event_type', 'assisted_send')
        .eq('company_id', companyId).gte('created_at', startOfDay.toISOString());
      companyCount = count ?? 0;
    }

    const { data: lastEvent } = await admin
      .from('outreach_events').select('created_at')
      .eq('workspace_id', workspaceId).eq('entity_type', entityType).eq('entity_id', entityId)
      .eq('event_type', 'assisted_send').order('created_at', { ascending: false }).limit(1).maybeSingle();

    const guards = evaluateSendGuards({
      channel: 'whatsapp',
      phone,
      validation: validationRes.data as never,
      suppressions: (suppressionRes.data ?? []) as Array<{ reason: string }>,
      draft: draftRes.data as never,
      usage: {
        todayCount: todayCount ?? 0,
        companyCount,
        lastContactAt: lastEvent?.created_at ?? null,
      },
      limits,
    });

    const link = linkRes.data as { enabled: boolean; mode: OutreachLinkMode; instance_ref: string | null } | null;
    const conn = connRes.data as { instance_id: string | null; status: string | null } | null;

    const decision = resolveSendMode({
      guards,
      link: link ? { enabled: link.enabled, mode: link.mode } : null,
      connectionStatus: conn?.status ?? null,
    });

    const instanceRef = link?.instance_ref ?? (conn?.instance_id ? `${conn.instance_id.slice(0, 6)}…` : null);
    const draft = draftRes.data as { id: string; body: string } | null;

    // --- auditoria (sem conteúdo sensível) -------------------------------
    const outcome = decision.action === 'live' ? 'simulated' : decision.action === 'simulated' ? 'simulated' : 'blocked';
    const { data: attempt } = await admin.from('outreach_send_attempts').insert({
      workspace_id: workspaceId,
      entity_type: entityType,
      entity_id: entityId,
      company_id: companyId,
      channel: 'whatsapp',
      provider: 'zapi',
      mode: link?.mode ?? 'disabled',
      outcome,
      blocked_reason: decision.action === 'blocked' ? decision.reason ?? null : null,
      failed_checks: guards.failures,
      provider_message_id: null,
      instance_ref: instanceRef,
      draft_id: draft?.id ?? null,
      body_length: draft?.body?.length ?? null,
      requested_by: userId,
    }).select('id').maybeSingle();

    console.log(
      `[outreach-zapi-send] ws=${workspaceId} entity=${entityType}:${entityId} outcome=${outcome} mode=${link?.mode ?? 'disabled'} attempt=${attempt?.id ?? 'n/a'}`,
    );

    if (decision.action === 'blocked') {
      return jsonRes({
        success: false,
        outcome: 'blocked',
        reason: decision.reason,
        failures: guards.failures,
        attemptId: attempt?.id ?? null,
      });
    }

    // Fase actual: nunca contacta o fornecedor.
    if (!LIVE_DISPATCH_ENABLED || decision.action === 'simulated') {
      return jsonRes({
        success: true,
        outcome: 'simulated',
        simulated: true,
        message: 'Envio preparado e validado. Nenhuma mensagem foi enviada (modo de simulação segura).',
        instanceRef,
        attemptId: attempt?.id ?? null,
      });
    }

    // Ramo reservado para activação futura do envio real.
    return jsonRes({
      success: false,
      outcome: 'blocked',
      reason: 'live_dispatch_not_enabled',
      attemptId: attempt?.id ?? null,
    });
  } catch (e) {
    console.error('[outreach-zapi-send] error', e instanceof Error ? e.message : String(e));
    return jsonRes({ error: 'internal_error' }, 200);
  }
});

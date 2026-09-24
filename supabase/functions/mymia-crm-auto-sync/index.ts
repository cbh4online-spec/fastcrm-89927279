// FastCRM — Tarefa automática de sincronização com o CRM do mymia.world.
//
// Responsabilidade: correr sozinha (cron interno), trazer o que falta, verificar se
// existem atualizações e registar o resultado de cada execução de forma auditável.
//
// Segurança (fail-closed):
// - Só aceita chamadas internas com o service role (pg_cron / Trigger.dev / admin interno).
// - Nunca devolve chaves nem as escreve em logs.
// - Só processa workspaces com a sincronização automática explicitamente ligada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BATCH_LIMIT = 200;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Summary {
  received?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  activities?: number;
  conversations?: number;
  messages?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1) Guarda de chamada interna — antes de qualquer leitura ou escrita.
  //    Aceita service role (chamada interna direta) ou o segredo do agendador interno.
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  const cronSecret = req.headers.get("x-cron-secret");

  let internal = Boolean(bearer) && bearer === serviceKey;
  if (!internal && cronSecret) {
    const { data: cfg } = await admin
      .from("_cron_config")
      .select("value")
      .eq("key", "mymia_auto_sync_cron_secret")
      .maybeSingle();
    internal = Boolean(cfg?.value) && cfg!.value === cronSecret;
  }
  if (!internal) {
    if (!bearer && !cronSecret) {
      return json({ error: "unauthorized", reason: "missing_authorization" }, 401);
    }
    return json({ error: "forbidden", reason: "not_internal_caller" }, 403);
  }

  try {
    // 2) Workspaces com sincronização automática ligada.
    const { data: rows, error } = await admin
      .from("mymia_crm_sync_settings")
      .select(
        "workspace_id, source_url, pull_enabled, auto_sync_enabled, auto_sync_interval_minutes, last_auto_run_at",
      )
      .eq("auto_sync_enabled", true);

    if (error) {
      console.error("[mymia-crm-auto-sync] settings_error", error.message);
      return json({ ok: false, error: "settings_error" });
    }

    const now = Date.now();
    const processed: Record<string, unknown>[] = [];

    for (const cfg of rows ?? []) {
      const workspaceId = cfg.workspace_id as string;
      const interval = Math.max(5, Number(cfg.auto_sync_interval_minutes ?? 60));

      // 3) Respeita o intervalo configurado — evita corridas desnecessárias.
      if (cfg.last_auto_run_at) {
        const elapsedMin = (now - new Date(cfg.last_auto_run_at as string).getTime()) / 60000;
        if (elapsedMin < interval) {
          processed.push({ workspace_id: workspaceId, status: "ignorado", reason: "intervalo" });
          continue;
        }
      }

      const { data: run } = await admin
        .from("mymia_crm_sync_runs")
        .insert({ workspace_id: workspaceId, trigger: "auto", status: "running" })
        .select("id")
        .maybeSingle();

      const finish = async (status: string, reason: string | null, summary: Summary, err?: string) => {
        if (run?.id) {
          await admin
            .from("mymia_crm_sync_runs")
            .update({
              status,
              reason,
              summary,
              error: err ?? null,
              finished_at: new Date().toISOString(),
            })
            .eq("id", run.id);
        }
        await admin
          .from("mymia_crm_sync_settings")
          .update({
            last_auto_run_at: new Date().toISOString(),
            last_auto_run_status: status,
            last_auto_run_detail: { reason, ...summary },
          })
          .eq("workspace_id", workspaceId);
        processed.push({ workspace_id: workspaceId, status, reason, ...summary });
      };

      // 4) Configuração incompleta: não tenta às cegas, deixa o motivo visível.
      const sourceUrl = String(cfg.source_url ?? "").trim();
      if (!sourceUrl || cfg.pull_enabled !== true) {
        await finish("aguarda_configuracao", !sourceUrl ? "sem_endereco_origem" : "pull_desligado", {});
        continue;
      }

      // 5) Traz contactos, atividades e conversas de forma idempotente.
      let payload: (Summary & { ok?: boolean; reason?: string }) | null = null;
      let fetchError: string | null = null;
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/mymia-crm-pull`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            mode: "apply",
            limit: BATCH_LIMIT,
            include_conversations: true,
          }),
        });
        payload = await res.json().catch(() => null);
        if (!res.ok) fetchError = `pull_${res.status}`;
      } catch (e) {
        fetchError = (e as Error).message;
      }

      if (fetchError || !payload?.ok) {
        const reason = payload?.reason ?? fetchError ?? "origem_indisponivel";
        await admin.from("mymia_crm_sync_logs").insert({
          workspace_id: workspaceId,
          direction: "inbound",
          action: "auto_sync",
          status: "error",
          error: String(reason).slice(0, 500),
          details: {},
        });
        await finish("aguarda_origem", String(reason).slice(0, 200), {}, String(reason).slice(0, 500));
        continue;
      }

      const summary: Summary = {
        received: payload.received ?? 0,
        created: payload.created ?? 0,
        updated: payload.updated ?? 0,
        skipped: payload.skipped ?? 0,
        activities: payload.activities ?? 0,
        conversations: payload.conversations ?? 0,
        messages: payload.messages ?? 0,
      };

      await admin.from("mymia_crm_sync_logs").insert({
        workspace_id: workspaceId,
        direction: "inbound",
        action: "auto_sync",
        status: "ok",
        details: summary,
      });

      await finish("concluido", null, summary);
    }

    return json({ ok: true, workspaces: processed.length, processed });
  } catch (e) {
    console.error("[mymia-crm-auto-sync] fatal", (e as Error).message);
    return json({ ok: false, internal_error: true, error: "internal_error" });
  }
});

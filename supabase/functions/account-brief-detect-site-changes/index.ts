import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, currentRunId, previousRunId } = await req.json();
    if (!accountId || !workspaceId || !currentRunId) {
      return new Response(JSON.stringify({ error: "accountId, workspaceId, currentRunId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!previousRunId) {
      return new Response(JSON.stringify({ alerts: 0, message: "No previous run to compare" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current and previous briefs
    const [currentBrief, previousBrief] = await Promise.all([
      supabase.from("account_brief_briefs").select("*").eq("analysis_run_id", currentRunId).eq("account_id", accountId).maybeSingle(),
      supabase.from("account_brief_briefs").select("*").eq("analysis_run_id", previousRunId).eq("account_id", accountId).maybeSingle(),
    ]);

    // Fetch current and previous scores
    const [currentScore, previousScore] = await Promise.all([
      supabase.from("account_brief_scores").select("*").eq("analysis_run_id", currentRunId).eq("account_id", accountId).maybeSingle(),
      supabase.from("account_brief_scores").select("*").eq("analysis_run_id", previousRunId).eq("account_id", accountId).maybeSingle(),
    ]);

    // Fetch page counts
    const [currentPages, previousPages] = await Promise.all([
      supabase.from("account_brief_pages").select("id, page_type, title").eq("account_id", accountId).eq("workspace_id", workspaceId),
      // We can't easily filter pages by run, so we compare page counts and types
      supabase.from("account_brief_urls").select("id, url, page_type").eq("account_id", accountId).eq("workspace_id", workspaceId),
    ]);

    const alerts: Array<{
      alert_type: string;
      severity: string;
      commercial_relevance: string;
      title: string;
      summary: string;
      payload_json: Record<string, unknown>;
    }> = [];

    const cb = currentBrief.data;
    const pb = previousBrief.data;
    const cs = currentScore.data;
    const ps = previousScore.data;

    // 1. Score change detection
    if (cs && ps) {
      const diff = (cs.total_score || 0) - (ps.total_score || 0);
      if (Math.abs(diff) >= 10) {
        alerts.push({
          alert_type: "score_change",
          severity: Math.abs(diff) >= 20 ? "high" : "medium",
          commercial_relevance: "commercial",
          title: diff > 0 ? `Score subiu ${diff} pontos` : `Score desceu ${Math.abs(diff)} pontos`,
          summary: `Score anterior: ${ps.total_score}, atual: ${cs.total_score}. ${cs.reasoning_short || ""}`,
          payload_json: { previous: ps.total_score, current: cs.total_score, diff },
        });
      }
    }

    // 2. Executive summary change
    if (cb && pb && cb.executive_summary && pb.executive_summary) {
      if (cb.executive_summary !== pb.executive_summary) {
        alerts.push({
          alert_type: "summary_change",
          severity: "medium",
          commercial_relevance: "informative",
          title: "Resumo executivo alterado",
          summary: `O posicionamento ou proposta de valor da empresa pode ter mudado.`,
          payload_json: { previous: pb.executive_summary?.substring(0, 200), current: cb.executive_summary?.substring(0, 200) },
        });
      }
    }

    // 3. Growth signals change
    if (cb?.signals_json && pb?.signals_json) {
      const curSignals = (cb.signals_json as any)?.growth_signals || [];
      const prevSignals = (pb.signals_json as any)?.growth_signals || [];
      const newSignals = curSignals.filter((s: string) => !prevSignals.includes(s));
      if (newSignals.length > 0) {
        alerts.push({
          alert_type: "new_growth_signals",
          severity: "high",
          commercial_relevance: "commercial",
          title: `${newSignals.length} novo(s) sinal(is) de crescimento`,
          summary: newSignals.join(", "),
          payload_json: { new_signals: newSignals },
        });
      }
    }

    // 4. Offer/product changes
    if (cb?.offer_json && pb?.offer_json) {
      const curProducts = JSON.stringify(cb.offer_json);
      const prevProducts = JSON.stringify(pb.offer_json);
      if (curProducts !== prevProducts) {
        alerts.push({
          alert_type: "offer_change",
          severity: "medium",
          commercial_relevance: "commercial",
          title: "Oferta de produtos/serviços alterada",
          summary: "A estrutura de produtos ou serviços da empresa mudou.",
          payload_json: {},
        });
      }
    }

    // Insert alerts
    if (alerts.length > 0) {
      const rows = alerts.map((a) => ({
        workspace_id: workspaceId,
        account_id: accountId,
        current_run_id: currentRunId,
        previous_run_id: previousRunId,
        ...a,
      }));
      const { error: insertError } = await supabase
        .from("account_brief_change_alerts")
        .insert(rows);
      if (insertError) console.error("[DetectChanges] Insert error:", insertError);
    }

    console.log(`[DetectChanges] ${alerts.length} alerts generated for account ${accountId}`);

    return new Response(JSON.stringify({ alerts: alerts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[DetectChanges] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

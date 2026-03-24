import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, currentRunId } = await req.json();
    if (!accountId || !workspaceId || !currentRunId) {
      return new Response(JSON.stringify({ error: "accountId, workspaceId e currentRunId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get current and previous briefs
    const { data: briefs } = await supabase
      .from("account_brief_briefs")
      .select("*")
      .eq("account_id", accountId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(2);

    if (!briefs || briefs.length < 2) {
      return new Response(JSON.stringify({ success: true, diffs: [], message: "Sem análise anterior para comparar" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [current, previous] = briefs;
    const diffs: Array<{ diff_type: string; diff_label: string; diff_payload_json: Record<string, unknown> }> = [];

    // Compare executive summaries
    if (current.executive_summary !== previous.executive_summary) {
      diffs.push({
        diff_type: "summary_changed",
        diff_label: "Resumo executivo actualizado",
        diff_payload_json: { previous: previous.executive_summary?.substring(0, 200), current: current.executive_summary?.substring(0, 200) },
      });
    }

    // Compare scores
    const { data: scores } = await supabase
      .from("account_brief_scores")
      .select("total_score, score_label, analysis_run_id")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(2);

    if (scores && scores.length === 2) {
      const scoreDiff = (scores[0].total_score ?? 0) - (scores[1].total_score ?? 0);
      if (Math.abs(scoreDiff) >= 5) {
        diffs.push({
          diff_type: "score_changed",
          diff_label: `Score ${scoreDiff > 0 ? "subiu" : "desceu"} ${Math.abs(scoreDiff)} pontos`,
          diff_payload_json: { previous: scores[1].total_score, current: scores[0].total_score, delta: scoreDiff },
        });
      }
    }

    // Compare identity fields
    const curIdentity = current.identity_json as Record<string, unknown> | null;
    const prevIdentity = previous.identity_json as Record<string, unknown> | null;
    if (curIdentity && prevIdentity) {
      if (JSON.stringify(curIdentity.what_they_do) !== JSON.stringify(prevIdentity.what_they_do)) {
        diffs.push({
          diff_type: "identity_changed",
          diff_label: "Descrição da empresa alterada",
          diff_payload_json: { field: "what_they_do" },
        });
      }
    }

    // Compare signals
    const curSignals = (current.signals_json as any)?.growth_signals || [];
    const prevSignals = (previous.signals_json as any)?.growth_signals || [];
    const newSignals = curSignals.filter((s: string) => !prevSignals.includes(s));
    if (newSignals.length > 0) {
      diffs.push({
        diff_type: "new_signals",
        diff_label: `${newSignals.length} novo(s) sinal(is) de crescimento`,
        diff_payload_json: { new_signals: newSignals },
      });
    }

    // Check for new pages
    const { count: newPagesCount } = await supabase
      .from("account_brief_pages")
      .select("*", { count: "exact", head: true })
      .eq("account_id", accountId)
      .gt("created_at", previous.created_at);

    if (newPagesCount && newPagesCount > 0) {
      diffs.push({
        diff_type: "new_pages",
        diff_label: `${newPagesCount} nova(s) página(s) descoberta(s)`,
        diff_payload_json: { count: newPagesCount },
      });
    }

    // Persist diffs
    if (diffs.length > 0) {
      const previousRunId = previous.analysis_run_id;
      await supabase.from("account_brief_diff_events").insert(
        diffs.map((d) => ({
          workspace_id: workspaceId,
          account_id: accountId,
          current_run_id: currentRunId,
          previous_run_id: previousRunId,
          ...d,
        }))
      );
    }

    return new Response(JSON.stringify({ success: true, diffs: diffs.length, details: diffs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[diff-runs] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

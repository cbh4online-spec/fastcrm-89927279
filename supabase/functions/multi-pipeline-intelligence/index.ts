import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, supabaseKey);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const workspaceId = req.headers.get("x-workspace-id") || body.workspace_id;
    const forceRefresh = body.force_refresh === true;

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI Gate
    const gate = await aiGate(workspaceId, 'heavy', 'multi-pipeline-intelligence');
    if (!gate.allowed) {
      return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check cache
    if (!forceRefresh) {
      const { data: cached } = await client
        .from('multi_pipeline_intel_reports')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_stale', false)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return new Response(JSON.stringify({ report: cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Fetch pipelines
    const { data: pipelines } = await client
      .from("pipelines").select("id, name").eq("workspace_id", workspaceId);

    if (!pipelines?.length) {
      return new Response(JSON.stringify({ report: null, message: "No pipelines" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Stages
    const { data: stages } = await client
      .from("pipeline_stages").select("id, pipeline_id, name, expected_days")
      .eq("workspace_id", workspaceId);

    const stageMap = new Map<string, { pipeline_id: string; name: string }>()
    ;(stages ?? []).forEach(s => stageMap.set(s.id, { pipeline_id: s.pipeline_id, name: s.name }));

    // 4. All opportunities
    const { data: allOpps } = await client
      .from("opportunities")
      .select("id, stage_id, value, probability, status, source, created_at, updated_at, owner_id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500);

    const opps = allOpps ?? [];

    // 5. Compute per-pipeline stats
    const pipelineNames = new Map(pipelines.map(p => [p.id, p.name]));
    const pipelineBuckets = new Map<string, any[]>();

    opps.forEach(opp => {
      const stageInfo = stageMap.get(opp.stage_id);
      if (!stageInfo) return;
      const pid = stageInfo.pipeline_id;
      if (!pipelineBuckets.has(pid)) pipelineBuckets.set(pid, []);
      pipelineBuckets.get(pid)!.push(opp);
    });

    const pipelineStats = Array.from(pipelineBuckets.entries()).map(([pid, pOpps]) => {
      const active = pOpps.filter(o => !['won', 'lost'].includes(o.status));
      const won = pOpps.filter(o => o.status === 'won');
      const lost = pOpps.filter(o => o.status === 'lost');
      const closed = won.length + lost.length;
      const winRate = closed > 0 ? Math.round((won.length / closed) * 100) / 100 : 0;
      const totalValue = active.reduce((s, o) => s + (o.value ?? 0), 0);

      const cycleDays = won
        .map(o => Math.floor((new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 86400000))
        .filter(d => d > 0);
      const avgCycleDays = cycleDays.length > 0
        ? Math.floor(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) : 0;

      return {
        pipeline_id: pid, name: pipelineNames.get(pid) ?? pid,
        deal_count: active.length, total_value: totalValue, win_rate: winRate,
        avg_cycle_days: avgCycleDays, won_count: won.length, lost_count: lost.length,
        health_score: Math.round((winRate * 40) + (Math.min(active.length / 10, 1) * 30) + (totalValue > 0 ? Math.min(totalValue / 100000, 1) * 30 : 0)),
      };
    });

    // 6. Rep performance
    const repMap = new Map<string, any[]>();
    opps.filter(o => o.owner_id).forEach(opp => {
      if (!repMap.has(opp.owner_id)) repMap.set(opp.owner_id, []);
      repMap.get(opp.owner_id)!.push(opp);
    });

    const repStats = Array.from(repMap.entries()).map(([userId, rOpps]) => {
      const won = rOpps.filter(o => o.status === 'won');
      const closed = rOpps.filter(o => ['won', 'lost'].includes(o.status)).length;
      return {
        user_id: userId, name: userId.slice(0, 8),
        deal_count: rOpps.filter(o => !['won', 'lost'].includes(o.status)).length,
        total_value: rOpps.filter(o => !['won', 'lost'].includes(o.status)).reduce((s, o) => s + (o.value ?? 0), 0),
        win_rate: closed > 0 ? Math.round((won.length / closed) * 100) / 100 : 0,
        avg_cycle_days: 0,
      };
    }).sort((a, b) => b.win_rate - a.win_rate);

    // Best source
    const sourceMap = new Map<string, { won: number; total: number }>();
    opps.forEach(opp => {
      const src = opp.source ?? 'unknown';
      if (!sourceMap.has(src)) sourceMap.set(src, { won: 0, total: 0 });
      sourceMap.get(src)!.total++;
      if (opp.status === 'won') sourceMap.get(src)!.won++;
    });
    const bestSource = Array.from(sourceMap.entries())
      .filter(([, v]) => v.total >= 3)
      .sort(([, a], [, b]) => (b.won / b.total) - (a.won / a.total))[0]?.[0] ?? null;

    // 7. AI strategic analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiAnalysis: any = {};

    if (LOVABLE_API_KEY && pipelineStats.length > 0) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "És um director comercial experiente. Identifica padrões, bottlenecks e oportunidades. Usa português de Portugal." },
            { role: "user", content: `Analisa a performance cross-pipeline:\n${JSON.stringify({ pipelineStats, repStats: repStats.slice(0, 10), bestSource, totalOpps: opps.length }, null, 2)}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "multi_pipeline_analysis",
              description: "Cross-pipeline strategic analysis",
              parameters: {
                type: "object",
                properties: {
                  winning_patterns: { type: "array", items: { type: "string" } },
                  losing_patterns: { type: "array", items: { type: "string" } },
                  bottleneck_stages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        pipeline_id: { type: "string" }, stage_name: { type: "string" },
                        avg_days_stuck: { type: "integer" }, drop_rate: { type: "number" },
                        deal_count: { type: "integer" },
                      },
                      required: ["pipeline_id", "stage_name", "avg_days_stuck", "drop_rate", "deal_count"],
                    },
                  },
                  strategic_insights: { type: "array", items: { type: "string" } },
                  growth_opportunities: { type: "array", items: { type: "string" } },
                },
                required: ["winning_patterns", "losing_patterns", "strategic_insights", "growth_opportunities"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "multi_pipeline_analysis" } },
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try { aiAnalysis = JSON.parse(toolCall.function.arguments); } catch { /* ignore */ }
        }
      }
    }

    // 8. Invalidate old + persist
    await client
      .from('multi_pipeline_intel_reports')
      .update({ is_stale: true })
      .eq('workspace_id', workspaceId)
      .eq('is_stale', false);

    const { data: report, error: insertErr } = await client
      .from('multi_pipeline_intel_reports')
      .insert({
        workspace_id: workspaceId,
        pipeline_comparison: pipelineStats,
        winning_patterns: aiAnalysis.winning_patterns ?? [],
        losing_patterns: aiAnalysis.losing_patterns ?? [],
        best_source: bestSource,
        best_stage_velocity: {},
        rep_performance: repStats,
        bottleneck_stages: aiAnalysis.bottleneck_stages ?? [],
        strategic_insights: aiAnalysis.strategic_insights ?? [],
        growth_opportunities: aiAnalysis.growth_opportunities ?? [],
        forecast_accuracy: null,
        tokens_used: null,
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ report, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[MULTI-PIPELINE] Error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

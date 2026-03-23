import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { workspace_id, pipeline_id, force_refresh = false } = body;
    if (!workspace_id) throw new Error("workspace_id is required");

    // Verify workspace membership
    const { data: membership } = await userClient
      .from("workspace_members").select("id")
      .eq("workspace_id", workspace_id).eq("user_id", user.id).maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI Gate
    const gate = await aiGate(workspace_id, 'medium', 'ai-pipeline-risk');
    if (!gate.allowed) {
      return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Check persisted report cache
    if (!force_refresh) {
      let cacheQuery = supabase
        .from('pipeline_risk_reports')
        .select('*')
        .eq('workspace_id', workspace_id)
        .eq('is_stale', false)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1);

      if (pipeline_id) cacheQuery = cacheQuery.eq('pipeline_id', pipeline_id);
      else cacheQuery = cacheQuery.is('pipeline_id', null);

      const { data: cached } = await cacheQuery.maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({ report: cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Fetch open opportunities
    let oppsQuery = supabase
      .from("opportunities")
      .select("id, title, value, status, stage_id, probability, created_at, updated_at, expected_close_date, owner_id, contact_id")
      .eq("workspace_id", workspace_id)
      .in("status", ["open", "active", "in_progress"])
      .order("value", { ascending: false });

    if (pipeline_id) {
      const { data: stageIds } = await supabase
        .from("pipeline_stages").select("id").eq("pipeline_id", pipeline_id);
      if (stageIds?.length) {
        oppsQuery = oppsQuery.in("stage_id", stageIds.map(s => s.id));
      }
    }

    const { data: opportunities } = await oppsQuery;
    const opps = opportunities ?? [];

    if (opps.length === 0) {
      return new Response(JSON.stringify({ report: null, message: 'No active opportunities' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get stage names
    const stageIds = [...new Set(opps.map(o => o.stage_id))];
    const { data: stages } = await supabase
      .from("pipeline_stages").select("id, name")
      .in("id", stageIds);
    const stageNameMap = new Map((stages ?? []).map(s => [s.id, s.name]));

    // 4. Activity data
    const dealIds = opps.map(o => o.id);
    const { data: actLogs } = await supabase
      .from("activity_logs")
      .select("record_id, created_at")
      .eq("workspace_id", workspace_id)
      .in("record_id", dealIds.length > 0 ? dealIds : ["__none__"])
      .order("created_at", { ascending: false });

    const activityMap = new Map<string, Date>();
    (actLogs ?? []).forEach((a: any) => {
      if (!activityMap.has(a.record_id)) activityMap.set(a.record_id, new Date(a.created_at));
    });

    const now = Date.now();
    const enrichedOpps = opps.map((opp: any) => {
      const lastActivity = activityMap.get(opp.id) || new Date(opp.updated_at);
      const daysSinceActivity = Math.floor((now - lastActivity.getTime()) / 86400000);
      const daysToClose = opp.expected_close_date
        ? Math.floor((new Date(opp.expected_close_date).getTime() - now) / 86400000) : null;
      const ageDays = Math.floor((now - new Date(opp.created_at).getTime()) / 86400000);

      return {
        id: opp.id, name: opp.title, stage: stageNameMap.get(opp.stage_id) ?? 'Desconhecido',
        value: opp.value ?? 0, probability: opp.probability ?? 0,
        age_days: ageDays, days_since_activity: daysSinceActivity, days_to_close: daysToClose,
        is_stalled: daysSinceActivity > 7, is_overdue: daysToClose !== null && daysToClose < 0,
        close_date_risk: daysToClose !== null && daysToClose < 14,
        low_probability: (opp.probability ?? 0) < 30, no_recent_contact: daysSinceActivity > 14,
      };
    });

    // 5. AI analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "És um especialista em gestão de pipelines de vendas B2B. Analisa riscos com precisão. Usa português de Portugal." },
          { role: "user", content: `Analisa o risco deste pipeline com ${opps.length} oportunidades activas.\n\n${JSON.stringify(enrichedOpps.slice(0, 30), null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "pipeline_risk_analysis",
            description: "Return structured pipeline risk assessment",
            parameters: {
              type: "object",
              properties: {
                pipeline_health_score: { type: "integer", minimum: 0, maximum: 100 },
                executive_summary: { type: "string" },
                top_3_priorities: { type: "array", items: { type: "string" }, maxItems: 3 },
                risk_breakdown: {
                  type: "object",
                  properties: {
                    stalled: { type: "integer" }, overdue: { type: "integer" },
                    no_activity: { type: "integer" }, low_probability: { type: "integer" },
                    close_date_risk: { type: "integer" },
                  },
                },
                deal_risks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      opportunity_id: { type: "string" }, opportunity_name: { type: "string" },
                      stage: { type: "string" }, value: { type: "number" },
                      risk_type: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      description: { type: "string" }, recommended_action: { type: "string" },
                      days_stalled: { type: "integer" },
                    },
                    required: ["opportunity_id", "opportunity_name", "stage", "value", "risk_type", "severity", "description", "recommended_action"],
                  },
                },
                avg_deal_age_days: { type: "integer" },
              },
              required: ["pipeline_health_score", "executive_summary", "top_3_priorities", "risk_breakdown", "deal_risks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "pipeline_risk_analysis" } },
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Credits exhausted" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[AI-PIPELINE-RISK] AI error:", errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI returned no analysis");

    const analysis = JSON.parse(toolCall.function.arguments);
    const tokensUsed = (aiData.usage?.prompt_tokens ?? 0) + (aiData.usage?.completion_tokens ?? 0);

    // Compute aggregates
    const dealRisks = analysis.deal_risks ?? [];
    const atRiskDeals = dealRisks.filter((r: any) => ['high', 'critical'].includes(r.severity));
    const atRiskValue = atRiskDeals.reduce((s: number, r: any) => s + (r.value ?? 0), 0);
    const criticalCount = dealRisks.filter((r: any) => r.severity === 'critical').length;

    // 6. Invalidate old + persist
    await supabase
      .from('pipeline_risk_reports')
      .update({ is_stale: true })
      .eq('workspace_id', workspace_id)
      .eq('is_stale', false);

    const { data: report, error: insertErr } = await supabase
      .from('pipeline_risk_reports')
      .insert({
        workspace_id,
        pipeline_id: pipeline_id ?? null,
        pipeline_health_score: analysis.pipeline_health_score,
        at_risk_count: atRiskDeals.length,
        at_risk_value: atRiskValue,
        critical_count: criticalCount,
        risk_breakdown: analysis.risk_breakdown ?? {},
        deal_risks: dealRisks,
        avg_deal_age_days: analysis.avg_deal_age_days ?? null,
        avg_days_per_stage: {},
        conversion_rates: {},
        executive_summary: analysis.executive_summary,
        top_3_priorities: analysis.top_3_priorities ?? [],
        tokens_used: tokensUsed,
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ report, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[AI-PIPELINE-RISK] Error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_DEALS = 5;

interface PipelineBucket {
  pipeline_id: string;
  name: string;
  total_value: number;
  health_sum: number;
  deal_count: number;
  at_risk_count: number;
  velocity_ratios: number[];
}

interface PipelineIntelligence {
  pipeline_id: string;
  name: string;
  health_index: number;
  risk_ratio: number;
  forecast_confidence: number;
  velocity_index: number;
  revenue_share: number;
  deal_count: number;
  total_value: number;
}

async function emitKernelEvent(
  client: ReturnType<typeof createClient>,
  params: { workspace_id: string; type: string; entity_kind: string; entity_id: string; payload?: Record<string, unknown> }
) {
  try {
    await client.from("kernel_events").insert({
      workspace_id: params.workspace_id,
      type: params.type,
      entity_kind: params.entity_kind,
      entity_id: params.entity_id,
      source_module: "ai-analytics",
      actor_type: "system",
      payload: params.payload ?? {},
      occurred_at: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      schema_version: 1,
    });
  } catch (e) {
    console.warn("[AI-ANALYTICS] Failed to emit kernel event:", (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, supabaseKey);

    const workspaceId =
      req.headers.get("x-workspace-id") ||
      (await req.json().catch(() => ({}))).workspace_id;

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch pipelines
    const { data: pipelines } = await client
      .from("pipelines")
      .select("id, name")
      .eq("workspace_id", workspaceId);

    if (!pipelines || pipelines.length === 0) {
      return new Response(
        JSON.stringify({ pipelines: [], insights: [], generated_at: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch stages with expected_days
    const { data: stages } = await client
      .from("pipeline_stages")
      .select("id, pipeline_id, expected_days, probability")
      .eq("workspace_id", workspaceId);

    const stageMap = new Map<string, { pipeline_id: string; expected_days: number | null; probability: number | null }>();
    for (const s of stages || []) {
      stageMap.set(s.id, {
        pipeline_id: s.pipeline_id,
        expected_days: s.expected_days,
        probability: s.probability,
      });
    }

    // 3. Fetch open opportunities
    const { data: opps } = await client
      .from("opportunities")
      .select("id, stage_id, value, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["open", "active", "in_progress"]);

    // 4. Fetch deal intelligence cache
    const { data: healthCache } = await client
      .from("deal_intelligence_cache")
      .select("deal_id, payload")
      .eq("workspace_id", workspaceId)
      .is("invalidated_at", null)
      .gt("expires_at", new Date().toISOString());

    const healthMap = new Map<string, any>();
    for (const h of healthCache || []) {
      healthMap.set(h.deal_id, h.payload);
    }

    // 5. Aggregate into pipeline buckets
    const pipelineNames = new Map<string, string>();
    for (const p of pipelines) pipelineNames.set(p.id, p.name);

    const buckets = new Map<string, PipelineBucket>();

    for (const opp of opps || []) {
      const stageInfo = stageMap.get(opp.stage_id);
      if (!stageInfo) continue;
      const pid = stageInfo.pipeline_id;
      if (!pipelineNames.has(pid)) continue;

      if (!buckets.has(pid)) {
        buckets.set(pid, {
          pipeline_id: pid,
          name: pipelineNames.get(pid)!,
          total_value: 0,
          health_sum: 0,
          deal_count: 0,
          at_risk_count: 0,
          velocity_ratios: [],
        });
      }

      const bucket = buckets.get(pid)!;
      bucket.deal_count++;
      bucket.total_value += opp.value || 0;

      const health = healthMap.get(opp.id);
      if (health) {
        bucket.health_sum += health.health_score || 50;
        if (health.health_label === "AT_RISK") bucket.at_risk_count++;

        const stageDays = health.debug?.stage_days ?? health.stage_days ?? null;
        const expectedDays = stageInfo.expected_days;
        if (stageDays != null && expectedDays && expectedDays > 0) {
          bucket.velocity_ratios.push(stageDays / expectedDays);
        }
      } else {
        bucket.health_sum += 50; // neutral default
      }
    }

    // 6. Compute per-pipeline metrics
    const totalWorkspaceValue = Array.from(buckets.values()).reduce(
      (sum, b) => sum + b.total_value,
      0
    );

    const pipelineResults: PipelineIntelligence[] = [];

    for (const bucket of buckets.values()) {
      if (bucket.deal_count < MIN_DEALS) continue;

      const healthIndex = Math.round(bucket.health_sum / bucket.deal_count);
      const riskRatio = Math.round((bucket.at_risk_count / bucket.deal_count) * 100) / 100;
      const velocityIndex =
        bucket.velocity_ratios.length > 0
          ? Math.round(
              (bucket.velocity_ratios.reduce((a, b) => a + b, 0) /
                bucket.velocity_ratios.length) *
                100
            ) / 100
          : 1.0;
      const revenueShare =
        totalWorkspaceValue > 0
          ? Math.round((bucket.total_value / totalWorkspaceValue) * 100) / 100
          : 0;

      // Confidence: based on health distribution + data completeness
      const healthyRatio = healthIndex / 100;
      const dataRatio = bucket.velocity_ratios.length / bucket.deal_count;
      const confidence = Math.round((healthyRatio * 0.5 + dataRatio * 0.3 + (1 - riskRatio) * 0.2) * 100);

      pipelineResults.push({
        pipeline_id: bucket.pipeline_id,
        name: bucket.name,
        health_index: healthIndex,
        risk_ratio: riskRatio,
        forecast_confidence: Math.min(100, Math.max(0, confidence)),
        velocity_index: velocityIndex,
        revenue_share: revenueShare,
        deal_count: bucket.deal_count,
        total_value: bucket.total_value,
      });
    }

    // Sort by revenue share desc
    pipelineResults.sort((a, b) => b.revenue_share - a.revenue_share);

    // 7. Generate deterministic insights (max 5)
    const insights: string[] = [];

    // High risk
    const highRisk = pipelineResults.filter((p) => p.risk_ratio > 0.3);
    for (const p of highRisk) {
      if (insights.length >= 5) break;
      insights.push(
        `${p.name} shows high risk — ${Math.round(p.risk_ratio * 100)}% of deals are at risk.`
      );
    }

    // Slow velocity
    const slow = pipelineResults.filter((p) => p.velocity_index > 1.2);
    for (const p of slow) {
      if (insights.length >= 5) break;
      const pct = Math.round((p.velocity_index - 1) * 100);
      insights.push(`${p.name} is moving ${pct}% slower than benchmark.`);
    }

    // Revenue concentration
    const concentrated = pipelineResults.filter((p) => p.revenue_share > 0.6);
    for (const p of concentrated) {
      if (insights.length >= 5) break;
      insights.push(
        `Revenue concentrated: ${Math.round(p.revenue_share * 100)}% in ${p.name}.`
      );
    }

    // Low confidence
    const lowConf = pipelineResults.filter((p) => p.forecast_confidence < 50);
    for (const p of lowConf) {
      if (insights.length >= 5) break;
      insights.push(
        `${p.name} has low forecast confidence (${p.forecast_confidence}%).`
      );
    }

    // Best pipeline
    if (insights.length < 5 && pipelineResults.length > 0) {
      const best = pipelineResults.reduce((a, b) =>
        a.health_index > b.health_index ? a : b
      );
      insights.push(
        `${best.name} is your healthiest pipeline (score ${best.health_index}).`
      );
    }

    // Emit FORECAST.PIPELINE_ANALYZED kernel event
    await emitKernelEvent(client, {
      workspace_id: workspaceId,
      type: "FORECAST.PIPELINE_ANALYZED",
      entity_kind: "pipeline",
      entity_id: workspaceId,
      payload: {
        pipeline_count: pipelineResults.length,
        insights_count: insights.length,
      },
    });

    // Emit RISK.SIGNAL_DETECTED for high-risk pipelines
    for (const p of highRisk) {
      await emitKernelEvent(client, {
        workspace_id: workspaceId,
        type: "RISK.SIGNAL_DETECTED",
        entity_kind: "pipeline",
        entity_id: p.pipeline_id,
        payload: {
          pipeline_name: p.name,
          risk_ratio: p.risk_ratio,
          health_index: p.health_index,
        },
      });
    }

    console.log(`[AI-ANALYTICS] PIPELINE_ANALYZED workspace=${workspaceId} pipeline_count=${pipelineResults.length} insights_count=${insights.length}`);

    return new Response(
      JSON.stringify({
        pipelines: pipelineResults,
        insights,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[AI-ANALYTICS] MULTI_PIPELINE_INTELLIGENCE_FAILED", (err as Error).message || err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
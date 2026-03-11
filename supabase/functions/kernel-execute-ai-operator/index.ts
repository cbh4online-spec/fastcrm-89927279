import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * AI Operator Definitions
 * Each operator has a system prompt template and entity data requirements.
 */
const OPERATORS: Record<string, { name: string; systemPrompt: string; entityQuery: string }> = {
  sdr_operator: {
    name: "SDR Operator",
    systemPrompt: `You are an AI SDR (Sales Development Representative) for a CRM platform.
Your objective is to qualify leads and recommend next actions.
Analyze the lead data provided and return a JSON object with:
- qualification_score (0-100)
- qualification_status: "qualified" | "nurture" | "disqualified"
- reasoning: string explaining your analysis
- recommended_actions: array of { action: string, priority: "high"|"medium"|"low", timeframe: string }
- talking_points: array of strings for the sales rep
- objection_handling: array of { objection: string, response: string }
Respond ONLY with valid JSON.`,
    entityQuery: "leads",
  },
  deal_rescue: {
    name: "Deal Rescue Operator",
    systemPrompt: `You are an AI Deal Rescue specialist. A deal is at risk of being lost.
Analyze the deal/opportunity data and return a JSON object with:
- risk_level: "critical" | "high" | "medium"
- risk_factors: array of strings
- rescue_strategy: string describing the recommended approach
- recommended_actions: array of { action: string, priority: "high"|"medium"|"low", timeframe: string }
- win_probability_estimate: number (0-100)
- stakeholder_engagement: array of { role: string, action: string }
Respond ONLY with valid JSON.`,
    entityQuery: "opportunities",
  },
  churn_prevention: {
    name: "Churn Prevention Operator",
    systemPrompt: `You are an AI Churn Prevention specialist for a CRM.
Analyze the customer/contact data and their activity patterns to identify churn risk.
Return a JSON object with:
- churn_risk_score (0-100)
- churn_signals: array of strings describing detected warning signs
- retention_strategy: string
- recommended_actions: array of { action: string, priority: "high"|"medium"|"low", timeframe: string }
- engagement_suggestions: array of strings
- estimated_revenue_at_risk: string (description)
Respond ONLY with valid JSON.`,
    entityQuery: "contacts",
  },
  upsell_advisor: {
    name: "Upsell Advisor Operator",
    systemPrompt: `You are an AI Upsell/Cross-sell Advisor for a CRM platform.
Analyze customer purchase history and engagement data to identify expansion opportunities.
Return a JSON object with:
- upsell_score (0-100)
- opportunities: array of { product_suggestion: string, reasoning: string, estimated_value: string, confidence: number }
- timing_recommendation: string
- recommended_actions: array of { action: string, priority: "high"|"medium"|"low", timeframe: string }
- approach_strategy: string
Respond ONLY with valid JSON.`,
    entityQuery: "contacts",
  },
  lead_scorer: {
    name: "Lead Scoring Operator",
    systemPrompt: `You are an AI Lead Scoring specialist.
Analyze the lead data, interactions and engagement patterns.
Return a JSON object with:
- score (0-100)
- score_breakdown: { demographic: number, behavioral: number, engagement: number, fit: number }
- key_signals: array of strings
- recommended_segment: "hot" | "warm" | "cold" | "nurture"
- next_best_action: string
- reasoning: string
Respond ONLY with valid JSON.`,
    entityQuery: "leads",
  },
  general: {
    name: "General AI Operator",
    systemPrompt: `You are a general-purpose AI business analyst for a CRM platform.
Analyze the entity data provided and return actionable insights as JSON:
- analysis_summary: string
- key_findings: array of strings
- recommended_actions: array of { action: string, priority: "high"|"medium"|"low" }
- risk_factors: array of strings
- opportunities: array of strings
Respond ONLY with valid JSON.`,
    entityQuery: "leads",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { workspace_id, job_id, agent_type, entity_type, entity_id, objective, context } = body;

    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const operator = OPERATORS[agent_type] ?? OPERATORS.general;

    // Mark job as running
    if (job_id) {
      await supabase
        .from("ai_agent_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", job_id);
    }

    // Fetch entity data based on entity_type
    let entityData: Record<string, unknown> = {};
    const tableMap: Record<string, string> = {
      lead: "leads",
      contact: "contacts",
      company: "companies",
      opportunity: "opportunities",
      deal: "opportunities",
      invoice: "invoices",
      ticket: "tickets",
      order: "store_orders",
    };
    const tableName = tableMap[entity_type] ?? entity_type;

    try {
      const { data } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", entity_id)
        .maybeSingle();
      entityData = data ?? {};
    } catch {
      entityData = { id: entity_id, type: entity_type };
    }

    // Fetch recent activity for context
    let recentActivity: unknown[] = [];
    try {
      const { data: activities } = await supabase
        .from("activity_logs")
        .select("action, table_name, created_at, new_data")
        .eq("workspace_id", workspace_id)
        .eq("record_id", entity_id)
        .order("created_at", { ascending: false })
        .limit(10);
      recentActivity = activities ?? [];
    } catch {
      // Activity logs may not exist for this entity
    }

    // Build the prompt
    const userPrompt = `
Entity Type: ${entity_type}
Entity ID: ${entity_id}
${objective ? `Objective: ${objective}` : ""}
${context ? `Additional Context: ${JSON.stringify(context)}` : ""}

Entity Data:
${JSON.stringify(entityData, null, 2)}

Recent Activity (last 10):
${JSON.stringify(recentActivity, null, 2)}

Analyze this data and provide your assessment.`;

    // Call Lovable AI via the gateway
    const aiResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-gateway`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: operator.systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      }
    );

    let aiResult: Record<string, unknown> = {};
    let executiveSummary = "";

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData?.choices?.[0]?.message?.content ?? aiData?.result ?? "";

      // Parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        aiResult = { raw_response: content };
      }

      executiveSummary = (aiResult as any).analysis_summary
        ?? (aiResult as any).reasoning
        ?? (aiResult as any).rescue_strategy
        ?? (aiResult as any).retention_strategy
        ?? `${operator.name} analysis completed for ${entity_type} ${entity_id}`;
    } else {
      const errText = await aiResponse.text();
      throw new Error(`AI proxy error: ${aiResponse.status} - ${errText}`);
    }

    const durationMs = Date.now() - startTime;

    // Save execution to ai_agent_executions
    await supabase.from("ai_agent_executions").insert({
      workspace_id,
      agent_type,
      entity_type,
      entity_id,
      trigger_type: "kernel",
      executive_summary: executiveSummary.slice(0, 500),
      output: aiResult,
      input_summary: { objective, entity_type, entity_id },
      reasoning_trace: { operator: operator.name, prompt_length: userPrompt.length },
      duration_ms: durationMs,
      confidence_level: (aiResult as any).qualification_score > 70
        || (aiResult as any).score > 70
        || (aiResult as any).upsell_score > 70
        ? "high" : "medium",
      recommended_action: ((aiResult as any).recommended_actions?.[0] as any)?.action ?? null,
      key_signals: (aiResult as any).key_signals ?? (aiResult as any).churn_signals ?? (aiResult as any).risk_factors ?? [],
    });

    // Mark job as completed
    if (job_id) {
      await supabase
        .from("ai_agent_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job_id);
    }

    // Create follow-up actions from AI recommendations
    const recommendedActions = (aiResult as any).recommended_actions ?? [];
    for (const rec of recommendedActions.slice(0, 3)) {
      if (rec.priority === "high") {
        await supabase.from("kernel_action_runs").insert({
          workspace_id,
          action_key: "CREATE_TASK",
          input: {
            title: `[AI ${operator.name}] ${rec.action}`,
            related_type: entity_type,
            related_id: entity_id,
            priority: rec.priority,
            description: `Ação recomendada pelo AI Operator "${operator.name}". Timeframe: ${rec.timeframe ?? "N/A"}`,
          },
          status: "pending",
        });
      }
    }

    // Log observability
    supabase.from("system_function_runs").insert({
      workspace_id,
      function_name: "kernel-execute-ai-operator",
      module_id: "kernel",
      status: "success",
      latency_ms: durationMs,
    }).then(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        agent_type,
        operator: operator.name,
        entity_id,
        result: aiResult,
        duration_ms: durationMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMsg = (err as Error).message;

    // Mark job as failed if we have job_id
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.job_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("ai_agent_jobs")
          .update({ status: "failed", error_message: errorMsg, completed_at: new Date().toISOString() })
          .eq("id", body.job_id);
      }
    } catch { /* ignore cleanup errors */ }

    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

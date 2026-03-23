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
    const { opportunity_id, workspace_id, force_refresh = false } = await req.json();
    if (!opportunity_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "opportunity_id and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // AI Gate
    const gate = await aiGate(workspace_id, 'heavy', 'deal-intelligence-ai');
    if (!gate.allowed) {
      return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check cache
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from('deal_intelligence_reports')
        .select('*')
        .eq('opportunity_id', opportunity_id)
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

    // 2. Fetch opportunity with context
    const { data: opportunity, error: oppErr } = await supabase
      .from('opportunities')
      .select(`
        id, title, stage_id, value, probability, status,
        created_at, updated_at, expected_close_date, notes, source, owner_id,
        contact_id, lead_id, company_id,
        stage:pipeline_stages(id, name, position, expected_days)
      `)
      .eq('id', opportunity_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (oppErr || !opportunity) {
      return new Response(JSON.stringify({ error: 'Opportunity not found' }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch contact info
    let contactInfo: any = null;
    if (opportunity.contact_id) {
      const { data } = await supabase
        .from('contacts')
        .select('id, name, email, company, tags')
        .eq('id', opportunity.contact_id)
        .maybeSingle();
      contactInfo = data;
    }

    // 4. Fetch recent activities
    const { data: activities } = await supabase
      .from('crm_activities')
      .select('activity_type, description, created_at')
      .eq('entity_type', 'opportunity')
      .eq('entity_id', opportunity_id)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })
      .limit(20);

    // 5. Fetch historical deals for benchmarking
    const { data: historicalDeals } = await supabase
      .from('opportunities')
      .select('stage_id, value, status, created_at, updated_at')
      .eq('workspace_id', workspace_id)
      .in('status', ['won', 'lost'])
      .order('created_at', { ascending: false })
      .limit(30);

    // 6. Compute days since last activity
    const lastActivityDate = activities?.[0]?.created_at
      ? new Date(activities[0].created_at)
      : new Date(opportunity.updated_at);
    const daysSinceActivity = Math.floor(
      (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 7. Build AI prompt
    const stageName = (opportunity.stage as any)?.name ?? 'desconhecido';
    const systemPrompt = `És um coach de vendas especialista com 15 anos de experiência em B2B SaaS. 
Analisa deals de CRM com precisão cirúrgica e fornece coaching accionável.
Usa português de Portugal. Sê directo, honesto e accionável.`;

    const userPrompt = `Analisa este deal e fornece intelligence completa.

## Deal
Nome: ${opportunity.title}
Stage: ${stageName}
Valor: €${(opportunity.value ?? 0).toLocaleString('pt-PT')}
Probabilidade: ${opportunity.probability ?? 0}%
Criado: ${new Date(opportunity.created_at).toLocaleDateString('pt-PT')}
Fecho esperado: ${opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toLocaleDateString('pt-PT') : 'não definida'}
Dias sem actividade: ${daysSinceActivity}
Notas: ${opportunity.notes ?? 'nenhuma'}

## Contacto
${JSON.stringify(contactInfo ?? {}, null, 2)}

## Actividades recentes (${activities?.length ?? 0})
${JSON.stringify(activities?.slice(0, 10) ?? [], null, 2)}

## Deals históricos (${historicalDeals?.length ?? 0} fechados)
Won: ${historicalDeals?.filter(d => d.status === 'won').length ?? 0}
Lost: ${historicalDeals?.filter(d => d.status === 'lost').length ?? 0}`;

    // 8. Call Lovable AI with tool calling
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "deal_intelligence_report",
            description: "Return structured deal intelligence analysis",
            parameters: {
              type: "object",
              properties: {
                win_probability: { type: "integer", minimum: 0, maximum: 100 },
                confidence_level: { type: "string", enum: ["low", "medium", "high"] },
                health_score: { type: "integer", minimum: 0, maximum: 100 },
                health_trend: { type: "string", enum: ["improving", "stable", "declining"] },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative", "unknown"] },
                sentiment_reasoning: { type: "string" },
                stall_risk: { type: "boolean" },
                risk_signals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      description: { type: "string" },
                    },
                    required: ["type", "severity", "description"],
                  },
                },
                next_actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "integer" },
                      action: { type: "string" },
                      rationale: { type: "string" },
                      due_days: { type: "integer" },
                    },
                    required: ["priority", "action", "rationale", "due_days"],
                  },
                },
                coaching_summary: { type: "string" },
                key_strengths: { type: "array", items: { type: "string" } },
                key_weaknesses: { type: "array", items: { type: "string" } },
                competitive_intel: { type: "string" },
                stakeholder_analysis: { type: "string" },
              },
              required: ["win_probability", "confidence_level", "health_score", "health_trend",
                         "sentiment", "stall_risk", "risk_signals", "next_actions", "coaching_summary"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "deal_intelligence_report" } },
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente mais tarde." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[DEAL-INTEL-AI] AI error:", errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    const tokensUsed = (aiData.usage?.prompt_tokens ?? 0) + (aiData.usage?.completion_tokens ?? 0);

    // 9. Fetch previous report for delta
    const { data: previousReport } = await supabase
      .from('deal_intelligence_reports')
      .select('win_probability')
      .eq('opportunity_id', opportunity_id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const winProbabilityDelta = previousReport
      ? analysis.win_probability - previousReport.win_probability
      : null;

    // 10. Mark old as stale
    await supabase
      .from('deal_intelligence_reports')
      .update({ is_stale: true })
      .eq('opportunity_id', opportunity_id)
      .eq('is_stale', false);

    // 11. Insert new report
    const { data: report, error: insertErr } = await supabase
      .from('deal_intelligence_reports')
      .insert({
        workspace_id,
        opportunity_id,
        win_probability: analysis.win_probability,
        win_probability_delta: winProbabilityDelta,
        confidence_level: analysis.confidence_level,
        health_score: analysis.health_score,
        health_trend: analysis.health_trend,
        risk_signals: analysis.risk_signals ?? [],
        next_actions: analysis.next_actions ?? [],
        coaching_summary: analysis.coaching_summary,
        key_strengths: analysis.key_strengths ?? [],
        key_weaknesses: analysis.key_weaknesses ?? [],
        competitive_intel: analysis.competitive_intel ?? null,
        stakeholder_analysis: analysis.stakeholder_analysis ?? null,
        sentiment: analysis.sentiment,
        sentiment_reasoning: analysis.sentiment_reasoning ?? null,
        days_since_activity: daysSinceActivity,
        stall_risk: analysis.stall_risk,
        tokens_used: tokensUsed,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[DEAL-INTEL-AI] Insert error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ report, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DEAL-INTEL-AI] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

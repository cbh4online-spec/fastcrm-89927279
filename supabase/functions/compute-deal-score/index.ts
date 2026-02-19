import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { workspace_id, opportunity_id } = body;

    if (!workspace_id || !opportunity_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id and opportunity_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS for reading and writing
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parallel data fetch
    const [oppResult, activitiesResult, meetingsResult, tasksResult] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*, stage:pipeline_stages(id, name, probability), contact:contacts(id), lead:leads(id)")
        .eq("id", opportunity_id)
        .eq("workspace_id", workspace_id)
        .maybeSingle(),

      supabase
        .from("crm_activities")
        .select("activity_type, created_at, metadata")
        .eq("opportunity_id", opportunity_id)
        .order("created_at", { ascending: false })
        .limit(30),

      supabase
        .from("meetings")
        .select("id, start_time, status")
        .eq("opportunity_id", opportunity_id)
        .gte("start_time", new Date().toISOString())
        .eq("status", "confirmed")
        .limit(5),

      supabase
        .from("tasks")
        .select("id, status, due_at")
        .eq("related_id", opportunity_id)
        .eq("related_type", "opportunity")
        .in("status", ["todo", "in_progress"]),
    ]);

    const opportunity = oppResult.data;
    if (!opportunity) {
      return new Response(
        JSON.stringify({ error: "Opportunity not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch conversation signals via contact_id or lead_id
    const contactId = opportunity.contact_id || opportunity.contact?.id;
    const leadId = opportunity.lead_id || opportunity.lead?.id;

    let signals = null;
    if (contactId || leadId) {
      const signalsQuery = supabase
        .from("conversation_signals")
        .select("temperature, trust_score, churn_risk, buying_intent_score, main_objection");
      
      const signalsResult = contactId
        ? await signalsQuery.eq("contact_id", contactId).maybeSingle()
        : await signalsQuery.eq("lead_id", leadId).maybeSingle();
      
      signals = signalsResult.data;
    }

    const activities = activitiesResult.data || [];
    const meetings = meetingsResult.data || [];
    const tasks = tasksResult.data || [];
    const hasUpcomingMeeting = meetings.length > 0;

    // ─── SCORING COMPONENTS ──────────────────────────────────────────────────

    // 1. Engagement Score (based on activity count in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivities = activities.filter(
      (a) => new Date(a.created_at) >= thirtyDaysAgo
    );
    let engagement_score: number;
    if (recentActivities.length > 10) engagement_score = 1.0;
    else if (recentActivities.length >= 5) engagement_score = 0.7;
    else if (recentActivities.length >= 2) engagement_score = 0.4;
    else engagement_score = 0.1;

    // 2. Recency Score (based on last_activity_at or updated_at)
    const lastActivityDate = opportunity.last_activity_at
      ? new Date(opportunity.last_activity_at)
      : opportunity.updated_at
      ? new Date(opportunity.updated_at)
      : new Date(opportunity.created_at);

    const daysSinceActivity = Math.floor(
      (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    let recency_score: number;
    if (daysSinceActivity < 2) recency_score = 1.0;
    else if (daysSinceActivity < 7) recency_score = 0.75;
    else if (daysSinceActivity < 14) recency_score = 0.4;
    else if (daysSinceActivity < 30) recency_score = 0.15;
    else recency_score = 0.0;

    // 3. Trust Score (from conversation_signals, fallback to stage probability)
    let trust_score: number;
    if (signals?.trust_score != null) {
      trust_score = Number(signals.trust_score) > 1
        ? Number(signals.trust_score) / 100
        : Number(signals.trust_score);
    } else {
      const stageProbability = opportunity.stage?.probability ?? opportunity.probability ?? 50;
      trust_score = stageProbability / 100;
    }
    trust_score = Math.min(1, Math.max(0, trust_score));

    // 4. Objection Penalty (from main_objection)
    const objectionMap: Record<string, number> = {
      none: 0.0,
      no_need: 1.0,
      price: 0.8,
      competitor: 0.8,
      authority: 0.5,
      timing: 0.5,
      uncertainty: 0.3,
      confusion: 0.3,
    };
    const objection_penalty = signals?.main_objection
      ? (objectionMap[signals.main_objection] ?? 0.3)
      : 0.0;

    // 5. Intent Score (composite from buying_intent, temperature, meeting bonus)
    const tempMap: Record<string, number> = {
      ready_to_buy: 1.0,
      evaluating: 0.6,
      stalling: 0.3,
      cold: 0.1,
      lost: 0.0,
    };
    const tempScore = signals?.temperature ? (tempMap[signals.temperature] ?? 0.3) : 0.3;

    let buyingIntentRaw = signals?.buying_intent_score != null
      ? Number(signals.buying_intent_score)
      : null;
    if (buyingIntentRaw != null && buyingIntentRaw > 1) buyingIntentRaw = buyingIntentRaw / 100;

    const intentBase = buyingIntentRaw != null
      ? (buyingIntentRaw * 0.6 + tempScore * 0.4)
      : tempScore;

    const meetingBonus = hasUpcomingMeeting ? 0.15 : 0.0;
    const intent_score = Math.min(1, intentBase + meetingBonus);

    // 6. Historical Similarity (stage probability proxy)
    const stageProbability = opportunity.stage?.probability ?? opportunity.probability ?? 50;
    const historical_similarity = stageProbability / 100;

    // ─── FINAL FORMULA ───────────────────────────────────────────────────────
    const raw_score =
      0.25 * engagement_score +
      0.20 * intent_score +
      0.20 * trust_score +
      0.15 * recency_score +
      0.10 * historical_similarity -
      0.10 * objection_penalty;

    const close_score = Math.min(100, Math.max(0, Math.round(raw_score * 100 * 10) / 10));

    // ─── CATEGORY ────────────────────────────────────────────────────────────
    let category: string;
    if (close_score >= 81) category = "hot";
    else if (close_score >= 61) category = "likely";
    else if (close_score >= 31) category = "uncertain";
    else category = "low";

    // ─── URGENCY ─────────────────────────────────────────────────────────────
    const churnRisk = signals?.churn_risk != null
      ? (Number(signals.churn_risk) > 1 ? Number(signals.churn_risk) / 100 : Number(signals.churn_risk))
      : 0;

    let urgency: string;
    if (churnRisk > 0.7 || recency_score < 0.2) urgency = "critical";
    else if (category === "hot" && !hasUpcomingMeeting) urgency = "high";
    else urgency = "normal";

    // ─── NEXT ACTION ─────────────────────────────────────────────────────────
    let next_action: string | null = null;
    if (category === "hot" && !hasUpcomingMeeting) {
      next_action = "Agendar reunião com o cliente";
    } else if (signals?.main_objection === "price" || signals?.main_objection === "competitor") {
      next_action = "Enviar resposta personalizada à objeção de preço";
    } else if (recency_score < 0.2) {
      next_action = `Follow-up urgente — sem actividade há ${daysSinceActivity} dias`;
    } else if (churnRisk > 0.7) {
      next_action = "Escalar: risco de churn elevado";
    } else if (category === "low") {
      next_action = "Qualificar melhor a oportunidade";
    }

    // ─── UPSERT ──────────────────────────────────────────────────────────────
    const { data: upserted, error: upsertError } = await supabase
      .from("deal_scores")
      .upsert(
        {
          workspace_id,
          opportunity_id,
          close_score,
          category,
          urgency,
          next_action,
          score_breakdown: {
            engagement_score,
            recency_score,
            trust_score,
            objection_penalty,
            intent_score,
            historical_similarity,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "opportunity_id" }
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, data: upserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compute-deal-score error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

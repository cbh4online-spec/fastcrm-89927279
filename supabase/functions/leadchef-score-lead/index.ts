import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScoreRequest {
  workspaceId: string;
  leadId?: string; // se não fornecido => batch para todos os leads ativos do workspace
}

interface ScoreBreakdown {
  stage: number;
  freshness: number;
  nextAction: number;
  temperature: number;
  origin: number;
}

const STAGE_WEIGHT: Record<string, number> = {
  new: 10,
  to_contact: 15,
  in_conversation: 25,
  demo_scheduled: 35,
  demo_done: 30,
  proposal_decision: 40,
  won: 0,
  lost: 0,
  reactivate_later: 5,
};

const TEMP_WEIGHT: Record<string, number> = {
  cold: 0,
  warm: 10,
  hot: 20,
};

function computeScore(profile: any): { score: number; breakdown: ScoreBreakdown; isCold: boolean } {
  const now = Date.now();
  const updated = new Date(profile.updated_at).getTime();
  const ageDays = Math.max(0, (now - updated) / 86400000);

  // Freshness: 25 max, decai 1 ponto/dia
  const freshness = Math.max(0, 25 - Math.floor(ageDays));

  // Next action: 20 se tem ação no futuro, 10 se tem mas atrasada, 0 se não tem
  let nextAction = 0;
  if (profile.next_action_at) {
    const naTime = new Date(profile.next_action_at).getTime();
    nextAction = naTime >= now ? 20 : 10;
  }

  const stage = STAGE_WEIGHT[profile.stage] ?? 10;
  const temperature = TEMP_WEIGHT[profile.temperature] ?? 5;
  const origin = profile.origin ? 5 : 0;

  const score = Math.min(100, Math.max(0, stage + freshness + nextAction + temperature + origin));
  const isCold =
    score < 30 ||
    (ageDays > 7 && (profile.stage !== "won" && profile.stage !== "lost"));

  return {
    score,
    breakdown: { stage, freshness, nextAction, temperature, origin },
    isCold,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ScoreRequest;
    const { workspaceId, leadId } = body;

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const query = supabase
      .from("leadchef_lead_profiles")
      .select("lead_id, workspace_id, stage, temperature, origin, next_action_at, updated_at")
      .eq("workspace_id", workspaceId);

    if (leadId) query.eq("lead_id", leadId);
    else query.not("stage", "in", "(won,lost)");

    const { data: profiles, error } = await query;
    if (error) throw error;

    let updated = 0;
    for (const p of profiles ?? []) {
      const { score, breakdown, isCold } = computeScore(p);
      const { error: upErr } = await supabase
        .from("leadchef_lead_scores")
        .upsert(
          {
            lead_id: p.lead_id,
            workspace_id: p.workspace_id,
            score,
            breakdown,
            is_cold: isCold,
            calculated_at: new Date().toISOString(),
          },
          { onConflict: "lead_id" }
        );
      if (!upErr) updated++;
    }

    return new Response(JSON.stringify({ updated, total: profiles?.length ?? 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[leadchef-score-lead] error", e);
    return new Response(
      JSON.stringify({ error: "internal_error", fallback: true, updated: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

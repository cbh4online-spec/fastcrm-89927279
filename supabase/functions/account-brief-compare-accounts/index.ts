import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Não autorizado");

    const { workspace_id, account_ids } = await req.json();
    if (!workspace_id || !account_ids || account_ids.length < 2 || account_ids.length > 5) {
      return new Response(JSON.stringify({ error: "Selecione entre 2 e 5 contas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace access
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Sem acesso" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch accounts with briefs and scores
    const { data: accounts } = await supabase
      .from("account_brief_accounts")
      .select("id, name, domain, total_score, score_label, probable_sector, probable_geography, executive_summary, commercial_status, favorite")
      .eq("workspace_id", workspace_id)
      .in("id", account_ids);

    if (!accounts || accounts.length < 2) {
      return new Response(JSON.stringify({ error: "Contas não encontradas" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch latest briefs
    const briefsPromises = account_ids.map(async (id: string) => {
      const { data } = await supabase
        .from("account_brief_briefs")
        .select("executive_summary, identity_json, offer_json, signals_json, personalization_json")
        .eq("account_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { account_id: id, brief: data };
    });

    const briefs = await Promise.all(briefsPromises);

    // Fetch latest scores
    const scoresPromises = account_ids.map(async (id: string) => {
      const { data } = await supabase
        .from("account_brief_scores")
        .select("total_score, icp_fit_score, growth_score, maturity_score, personalization_score, score_label")
        .eq("account_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { account_id: id, score: data };
    });

    const scores = await Promise.all(scoresPromises);

    // Build comparison context
    const accountSummaries = accounts.map((acc: any) => {
      const brief = briefs.find(b => b.account_id === acc.id)?.brief;
      const score = scores.find(s => s.account_id === acc.id)?.score;
      return {
        name: acc.name,
        domain: acc.domain,
        sector: acc.probable_sector,
        geography: acc.probable_geography,
        status: acc.commercial_status,
        total_score: score?.total_score ?? acc.total_score,
        score_label: score?.score_label ?? acc.score_label,
        icp_fit: score?.icp_fit_score,
        growth: score?.growth_score,
        maturity: score?.maturity_score,
        personalization: score?.personalization_score,
        executive_summary: brief?.executive_summary || acc.executive_summary,
        identity: brief?.identity_json,
        offer: brief?.offer_json,
        signals: brief?.signals_json,
        personalization_data: brief?.personalization_json,
      };
    });

    // Call Lovable AI for comparison
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let summaryJson: Record<string, unknown>;

    if (LOVABLE_API_KEY) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `És um analista comercial B2B. Compara as contas fornecidas e gera um sumário comparativo estruturado em português de Portugal. Usa a tool 'comparison_summary' para retornar o resultado.`,
            },
            {
              role: "user",
              content: `Compara estas ${accountSummaries.length} contas:\n\n${JSON.stringify(accountSummaries, null, 2)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "comparison_summary",
                description: "Retorna sumário comparativo estruturado",
                parameters: {
                  type: "object",
                  properties: {
                    ranking: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          position: { type: "number" },
                          reasoning: { type: "string" },
                        },
                        required: ["name", "position", "reasoning"],
                      },
                    },
                    best_bet: { type: "object", properties: { name: { type: "string" }, reason: { type: "string" } }, required: ["name", "reason"] },
                    most_mature: { type: "object", properties: { name: { type: "string" }, reason: { type: "string" } }, required: ["name", "reason"] },
                    highest_urgency: { type: "object", properties: { name: { type: "string" }, reason: { type: "string" } }, required: ["name", "reason"] },
                    best_personalization: { type: "object", properties: { name: { type: "string" }, reason: { type: "string" } }, required: ["name", "reason"] },
                    executive_summary: { type: "string" },
                    key_differences: { type: "array", items: { type: "string" } },
                  },
                  required: ["ranking", "best_bet", "most_mature", "highest_urgency", "best_personalization", "executive_summary", "key_differences"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "comparison_summary" } },
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          summaryJson = JSON.parse(toolCall.function.arguments);
        } else {
          summaryJson = buildFallbackSummary(accountSummaries);
        }
      } else {
        summaryJson = buildFallbackSummary(accountSummaries);
      }
    } else {
      summaryJson = buildFallbackSummary(accountSummaries);
    }

    // Persist
    const { data: run, error: insertError } = await supabase
      .from("account_brief_comparison_runs")
      .insert({
        workspace_id,
        account_ids,
        summary_json: summaryJson,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, run }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compare error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildFallbackSummary(accounts: any[]) {
  const sorted = [...accounts].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  return {
    ranking: sorted.map((a, i) => ({ name: a.name, position: i + 1, reasoning: `Score: ${a.total_score || 0}` })),
    best_bet: { name: sorted[0]?.name || "", reason: "Maior score total" },
    most_mature: { name: sorted[0]?.name || "", reason: "Maior maturidade detectada" },
    highest_urgency: { name: sorted[0]?.name || "", reason: "Baseado em sinais disponíveis" },
    best_personalization: { name: sorted[0]?.name || "", reason: "Maior potencial de personalização" },
    executive_summary: `Comparação de ${accounts.length} contas. A conta ${sorted[0]?.name} lidera com score ${sorted[0]?.total_score || 0}.`,
    key_differences: ["Diferenças de score", "Setores distintos", "Geografias variadas"],
  };
}

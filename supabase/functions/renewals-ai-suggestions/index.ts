import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_id } = await req.json();
    if (!contract_id) throw new Error("contract_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch contract data
    const { data: contract, error: cErr } = await supabase
      .from("renewal_contracts")
      .select("*, company:companies(id, name)")
      .eq("id", contract_id)
      .single();

    if (cErr || !contract) throw new Error("Contract not found");

    // Fetch items
    const { data: items } = await supabase
      .from("renewal_items")
      .select("*")
      .eq("contract_id", contract_id);

    // Fetch recent events
    const { data: events } = await supabase
      .from("renewal_events")
      .select("event_type, payload_json, created_at")
      .eq("contract_id", contract_id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch usage
    const { data: usage } = await supabase
      .from("renewal_usage_entries")
      .select("usage_type, amount, unit, created_at")
      .eq("contract_id", contract_id)
      .order("created_at", { ascending: false })
      .limit(30);

    // Build context for AI
    const context = {
      company: contract.company?.name || "Unknown",
      status: contract.status,
      health_score: contract.health_score,
      risk_level: contract.risk_level,
      total_mrr: contract.total_mrr,
      next_renewal_date: contract.next_renewal_date,
      renewal_interval: contract.renewal_interval,
      auto_renew: contract.auto_renew,
      items: (items || []).map((i: any) => ({
        name: i.name,
        type: i.item_type,
        status: i.status,
        qty: i.qty,
        unit_price: i.unit_price,
        next_renewal: i.next_renewal_date,
        meta: i.meta_json,
      })),
      recent_events: (events || []).slice(0, 10).map((e: any) => ({
        type: e.event_type,
        date: e.created_at,
      })),
      usage_last_30: (usage || []).map((u: any) => ({
        type: u.usage_type,
        amount: u.amount,
        date: u.created_at,
      })),
    };

    const systemPrompt = `You are a CRM renewal analyst. Analyze the contract data and provide actionable suggestions in Portuguese (pt-PT).

Return a JSON array of suggestions. Each suggestion must have:
- type: "upsell" | "risk_mitigation" | "downgrade" | "optimization"
- title: short title (max 60 chars)
- description: actionable description (max 200 chars)
- priority: "high" | "medium" | "low"
- cta_label: button label for the action (max 25 chars)
- cta_action: "create_proposal" | "renew_now" | "contact_client" | "adjust_pack"

Rules:
- Max 3 suggestions
- Base on REAL data only, never invent
- If hours pack is low, suggest upsell
- If overdue, suggest risk mitigation
- If usage is very low for 3+ months, suggest downgrade
- Be specific and reference actual item names`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Contract data:\n${JSON.stringify(context, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "provide_suggestions",
            description: "Return renewal suggestions based on contract analysis",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["upsell", "risk_mitigation", "downgrade", "optimization"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      cta_label: { type: "string" },
                      cta_action: { type: "string", enum: ["create_proposal", "renew_now", "contact_client", "adjust_pack"] },
                    },
                    required: ["type", "title", "description", "priority", "cta_label", "cta_action"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "provide_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions = [];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      } catch {
        suggestions = [];
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in renewals-ai-suggestions:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

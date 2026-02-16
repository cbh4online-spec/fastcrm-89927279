import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { funnel_id } = await req.json();
    if (!funnel_id) throw new Error("funnel_id is required");

    // Fetch funnel data
    const { data: funnel } = await supabase
      .from("funnels")
      .select("*")
      .eq("id", funnel_id)
      .single();

    if (!funnel) throw new Error("Funnel not found");

    // Fetch steps
    const { data: steps } = await supabase
      .from("funnel_steps")
      .select("*")
      .eq("funnel_id", funnel_id)
      .order("sort_order");

    // Fetch stats
    const { data: stats } = await supabase
      .from("funnel_step_stats")
      .select("*")
      .in("step_id", (steps || []).map((s: any) => s.id));

    // Fetch sales
    const { data: sales } = await supabase
      .from("funnel_sales")
      .select("*")
      .eq("funnel_id", funnel_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analisa os dados deste funil de marketing e dá insights estratégicos.

Funil: ${funnel.name}
Steps: ${JSON.stringify(steps?.map((s: any) => ({ name: s.name, type: s.step_type })))}
Estatísticas: ${JSON.stringify(stats || [])}
Vendas (total): ${sales?.length || 0}, Revenue total: ${sales?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0}€

Responde APENAS com um JSON válido neste formato:
{
  "score": <número 0-100>,
  "bottleneck": "<descrição do principal gargalo>",
  "suggestions": ["<sugestão 1>", "<sugestão 2>", "<sugestão 3>"],
  "revenue_forecast": "<previsão de receita para os próximos 30 dias>"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "És um estratega de marketing digital especializado em funis de conversão. Responde sempre em português." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      score: 50,
      bottleneck: "Dados insuficientes para análise completa",
      suggestions: ["Adiciona mais dados ao funil para obter insights detalhados"],
      revenue_forecast: "Insuficiente para previsão",
    };

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("funnel-ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

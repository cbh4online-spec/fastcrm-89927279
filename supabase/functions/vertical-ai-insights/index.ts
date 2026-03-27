import { aiGate } from '../_shared/ai-gate.ts';
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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

    const { template_slug, stats } = await req.json();

    // AI Gate — enforce credit consumption
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'medium', 'vertical-ai-insights');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!template_slug) throw new Error("template_slug is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analisa os dados desta landing page/vertical e dá insights estratégicos detalhados.

Template: ${template_slug}
Visitantes totais: ${stats?.totalViews || 0}
Visitantes únicos: ${stats?.totalUnique || 0}
Submissões: ${stats?.totalSubmissions || 0}
Taxa de conversão: ${stats?.conversionRate || 0}%
Secções (dados gerais): ${JSON.stringify(stats?.sections || [])}
Heatmap de secções (scroll depth): ${JSON.stringify(stats?.sectionHeatmap || [])}
Fontes de tráfego (UTM): ${JSON.stringify(stats?.utmBreakdown || [])}
Dispositivos: ${JSON.stringify(stats?.deviceBreakdown || [])}
Tendência diária (últimos 14 dias): ${JSON.stringify(stats?.trendData || [])}

Analisa:
1. Onde os visitantes abandonam a página (scroll depth)
2. Quais fontes convertem melhor
3. Se o copy/CTA precisa de ajustes
4. Comparação com benchmarks do sector (SaaS: 2.5%, E-commerce: 3.2%, Serviços: 4.1%)
5. Sugestões concretas e accionáveis

Responde APENAS com um JSON válido neste formato:
{
  "score": <número 0-100>,
  "bottleneck": "<descrição detalhada do principal problema ou gargalo identificado>",
  "suggestions": ["<sugestão concreta 1>", "<sugestão concreta 2>", "<sugestão concreta 3>", "<sugestão concreta 4>", "<sugestão concreta 5>"],
  "revenue_forecast": "<previsão ou recomendação baseada nos dados e tendências>"
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
          { role: "system", content: "És um estratega de marketing digital especializado em landing pages e conversão. Responde sempre em português." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tenta novamente em alguns segundos." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos IA esgotados. Adiciona créditos para continuar." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      score: 50,
      bottleneck: "Dados insuficientes para análise completa",
      suggestions: ["Adiciona mais tráfego à página para obter insights detalhados"],
      revenue_forecast: "Insuficiente para previsão",
    };

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[VERTICAL-AI-INSIGHTS]", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
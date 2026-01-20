import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignData {
  id: string;
  name: string;
  subject: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  complained_count: number;
  unsubscribed_count: number;
  total_recipients: number;
  link_count: number;
  send_hour: number;
  started_at: string;
  completed_at: string;
}

interface TenantHistory {
  avg_delivery_rate: number;
  avg_open_rate: number;
  avg_click_rate: number;
  avg_bounce_rate: number;
  total_campaigns: number;
}

const systemPrompt = `És um analista de email marketing B2B, focado em campanhas SaaS, que gera insights práticos e acionáveis, com base em dados reais de performance.

Não inventas métricas.
Não prometes resultados.
Não usas linguagem técnica excessiva.

OUTPUT OBRIGATÓRIO (JSON):
{
  "resumo": "1-2 frases em linguagem simples",
  "funcionou": ["máximo 3 bullets do que funcionou bem"],
  "melhorar": ["máximo 3 bullets do que pode melhorar"],
  "sugestoes": ["ações claras e executáveis, ex: Ajustar assunto, Reduzir número de links, Testar outro horário, CTA mais específico"]
}

REGRAS:
- Comparar campanha com média do tenant
- Priorizar CTR > Open rate
- Tom claro, profissional, amigável
- Sem buzzwords
- Sem "IA diz que…"
- NÃO comparar com benchmarks externos
- NÃO prometer aumento de resultados
- NÃO dar conselhos legais/compliance`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId } = await req.json();
    
    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "Campaign ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant history (last 10 campaigns)
    const { data: historyCampaigns } = await supabase
      .from("marketing_campaigns")
      .select("delivered_count, opened_count, clicked_count, bounced_count, sent_count")
      .eq("workspace_id", campaign.workspace_id)
      .eq("status", "sent")
      .neq("id", campaignId)
      .order("completed_at", { ascending: false })
      .limit(10);

    // Calculate tenant averages
    let tenantHistory: TenantHistory = {
      avg_delivery_rate: 0,
      avg_open_rate: 0,
      avg_click_rate: 0,
      avg_bounce_rate: 0,
      total_campaigns: 0,
    };

    if (historyCampaigns && historyCampaigns.length > 0) {
      const validCampaigns = historyCampaigns.filter(c => c.sent_count > 0);
      if (validCampaigns.length > 0) {
        tenantHistory = {
          avg_delivery_rate: validCampaigns.reduce((sum, c) => sum + ((c.delivered_count || 0) / (c.sent_count || 1)) * 100, 0) / validCampaigns.length,
          avg_open_rate: validCampaigns.reduce((sum, c) => sum + ((c.opened_count || 0) / Math.max(c.delivered_count || 1, 1)) * 100, 0) / validCampaigns.length,
          avg_click_rate: validCampaigns.reduce((sum, c) => sum + ((c.clicked_count || 0) / Math.max(c.delivered_count || 1, 1)) * 100, 0) / validCampaigns.length,
          avg_bounce_rate: validCampaigns.reduce((sum, c) => sum + ((c.bounced_count || 0) / (c.sent_count || 1)) * 100, 0) / validCampaigns.length,
          total_campaigns: validCampaigns.length,
        };
      }
    }

    // Calculate current campaign metrics
    const sentCount = campaign.sent_count || 0;
    const deliveredCount = campaign.delivered_count || 0;
    const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount) * 100 : 0;
    const openRate = deliveredCount > 0 ? ((campaign.opened_count || 0) / deliveredCount) * 100 : 0;
    const clickRate = deliveredCount > 0 ? ((campaign.clicked_count || 0) / deliveredCount) * 100 : 0;
    const bounceRate = sentCount > 0 ? ((campaign.bounced_count || 0) / sentCount) * 100 : 0;
    const ctr = (campaign.opened_count || 0) > 0 ? ((campaign.clicked_count || 0) / (campaign.opened_count || 1)) * 100 : 0;

    // Count links in campaign (simple heuristic)
    const linkCount = campaign.link_count || (campaign.body_html?.match(/<a\s/gi) || []).length;

    // Determine send hour
    const sendHour = campaign.send_hour ?? (campaign.started_at ? new Date(campaign.started_at).getHours() : null);

    // Build prompt for AI
    const userPrompt = `Analisa esta campanha de email marketing:

DADOS DA CAMPANHA:
- Nome: ${campaign.name}
- Assunto: ${campaign.subject}
- Enviados: ${sentCount}
- Entregues: ${deliveredCount} (${deliveryRate.toFixed(1)}%)
- Abertos: ${campaign.opened_count || 0} (${openRate.toFixed(1)}% - estimado)
- Clicados: ${campaign.clicked_count || 0} (${clickRate.toFixed(1)}%)
- CTR (clicks/opens): ${ctr.toFixed(1)}%
- Bounces: ${campaign.bounced_count || 0} (${bounceRate.toFixed(1)}%)
- Complaints: ${campaign.complained_count || 0}
- Número de links no email: ${linkCount}
- Hora de envio: ${sendHour !== null ? `${sendHour}h` : 'não disponível'}

HISTÓRICO DO TENANT (média de ${tenantHistory.total_campaigns} campanhas anteriores):
- Taxa de entrega média: ${tenantHistory.avg_delivery_rate.toFixed(1)}%
- Taxa de abertura média: ${tenantHistory.avg_open_rate.toFixed(1)}%
- Taxa de cliques média: ${tenantHistory.avg_click_rate.toFixed(1)}%
- Taxa de bounce média: ${tenantHistory.avg_bounce_rate.toFixed(1)}%

TIPO DE PÚBLICO: ${campaign.segment_id ? 'Segmento específico' : 'Lista completa'}

Gera insights em formato JSON conforme as instruções.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Generate campaign insights",
              parameters: {
                type: "object",
                properties: {
                  resumo: { type: "string", description: "1-2 frases resumindo a performance" },
                  funcionou: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Lista do que funcionou bem (máx 3 items)"
                  },
                  melhorar: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Lista do que pode melhorar (máx 3 items)"
                  },
                  sugestoes: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Ações práticas e executáveis"
                  },
                },
                required: ["resumo", "funcionou", "melhorar", "sugestoes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract insights from tool call
    let insights;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      insights = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          insights = JSON.parse(content);
        } catch {
          insights = {
            resumo: "Não foi possível gerar insights automáticos para esta campanha.",
            funcionou: [],
            melhorar: [],
            sugestoes: ["Tente novamente mais tarde."],
          };
        }
      }
    }

    // Save insights to campaign
    await supabase
      .from("marketing_campaigns")
      .update({
        ai_insights: insights,
        ai_insights_generated_at: new Date().toISOString(),
        link_count: linkCount,
        send_hour: sendHour,
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({
        success: true,
        insights,
        metrics: {
          deliveryRate,
          openRate,
          clickRate,
          bounceRate,
          ctr,
        },
        tenantHistory,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

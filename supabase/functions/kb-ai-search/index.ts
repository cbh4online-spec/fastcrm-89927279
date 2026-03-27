import { aiGate } from '../_shared/ai-gate.ts';
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FASTCRM_CONTEXT = `És o assistente de suporte do FastCRM, uma plataforma CRM multi-módulo em português de Portugal.

O FastCRM tem 75 módulos em 13 categorias:
- Core: Dashboard, Tarefas, Calendário, Mural Interno
- CRM: Contactos, Leads, Oportunidades, Pipeline, Sequências, FastMatch, Customer Lifecycle
- Comunicação: Inbox unificado, Email (IMAP/SMTP), WhatsApp, Templates
- Email Marketing: Campanhas, Editor HTML, Segmentação, A/B Testing
- Marketing: Funis, Landing Pages, Bio OS, Prospecção, SEO
- Vendas: Propostas, Produtos, Notas de Encomenda, Bundles, AI Sales Coach
- Loja Online: E-Commerce completo, Encomendas, Cupões
- Portal B2B: Portal de clientes, Catálogo, Encomendas, Aprovações, Tickets
- IA: CEO Copilot, Context OS, AI Agents, IMO AI, RAG, AI Suggestions
- Strategy: Revenue Flight Control, Mapa de Impacto, Command Center
- Admin: Automações, Integrações, Super Admin, System Health
- Extensões: Security Ops (para empresas de segurança)

Regras:
- Responde SEMPRE em português de Portugal
- Sê conciso e prático — máximo 200 palavras
- Inclui passos numerados quando relevante
- Se não souberes com certeza, diz que vais encaminhar para a equipa
- Nunca inventes funcionalidades que não existem
- Termina sempre com uma pergunta de follow-up ou sugestão de próximo passo`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, user_id } = await req.json();

    // AI Gate — enforce credit consumption
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'light', 'kb-ai-search');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!query) throw new Error("query is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Call Lovable AI Gateway
    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: FASTCRM_CONTEXT },
            { role: "user", content: query },
          ],
          max_tokens: 600,
        }),
      }
    );

    if (!res.ok) {
      if (res.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            answer:
              "O sistema está com muitos pedidos neste momento. Tenta novamente em alguns segundos.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (res.status === 402) {
        return new Response(
          JSON.stringify({
            success: false,
            answer:
              "Créditos de IA esgotados. Contacta o administrador para adicionar créditos.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const err = await res.text();
      throw new Error(`AI gateway error: ${err}`);
    }

    const data = await res.json();
    const answer =
      data.choices?.[0]?.message?.content ?? "Sem resposta disponível.";

    // Log the query
    if (user_id) {
      await supabase
        .from("kb_ai_queries")
        .insert({ user_id, query, ai_response: answer });
    }

    return new Response(JSON.stringify({ success: true, answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        answer:
          "Não consegui encontrar uma resposta de momento. Por favor contacta o suporte.",
        error: (error as Error).message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

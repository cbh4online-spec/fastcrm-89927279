import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { logAIUsage } from "../_shared/ai-instrumentation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu és o Assistente de Campanhas de Email Marketing do FastCRM, especialista em marketing digital, copywriting e segmentação.

O teu papel é ajudar o utilizador a criar campanhas de email marketing de forma conversacional, mesmo que não tenha experiência em marketing.

FLUXO CONVERSACIONAL:
1. Começa por perguntar qual o OBJETIVO da campanha (ex: vender produto, nutrir leads, lançar novidade, reactivar clientes inativos, promover evento, etc.)
2. Pergunta sobre o PÚBLICO-ALVO / segmento (ex: todos os contactos, leads quentes, clientes existentes, segmento específico)
3. Pergunta sobre o PRODUTO ou SOLUÇÃO a promover (nome, benefícios principais, preço se aplicável)
4. Pergunta sobre o TOM DE VOZ desejado (profissional, casual, urgente, empático, etc.)
5. Pergunta se querem uma campanha de email único ou uma SEQUÊNCIA (2-3 emails)

Faz UMA pergunta de cada vez. Sê amigável, breve e orientado à acção.

QUANDO TIVERES INFORMAÇÃO SUFICIENTE, gera o resultado usando EXACTAMENTE este formato:

---CAMPANHA_GERADA---
{
  "subject": "Linha de assunto otimizada",
  "preview_text": "Texto de pré-visualização (max 90 chars)",
  "body_html": "<html completo do email com inline CSS, design responsivo e profissional>",
  "segment_suggestion": "Descrição do segmento ideal para esta campanha",
  "sequence": [
    {
      "day": 1,
      "subject": "Assunto do email 1",
      "preview_text": "Preview text",
      "body_html": "<html do email>"
    }
  ],
  "tips": ["Dica 1 de otimização", "Dica 2"]
}
---FIM_CAMPANHA---

REGRAS PARA O HTML:
- Usa tabelas para layout (compatibilidade com clientes de email)
- CSS inline obrigatório
- Max-width: 600px
- Inclui CTA claro com botão
- Cores profissionais, tipografia legível
- Placeholder {{nome}} para personalização
- Footer com link de unsubscribe

Se o utilizador pedir alterações ao resultado gerado, ajusta e gera novamente.
Responde SEMPRE em português de Portugal.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      if (token !== anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData, error: authError } = await userClient.auth.getUser();
        if (authError || !userData.user) {
          return new Response(JSON.stringify({ error: "Não autenticado" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await __loggedAIFetch(null, "email-campaign-wizard", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tenta novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adiciona fundos em Definições." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("email-campaign-wizard error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

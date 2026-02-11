import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, session_id } = await req.json();
    if (!workspace_id || !session_id) {
      return new Response(JSON.stringify({ error: "workspace_id and session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch visitor session
    const { data: session, error: sessionError } = await supabase
      .from("store_visitor_sessions")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("session_id", session_id)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already classified recently (within 5 min)
    if (session.ai_classified_at) {
      const lastClassified = new Date(session.ai_classified_at).getTime();
      if (Date.now() - lastClassified < 5 * 60 * 1000) {
        return new Response(JSON.stringify({ status: "already_classified", ...session }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch product names for context
    let productNames: string[] = [];
    if (session.products_viewed?.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, category, base_price")
        .in("id", session.products_viewed);
      productNames = products?.map((p: any) => `${p.name} (${p.category || "sem categoria"}, €${p.base_price})`) || [];
    }

    // Check if returning visitor
    const { count: previousSessions } = await supabase
      .from("store_visitor_sessions")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .neq("session_id", session_id)
      .or(`referrer.ilike.%${session.referrer || ""}%`);

    const isReturning = (previousSessions || 0) > 0;

    // Build AI prompt
    const prompt = `Analisa o comportamento deste visitante de uma loja online e classifica a sua intenção de compra.

Dados do visitante:
- Páginas visitadas: ${session.pages_viewed}
- Produtos vistos: ${productNames.length > 0 ? productNames.join(", ") : "nenhum"}
- Tempo no site: ${session.time_on_site_seconds} segundos
- Dispositivo: ${session.device_type}
- Origem: ${session.referrer || "direto"}
- UTM Source: ${session.utm_source || "nenhum"}
- UTM Medium: ${session.utm_medium || "nenhum"}
- UTM Campaign: ${session.utm_campaign || "nenhum"}
- Visitante recorrente: ${isReturning ? "sim" : "não"}

Classifica usando a ferramenta fornecida.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "És um analista de e-commerce especializado em classificar intenção de compra de visitantes. Usa a ferramenta fornecida para retornar a classificação estruturada.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_visitor",
              description: "Classifica a intenção de compra do visitante",
              parameters: {
                type: "object",
                properties: {
                  ai_intent: {
                    type: "string",
                    enum: ["browsing", "comparing", "ready_to_buy", "returning_customer"],
                    description: "Intenção do visitante",
                  },
                  ai_score: {
                    type: "integer",
                    description: "Score de intenção de compra de 0 a 100",
                  },
                  ai_recommendation: {
                    type: "string",
                    description: "Ação concreta recomendada para converter este visitante (em português)",
                  },
                },
                required: ["ai_intent", "ai_score", "ai_recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_visitor" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI classification failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No classification returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const classification = JSON.parse(toolCall.function.arguments);

    // Update session with classification
    const { error: updateError } = await supabase
      .from("store_visitor_sessions")
      .update({
        ai_intent: classification.ai_intent,
        ai_score: classification.ai_score,
        ai_recommendation: classification.ai_recommendation,
        ai_classified_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspace_id)
      .eq("session_id", session_id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(JSON.stringify({ status: "classified", ...classification }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("store-classify-visitor error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

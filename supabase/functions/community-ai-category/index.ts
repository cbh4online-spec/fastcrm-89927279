import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, communityName, communityDescription, channelName } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "suggest-channel-description") {
      systemPrompt = `You are a community channel description assistant. Based on the channel name provided, suggest a short and appealing description (maximum 60 characters) in Portuguese. Return ONLY the description text, nothing else.`;
      userPrompt = `Channel name: "${channelName || ""}"\n\nSuggest a short description.`;
    } else {
      systemPrompt = `You are a community categorization assistant. Based on the community name and description provided, suggest a single category that best describes this community. Return ONLY the category name in Portuguese, nothing else. Examples of categories: "Produtividade", "Marketing Digital", "Educação", "Tecnologia", "Saúde e Bem-estar", "Finanças", "Design", "Empreendedorismo", "Vendas", "Desenvolvimento Pessoal", "E-commerce", "Imobiliário", "Fitness", "Gastronomia", "Música", "Fotografia", "Viagens".`;
      userPrompt = `Community name: "${communityName || ""}"\nDescription: "${communityDescription || ""}"\n\nSuggest a category.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || "";

    if (mode === "suggest-channel-description") {
      return new Response(JSON.stringify({ success: true, description: result || "Canal da comunidade" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, category: result || "Geral" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("community-ai-category error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

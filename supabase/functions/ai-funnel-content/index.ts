import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, stepType, currentContent, funnelName, funnelType } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert landing page copywriter and conversion optimizer. 
You generate high-converting content for funnel pages in Portuguese (PT-PT/BR).

The user will describe what they want and you must generate the content fields.

Funnel context:
- Funnel name: ${funnelName || "N/A"}
- Funnel type: ${funnelType || "N/A"}  
- Step type: ${stepType || "page"}
- Current content: ${currentContent ? JSON.stringify(currentContent) : "empty"}

Rules:
- Write compelling, action-oriented copy
- Use emotional triggers and urgency when appropriate
- Keep headlines short and impactful (max 10 words)
- Subheadlines should expand on the headline promise
- Body text should address pain points and benefits
- CTAs should be action-oriented and specific
- Match the tone to the step type (optin = lead capture, checkout = urgency, thankyou = gratitude, upsell = value)
- Always respond in Portuguese

Respond ONLY with valid JSON in this exact format:
{
  "headline": "...",
  "subheadline": "...",
  "body": "...",
  "cta_text": "..."
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error("Erro na API de IA");
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Resposta inválida da IA");
    }

    const generated = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, content: generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro ao gerar conteúdo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

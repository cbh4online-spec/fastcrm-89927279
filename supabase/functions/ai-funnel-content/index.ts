import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, stepType, currentContent, funnelName, funnelType, generateImage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Image generation mode ---
    if (generateImage) {
      const imagePrompt = `Create a professional, high-quality hero image for a marketing landing page. Context: ${prompt}. Style: modern, clean, professional photography or illustration. No text in the image.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit atingido. Tenta novamente em alguns segundos." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes. Adiciona créditos em Settings → Workspace → Usage." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Erro ao gerar imagem");
      }

      const aiData = await response.json();
      const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        throw new Error("Imagem não gerada");
      }

      // Upload base64 image to storage
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);

      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const fileName = `funnel-images/${crypto.randomUUID()}.png`;

      // Ensure bucket exists
      await sb.storage.createBucket("funnel-assets", { public: true }).catch(() => {});

      const { error: uploadErr } = await sb.storage.from("funnel-assets").upload(fileName, imageBytes, { contentType: "image/png" });
      if (uploadErr) throw new Error("Erro ao guardar imagem");

      const { data: urlData } = sb.storage.from("funnel-assets").getPublicUrl(fileName);

      return new Response(JSON.stringify({ success: true, image_url: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Text content generation mode ---
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert landing page copywriter and conversion optimizer. 
You generate high-converting content for funnel pages in Portuguese (PT-PT/BR).

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
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido. Tenta novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error("Erro na API de IA");
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta inválida da IA");

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

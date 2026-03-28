import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, title, description, audience, tone, chapterCount, chapterTitle, chapterContext, imagePrompt, ebookId, target } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ─── IMAGE GENERATION ───
    if (action === "generate_image") {
      if (!imagePrompt) return new Response(JSON.stringify({ error: "imagePrompt is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResponse.ok) {
        const status = imgResponse.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Limite de pedidos atingido. Tente mais tarde." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos IA esgotados. Adicione créditos." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await imgResponse.text();
        console.error("AI image error:", status, t);
        throw new Error("AI image generation failed");
      }

      const imgData = await imgResponse.json();
      const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error("No image in response");

      // Upload base64 image to storage
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const filePath = `ai-generated/${ebookId || "misc"}/${target || "cover"}_${Date.now()}.png`;

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { error: uploadError } = await supabaseAdmin.storage
        .from("ebook-assets")
        .upload(filePath, binaryData, { contentType: "image/png", upsert: true });

      if (uploadError) throw new Error("Upload failed: " + uploadError.message);

      const { data: publicUrlData } = supabaseAdmin.storage.from("ebook-assets").getPublicUrl(filePath);

      return new Response(JSON.stringify({ url: publicUrlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─── TEXT GENERATION (existing) ───
    let systemPrompt = "";
    let userPrompt = "";
    let toolDef: any = null;

    if (action === "generate_outline") {
      systemPrompt = `You are an expert eBook content strategist. Generate a structured eBook outline in Portuguese (PT-PT). Create compelling chapter titles and brief descriptions.`;
      userPrompt = `Create an eBook outline:
Title: ${title}
Description: ${description || "Not specified"}
Target audience: ${audience || "General"}
Tone: ${tone || "Professional"}
Number of chapters: ${chapterCount || 5}`;
      toolDef = {
        name: "create_outline",
        description: "Create an eBook outline with chapters",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            chapters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  sections: { type: "array", items: { type: "string" } }
                },
                required: ["title", "description", "sections"]
              }
            }
          },
          required: ["title", "subtitle", "chapters"]
        }
      };
    } else if (action === "generate_chapter") {
      systemPrompt = `You are an expert eBook writer. Write detailed, engaging chapter content in Portuguese (PT-PT). Use markdown formatting (headers, bold, lists, etc). Write at least 800 words. Be informative and practical.`;
      userPrompt = `Write this chapter for the eBook "${title}":
Chapter: ${chapterTitle}
Context: ${chapterContext || ""}
Tone: ${tone || "Professional"}
Audience: ${audience || "General"}

Write complete, well-structured content with an introduction, main sections, and a conclusion. Use markdown formatting.`;
    } else if (action === "improve_content") {
      systemPrompt = `You are an expert editor. Improve the following eBook chapter content in Portuguese (PT-PT). Enhance clarity, engagement, and structure. Keep markdown formatting. Return only the improved content.`;
      userPrompt = chapterContext || "";
    } else if (action === "condense_content") {
      systemPrompt = `You are an expert editor. Condense the following eBook chapter content in Portuguese (PT-PT). Keep only the key points, main arguments and essential information. Reduce length by about 40-50% while maintaining clarity and value. Keep markdown formatting. Return only the condensed content.`;
      userPrompt = chapterContext || "";
    } else if (action === "expand_content") {
      systemPrompt = `You are an expert eBook writer. Expand and enrich the following content in Portuguese (PT-PT). Add more detail, examples, practical tips, and deeper explanations. Increase length by about 50-80%. Keep markdown formatting. Return only the expanded content.`;
      userPrompt = chapterContext || "";
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    };

    if (toolDef) {
      body.tools = [{ type: "function", function: toolDef }];
      body.tool_choice = { type: "function", function: { name: toolDef.name } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de pedidos atingido. Tente mais tarde." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos IA esgotados. Adicione créditos." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();

    if (toolDef) {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("ebook-ai-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

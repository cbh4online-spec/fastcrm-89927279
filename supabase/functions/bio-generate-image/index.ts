import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { prompt, workspaceId } = await req.json();

    // AI Gate check
    const _gateWsId = typeof workspaceId !== 'undefined' ? workspaceId : (workspaceId ?? null);
    if (_gateWsId) {
      const gate = await aiGate(_gateWsId, 'heavy', 'bio-generate-image');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!workspaceId || !prompt) {
      return new Response(JSON.stringify({ error: "prompt and workspaceId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enrichedPrompt = `Professional quality image, suitable as background for a link-in-bio page. Photorealistic or high-quality illustration. No text, no logos, no watermarks. Ultra high resolution.\n\n${prompt}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enrichedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[BIO] Image generate AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    // Log AI usage (fire-and-forget)
    try {
      logAIUsage({
        workspace_id: workspaceId,
        feature: "bio-generate-image",
        model: "google/gemini-2.5-flash-image",
        tokens_input: aiData?.usage?.prompt_tokens ?? 0,
        tokens_output: aiData?.usage?.completion_tokens ?? 0,
      });
    } catch (_e) { /* logging never blocks */ }

    console.log("[BIO] AI response keys:", JSON.stringify(Object.keys(aiData)));
    const msg = aiData.choices?.[0]?.message;
    console.log("[BIO] Message keys:", msg ? JSON.stringify(Object.keys(msg)) : "no message");

    // Try multiple known response shapes
    let imageUrl = msg?.images?.[0]?.image_url?.url;

    // Fallback: check content array for image parts
    if (!imageUrl && Array.isArray(msg?.content)) {
      const imgPart = msg.content.find((p: any) => p.type === "image_url" || p.type === "image");
      imageUrl = imgPart?.image_url?.url || imgPart?.url;
    }

    // Fallback: inline_data in parts (Gemini native format)
    if (!imageUrl && Array.isArray(msg?.parts)) {
      const imgPart = msg.parts.find((p: any) => p.inline_data);
      if (imgPart?.inline_data) {
        imageUrl = `data:${imgPart.inline_data.mime_type};base64,${imgPart.inline_data.data}`;
      }
    }

    if (!imageUrl) {
      console.error("[BIO] Full AI response:", JSON.stringify(aiData).slice(0, 2000));
      throw new Error("No image returned from AI");
    }

    const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) throw new Error("Invalid image format");

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ext = mimeType === "jpeg" ? "jpg" : mimeType;
    const filePath = `${workspaceId}/bio-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("bio-assets")
      .upload(filePath, bytes, {
        contentType: `image/${mimeType}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("bio-assets")
      .getPublicUrl(filePath);

    console.log(`[BIO] Image generated: ${filePath}`);

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[BIO] Image generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

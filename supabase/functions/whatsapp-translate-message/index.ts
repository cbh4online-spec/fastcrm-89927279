import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface TranslateBody {
  text: string;
  target_language?: string; // e.g. "pt-PT", "en", "es", "fr"
  source_language?: string; // optional hint
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return json({ error: "ai_not_configured" }, 200);
    }

    const body = (await req.json().catch(() => ({}))) as Partial<TranslateBody>;
    const text = (body.text ?? "").toString().trim();
    const target = (body.target_language ?? "pt-PT").toString().trim();
    const source = body.source_language ? body.source_language.toString().trim() : "auto";

    if (!text || text.length < 1) {
      return json({ error: "missing_text" }, 400);
    }
    if (text.length > 8000) {
      return json({ error: "text_too_long" }, 400);
    }

    const systemPrompt = `You are a precise translator. Translate the user message to ${target}. Preserve emojis, line breaks, mentions and links. Return ONLY the translated text, without quotes or commentary.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
    });

    if (aiResp.status === 429) return json({ error: "rate_limited" }, 200);
    if (aiResp.status === 402) return json({ error: "payment_required" }, 200);
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return json({ error: "ai_error", fallback: true }, 200);
    }

    const data = await aiResp.json();
    const translated = data?.choices?.[0]?.message?.content?.trim?.() ?? "";
    if (!translated) return json({ error: "empty_translation", fallback: true }, 200);

    return json({
      success: true,
      translated_text: translated,
      target_language: target,
      source_language: source,
    });
  } catch (e) {
    console.error("translate error", e);
    return json({ error: "internal_error", fallback: true }, 200);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { logAIUsage } from "../_shared/ai-instrumentation.ts";

// ── AI usage logging helper (auto-injected) ───────────────────────────────────
async function __loggedAIFetch(
  workspaceId: string | null,
  feature: string,
  init: RequestInit
): Promise<Response> {
  const start = Date.now();
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const body = init.body ? JSON.parse(init.body as string) : {};
  const model = body.model || "google/gemini-3-flash-preview";
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (workspaceId) {
      logAIUsage({
        workspace_id: workspaceId,
        feature,
        model,
        tokens_input: 0,
        tokens_output: 0,
        latency_ms: Date.now() - start,
        was_error: true,
        error_type: "network",
      });
    }
    throw e;
  }

  if (!workspaceId) return response;

  const clone = response.clone();
  clone.json().then((data: any) => {
    const tokens_input = data?.usage?.prompt_tokens ?? 0;
    const tokens_output = data?.usage?.completion_tokens ?? 0;
    logAIUsage({
      workspace_id: workspaceId,
      feature,
      model,
      tokens_input,
      tokens_output,
      latency_ms: Date.now() - start,
      was_error: !response.ok,
      error_type: response.ok ? undefined : `http_${response.status}`,
    });
  }).catch(() => {});

  return response;
}

// Builder AI Image: generate images via Lovable AI Gateway (Nano Banana)
// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReqBody {
  prompt: string;
  model?: string; // default google/gemini-2.5-flash-image
  sourceImageUrl?: string; // when present → edit mode
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    const prompt = (body?.prompt || "").trim();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt_required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = body.model || "google/gemini-2.5-flash-image";
    const userContent: any = body.sourceImageUrl
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: body.sourceImageUrl } },
        ]
      : prompt;

    const res = await __loggedAIFetch(null, "builder-ai-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited", message: "Demasiados pedidos. Tenta novamente em alguns segundos." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "payment_required", message: "Créditos de IA esgotados." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI image gateway error:", res.status, t);
      return new Response(JSON.stringify({ error: "ai_gateway_error", status: res.status, message: "Falha na geração de imagem." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "no_image", message: "O modelo não devolveu imagem." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("builder-ai-image error:", e);
    return new Response(JSON.stringify({ error: "internal_error", message: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

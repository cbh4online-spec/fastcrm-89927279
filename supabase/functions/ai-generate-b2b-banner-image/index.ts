// Edge function: gerar imagem de banner B2B (16:9) via Lovable AI Gateway (Nano Banana)
// Faz upload ao bucket `store-assets` (workspace-scoped) e devolve a URL pública.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const KIND_HINT: Record<string, string> = {
  campaign: "promotional commercial banner, dynamic, vibrant",
  training: "educational webinar / masterclass scene, clean, professional",
  launch: "premium product launch banner, elegant, hero-style",
  education: "soft editorial scientific/educational banner, calm, didactic",
};

function buildPrompt(userPrompt: string, kind?: string, theme?: string) {
  const kindHint = (kind && KIND_HINT[kind]) || "professional B2B hero banner";
  const themeHint =
    theme === "dark"
      ? "dark elegant background, soft cinematic lighting, deep tones"
      : "bright clean background, soft natural lighting, fresh tones";
  return [
    `Create a wide cinematic 16:9 hero banner image for a B2B partner portal.`,
    `Style: ${kindHint}, photorealistic, modern editorial composition,`,
    `${themeHint}, high quality, no text overlays, no logos, no watermarks,`,
    `leave clear empty space on the LEFT side for title overlay (negative space).`,
    `Subject: ${userPrompt}`,
    `Industry context: cosmetics, wellness, beauty, professional skincare, ozonated oils, dermocosmetics.`,
  ].join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Sessão inválida" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const workspace_id: string | undefined = body.workspace_id;
    const prompt: string = String(body.prompt || "").trim();
    const kind: string | undefined = body.kind;
    const theme: string | undefined = body.theme;

    if (!workspace_id) return json({ error: "workspace_id em falta" }, 400);
    if (prompt.length < 8) return json({ error: "Descreve a imagem (mínimo 8 caracteres)" }, 400);
    if (prompt.length > 1500) return json({ error: "Prompt demasiado longo" }, 400);

    // Service-role client para validar membership e fazer upload
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Validar acesso ao workspace (membro OU super admin)
    const [{ data: isAdminMember }, { data: isSuper }] = await Promise.all([
      admin.rpc("is_workspace_admin", { _user_id: user.id, _workspace_id: workspace_id }),
      admin.rpc("is_super_admin", { _user_id: user.id }),
    ]);
    if (!isAdminMember && !isSuper) {
      return json({ error: "Sem permissões para este workspace" }, 403);
    }

    // Chamar Lovable AI Gateway — Nano Banana
    const fullPrompt = buildPrompt(prompt, kind, theme);
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("[ai-banner-image] gateway", aiResp.status, txt.slice(0, 300));
      if (aiResp.status === 429) {
        return json({ error: "Limite de pedidos atingido. Tenta novamente em instantes.", code: "rate_limited" }, 200);
      }
      if (aiResp.status === 402) {
        return json({ error: "Sem créditos AI no workspace. Adiciona fundos em Settings.", code: "no_funds" }, 200);
      }
      return json({ error: "Falha na geração da imagem", code: "ai_error" }, 200);
    }

    const aiJson = await aiResp.json();
    const dataUrl: string | undefined =
      aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      console.error("[ai-banner-image] no image in response");
      return json({ error: "Resposta da IA sem imagem", code: "no_image" }, 200);
    }

    // Decodificar base64 → bytes
    const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!m) return json({ error: "Formato de imagem inválido" }, 200);
    const mime = m[1];
    const ext = mime.split("/")[1].replace("jpeg", "jpg");
    const b64 = m[2];
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const path = `${workspace_id}/b2b-banners/ai-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const up = await admin.storage.from("store-assets").upload(path, bin, {
      contentType: mime,
      upsert: false,
    });
    if (up.error) {
      console.error("[ai-banner-image] upload", up.error);
      return json({ error: "Falha ao guardar imagem no storage", code: "upload_error" }, 200);
    }

    const { data: pub } = admin.storage.from("store-assets").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;

    // Log uso (best-effort)
    try {
      await admin.from("ai_usage_logs").insert({
        workspaceId: workspace_id,
        workspace_id,
        user_id: user.id,
        feature: "b2b_banner_ai_image",
        model: "google/gemini-2.5-flash-image",
        tier: "medium",
        tokens_input: 0,
        tokens_output: 0,
        metadata: { prompt_preview: prompt.slice(0, 120), kind, theme },
      } as any);
    } catch (_e) {
      // non-blocking
    }

    return json({ url, path }, 200);
  } catch (e) {
    console.error("[ai-banner-image] fatal", e);
    return json({ error: (e as Error).message || "Erro interno", code: "internal_error" }, 200);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

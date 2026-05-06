// Edge function pública: track-product-share
// Regista clique em produto enviado por WhatsApp e redireciona para o link do produto.
// URL: /functions/v1/track-product-share?id=<product_share_id>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get("id") || url.searchParams.get("share_id");
    if (!shareId) {
      return new Response(JSON.stringify({ error: "missing_share_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: share, error: shareErr } = await supabase
      .from("whatsapp_product_shares")
      .select("id, workspace_id, product_id, contact_id, conversation_id, status, clicked_at, metadata")
      .eq("id", shareId)
      .maybeSingle();

    if (shareErr || !share) {
      return new Response(JSON.stringify({ error: "share_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash do IP por privacidade
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const ipHash = await sha256Hex(ip + ":" + (Deno.env.get("SUPABASE_PROJECT_ID") || ""));

    // Regista o clique (não bloqueia se falhar)
    await supabase.from("product_share_clicks").insert({
      workspace_id: share.workspace_id,
      product_share_id: share.id,
      product_id: share.product_id,
      contact_id: share.contact_id,
      conversation_id: share.conversation_id,
      ip_hash: ipHash,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) || null,
      referrer: req.headers.get("referer") || null,
    });

    // Atualiza estado do share (apenas avança, nunca regride)
    const shouldUpdateStatus = !["replied", "converted"].includes(share.status);
    await supabase
      .from("whatsapp_product_shares")
      .update({
        clicked_at: share.clicked_at ?? new Date().toISOString(),
        ...(shouldUpdateStatus ? { status: "clicked" } : {}),
      })
      .eq("id", share.id);

    // Resolver URL de destino: metadata.product_link → ficha do produto
    let target = (share.metadata as Record<string, unknown> | null)?.product_link as string | undefined;
    if (!target) {
      // Fallback: ir para ficha pública do produto se existir slug
      const { data: prod } = await supabase
        .from("products")
        .select("slug")
        .eq("id", share.product_id)
        .maybeSingle();
      if (prod?.slug) target = `/p/${prod.slug}`;
      else target = "/";
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: target },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "internal_error", message: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

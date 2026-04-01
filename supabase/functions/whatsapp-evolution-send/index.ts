import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[WHATSAPP_EVOLUTION_SEND] Auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // --- Parse body ---
    const { workspaceId, phone, message } = await req.json();

    if (!workspaceId || !phone || !message) {
      return new Response(JSON.stringify({ error: "workspaceId, phone and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Verify workspace membership ---
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Get active QR connection ---
    const serviceRole = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: qrConn, error: qrErr } = await serviceRole
      .from("whatsapp_qr_connections")
      .select("instance_name, status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (qrErr) {
      console.error("[WHATSAPP_EVOLUTION_SEND] DB error:", qrErr);
      return new Response(JSON.stringify({ error: "Failed to read connection state" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!qrConn || qrConn.status !== "connected") {
      console.warn(`[WHATSAPP_EVOLUTION_SEND] Not connected workspace=${workspaceId} status=${qrConn?.status}`);
      return new Response(JSON.stringify({ error: "WhatsApp não está conectado. Conecte via QR nas Definições." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Normalize phone (strip + and non-digits) ---
    const normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone || normalizedPhone.length < 8) {
      return new Response(JSON.stringify({ error: "Número de telefone inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Call Evolution API ---
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      console.error("[WHATSAPP_EVOLUTION_SEND] Missing EVOLUTION_API_URL or EVOLUTION_API_KEY");
      return new Response(JSON.stringify({ error: "Evolution API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = new URL(evolutionUrl).origin;
    const instanceName = qrConn.instance_name;
    const sendUrl = `${baseUrl}/message/sendText/${instanceName}`;

    console.log(`[WHATSAPP_EVOLUTION_SEND] Sending to=${normalizedPhone} instance=${instanceName} workspace=${workspaceId}`);

    const evoRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evolutionKey,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        text: message.trim(),
      }),
    });

    const evoBody = await evoRes.text();

    if (!evoRes.ok) {
      console.error(`[WHATSAPP_EVOLUTION_SEND] Evolution API error status=${evoRes.status} body=${evoBody}`);
      return new Response(JSON.stringify({ error: "Falha ao enviar mensagem via Evolution API", details: evoBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[WHATSAPP_EVOLUTION_SEND] SUCCESS workspace=${workspaceId} phone=${normalizedPhone}`);

    return new Response(JSON.stringify({ success: true, data: JSON.parse(evoBody) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[WHATSAPP_EVOLUTION_SEND] Unhandled error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

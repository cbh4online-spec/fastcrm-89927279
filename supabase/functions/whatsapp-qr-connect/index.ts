import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId, userId } = await req.json();
    if (!workspaceId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing workspaceId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Evolution API not configured. Please add EVOLUTION_API_URL and EVOLUTION_API_KEY secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate that EVOLUTION_API_URL is an HTTP(S) URL, not a database connection string
    if (!EVOLUTION_API_URL.startsWith("http://") && !EVOLUTION_API_URL.startsWith("https://")) {
      console.error(`EVOLUTION_API_URL has invalid scheme. Value starts with: "${EVOLUTION_API_URL.substring(0, 15)}...". Expected https://`);
      return new Response(
        JSON.stringify({ error: "EVOLUTION_API_URL is misconfigured — it must be an HTTP(S) URL (e.g. https://your-evolution-api.example.com), not a database connection string." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = `ws_${workspaceId.replace(/-/g, "").substring(0, 16)}`;
    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");

    console.log(`Evolution API URL: ${baseUrl.substring(0, 30)}...`);
    console.log(`Instance name: ${instanceName}`);

    // Try to create instance (ignore if already exists)
    try {
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });
    } catch {
      // Instance may already exist, continue
    }

    // Connect and get QR code
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });

    const connectData = await connectRes.json();

    if (!connectRes.ok) {
      console.error("Evolution connect error:", connectData);
      return new Response(
        JSON.stringify({ error: connectData?.message || "Failed to connect instance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The QR code may come as base64 or as a code string
    const qrcode = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code || null;

    if (!qrcode) {
      // Instance might already be connected
      if (connectData?.instance?.state === "open") {
        return new Response(
          JSON.stringify({ alreadyConnected: true, instanceName }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "QR code not available. Try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ qrcode, instanceName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in whatsapp-qr-connect:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

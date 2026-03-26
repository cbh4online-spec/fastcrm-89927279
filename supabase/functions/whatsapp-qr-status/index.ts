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
    const { workspaceId, instanceName } = await req.json();
    if (!workspaceId || !instanceName) {
      return new Response(
        JSON.stringify({ error: "Missing workspaceId or instanceName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");

    // Check instance connection status
    const statusRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });

    const statusData = await statusRes.json();
    const isConnected = statusData?.instance?.state === "open";

    if (isConnected) {
      // Fetch instance info to get phone number
      let phoneNumber = null;
      try {
        const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const infoData = await infoRes.json();
        const instance = Array.isArray(infoData) ? infoData[0] : infoData;
        phoneNumber = instance?.instance?.owner || instance?.owner || null;
      } catch {
        // Non-critical
      }

      // Save connection to database
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const authHeader = req.headers.get("Authorization");
      let userId: string | null = null;
      if (authHeader) {
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user } } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = user?.id || null;
      }

      // Upsert connection
      await adminClient
        .from("whatsapp_connections")
        .upsert(
          {
            workspace_id: workspaceId,
            is_active: true,
            connection_type: "evolution",
            evolution_instance_name: instanceName,
            display_phone_number: phoneNumber,
            connected_by: userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );

      return new Response(
        JSON.stringify({ connected: true, phoneNumber }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ connected: false, state: statusData?.instance?.state }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in whatsapp-qr-status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

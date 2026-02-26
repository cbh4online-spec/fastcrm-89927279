import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rsvpId = url.searchParams.get("rsvp_id");
    const action = url.searchParams.get("action");

    if (!rsvpId || !action || !["confirm", "decline"].includes(action)) {
      return new Response("Parâmetros inválidos", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const newStatus = action === "confirm" ? "confirmed" : "declined";

    // Get the RSVP to find the event title for the redirect
    const { data: rsvp, error: fetchErr } = await supabase
      .from("event_rsvps")
      .select("id, event_id, status")
      .eq("id", rsvpId)
      .single();

    if (fetchErr || !rsvp) {
      return new Response("Convite não encontrado", { status: 404, headers: corsHeaders });
    }

    // Update status
    const { error: updateErr } = await supabase
      .from("event_rsvps")
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq("id", rsvpId);

    if (updateErr) {
      console.error("[RSVP-RESPOND] Update error:", updateErr);
      return new Response("Erro ao processar resposta", { status: 500, headers: corsHeaders });
    }

    // Get event title for the feedback page
    const { data: event } = await supabase
      .from("community_events")
      .select("title")
      .eq("id", rsvp.event_id)
      .single();

    const baseUrl = "https://fastcrm.lovable.app";
    const redirectUrl = `${baseUrl}/event-rsvp?status=${newStatus}&event=${encodeURIComponent(event?.title || "")}`;

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: redirectUrl },
    });
  } catch (error: any) {
    console.error("[RSVP-RESPOND] Error:", error);
    return new Response("Erro interno", { status: 500, headers: corsHeaders });
  }
});

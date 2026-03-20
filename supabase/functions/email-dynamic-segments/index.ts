import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { workspace_id, segment_type, rules } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify membership
    const { data: member } = await supabase.from("workspace_members").select("id").eq("workspace_id", workspace_id).eq("user_id", claimsData.claims.sub).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    let contactIds: string[] = [];

    // Pre-built segments
    if (segment_type === "active") {
      // Opened at least 1 email in last 30 days
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from("marketing_events")
        .select("email")
        .eq("workspace_id", workspace_id)
        .eq("event_type", "opened")
        .gte("occurred_at", cutoff);
      
      const emails = [...new Set((events || []).map(e => e.email).filter(Boolean))];
      if (emails.length > 0) {
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id")
          .eq("workspace_id", workspace_id)
          .in("email", emails);
        contactIds = (contacts || []).map(c => c.id);
      }
    } else if (segment_type === "at_risk") {
      // Haven't opened in 30-60 days
      const cutoff60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentEvents } = await supabase
        .from("marketing_events")
        .select("email")
        .eq("workspace_id", workspace_id)
        .eq("event_type", "opened")
        .gte("occurred_at", cutoff30);
      
      const recentEmails = new Set((recentEvents || []).map(e => e.email?.toLowerCase()).filter(Boolean));
      
      const { data: olderEvents } = await supabase
        .from("marketing_events")
        .select("email")
        .eq("workspace_id", workspace_id)
        .eq("event_type", "opened")
        .gte("occurred_at", cutoff60)
        .lt("occurred_at", cutoff30);
      
      const atRiskEmails = [...new Set((olderEvents || []).map(e => e.email).filter(e => e && !recentEmails.has(e!.toLowerCase())))];
      if (atRiskEmails.length > 0) {
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id")
          .eq("workspace_id", workspace_id)
          .in("email", atRiskEmails);
        contactIds = (contacts || []).map(c => c.id);
      }
    } else if (segment_type === "inactive") {
      // Haven't opened in 60+ days
      const cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: activeEvents } = await supabase
        .from("marketing_events")
        .select("email")
        .eq("workspace_id", workspace_id)
        .eq("event_type", "opened")
        .gte("occurred_at", cutoff);
      
      const activeEmails = new Set((activeEvents || []).map(e => e.email?.toLowerCase()).filter(Boolean));
      
      const { data: allContacts } = await supabase
        .from("contacts")
        .select("id, email")
        .eq("workspace_id", workspace_id)
        .not("email", "is", null);
      
      contactIds = (allContacts || []).filter(c => c.email && !activeEmails.has(c.email.toLowerCase())).map(c => c.id);
    } else if (segment_type === "never_opened") {
      // 0 opens historically
      const { data: allOpenEmails } = await supabase
        .from("marketing_events")
        .select("email")
        .eq("workspace_id", workspace_id)
        .eq("event_type", "opened");
      
      const openedEmails = new Set((allOpenEmails || []).map(e => e.email?.toLowerCase()).filter(Boolean));
      
      const { data: allContacts } = await supabase
        .from("contacts")
        .select("id, email")
        .eq("workspace_id", workspace_id)
        .not("email", "is", null);
      
      contactIds = (allContacts || []).filter(c => c.email && !openedEmails.has(c.email.toLowerCase())).map(c => c.id);
    }

    return new Response(JSON.stringify({
      count: contactIds.length,
      contact_ids: contactIds.slice(0, 1000),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Dynamic segments error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

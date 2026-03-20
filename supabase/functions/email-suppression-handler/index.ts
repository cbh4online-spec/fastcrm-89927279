import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { event_type, email, campaign_id, workspace_id } = await req.json();

    if (!event_type || !email || !workspace_id) {
      return new Response(JSON.stringify({ error: "event_type, email, workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reasonMap: Record<string, string> = {
      "email.bounced": "hard_bounce",
      "email.complained": "spam_complaint",
      bounce: "hard_bounce",
      complaint: "spam_complaint",
      unsubscribe: "unsubscribe",
      soft_bounce: "soft_bounce",
    };

    const reason = reasonMap[event_type] || "manual";

    // Insert suppression (ignore conflict if already exists)
    await supabase.from("campaign_suppressions").upsert({
      workspace_id,
      email: email.toLowerCase(),
      reason,
      campaign_id: campaign_id || null,
    }, { onConflict: "workspace_id,email", ignoreDuplicates: true });

    // Update recipient status
    if (campaign_id) {
      await supabase.from("marketing_recipients")
        .update({ status: reason === "hard_bounce" ? "bounced" : "suppressed" })
        .eq("campaign_id", campaign_id)
        .eq("email", email);
    }

    // For hard bounces and complaints, mark contact email as invalid
    if (reason === "hard_bounce" || reason === "spam_complaint") {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("email", email)
        .maybeSingle();

      if (contact) {
        // Add a tag to indicate invalid email rather than deleting
        const { data: existing } = await supabase.from("contacts").select("tags").eq("id", contact.id).single();
        const tags = [...((existing?.tags as string[]) || []), "email_invalid"];
        await supabase.from("contacts").update({ tags }).eq("id", contact.id);
      }
    }

    return new Response(JSON.stringify({ success: true, reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Suppression handler error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find scheduled items that are due
    const { data: dueItems, error: fetchError } = await supabase
      .from("prospecting_outreach_queue")
      .select("*, professional_prospecting_profiles(profile_name, workspace_id)")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;

    if (!dueItems || dueItems.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const item of dueItems) {
      // Mark as ready
      const { error: updateError } = await supabase
        .from("prospecting_outreach_queue")
        .update({ status: "ready" })
        .eq("id", item.id);

      if (updateError) {
        console.error("Error updating queue item:", updateError);
        continue;
      }

      // Create notification
      const profileName =
        (item as any).professional_prospecting_profiles?.profile_name ||
        "Perfil";
      const stepLabel = item.step_index === 1 ? "Follow-up" : "Fecho";

      await supabase.from("admin_notifications").insert({
        workspace_id: item.workspace_id,
        type: "prospecting_followup",
        title: `📬 ${stepLabel} pronto para ${profileName}`,
        message: `A mensagem de ${stepLabel.toLowerCase()} está pronta para enviar. Vai à página de Prospecção para enviar com um clique.`,
        metadata: {
          queue_id: item.id,
          profile_id: item.profile_id,
          step_index: item.step_index,
        },
      });

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Outreach processor error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find scheduled items that are due
    const { data: dueItems, error: fetchError } = await supabase
      .from("prospecting_outreach_queue")
      .select("*, professional_prospecting_profiles(id, profile_name, profile_url, profile_bio, inferred_profession, inferred_specialty, inferred_location, instagram_followers_count, instagram_category, instagram_is_verified, instagram_is_business, workspace_id)")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;

    console.log(`[PROSPECTING] Processor: ${dueItems?.length || 0} due items`);

    if (!dueItems || dueItems.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let messageErrors = 0;

    for (const item of dueItems) {
      const profile = (item as any).professional_prospecting_profiles;
      const profileName = profile?.profile_name || "Perfil";
      const stepLabel = item.step_index === 1 ? "Follow-up" : "Fecho";

      // Fetch workspace service context
      let serviceContext: Record<string, string> | null = null;
      let workspaceContext: Record<string, string> | null = null;
      let tone = item.tone || "casual";

      try {
        const { data: settings } = await supabase
          .from("lead_enricher_settings")
          .select("service_offer, service_pain_points, default_prospecting_tone")
          .eq("workspace_id", item.workspace_id)
          .maybeSingle();

        if (settings) {
          if (settings.service_offer) {
            serviceContext = {
              offer: settings.service_offer,
              painPoints: settings.service_pain_points || "",
            };
          }
          if (settings.default_prospecting_tone) {
            tone = settings.default_prospecting_tone;
          }
        }

        // Fetch workspace name
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("name, description")
          .eq("id", item.workspace_id)
          .maybeSingle();

        if (workspace) {
          workspaceContext = {
            name: workspace.name || "",
            description: workspace.description || "",
          };
        }
      } catch (e) {
        console.error("Error fetching settings:", e);
      }

      // Generate message via AI
      let message: string | null = null;
      let messagePlain: string | null = null;

      try {
        const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-prospecting-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
            "apikey": anonKey,
          },
          body: JSON.stringify({
            profile: {
              name: profile?.profile_name,
              profession: profile?.inferred_profession,
              specialty: profile?.inferred_specialty,
              bio: profile?.profile_bio,
              location: profile?.inferred_location,
              followers: profile?.instagram_followers_count,
              category: profile?.instagram_category,
              isVerified: profile?.instagram_is_verified,
              isBusiness: profile?.instagram_is_business,
            },
            tone,
            workspaceContext,
            serviceContext,
            sequenceStep: item.step_index + 1, // step_index 1 = follow-up (step 2), step_index 2 = fecho (step 3)
          }),
        });

        if (generateResponse.ok) {
          const genData = await generateResponse.json();
          message = genData.message || null;
          messagePlain = genData.message_plain || null;
        } else {
          console.error("Message generation failed:", generateResponse.status, await generateResponse.text());
          messageErrors++;
        }
      } catch (e) {
        console.error("Error generating message:", e);
        messageErrors++;
      }

      // Update queue item: set message + mark as ready
      const { error: updateError } = await supabase
        .from("prospecting_outreach_queue")
        .update({
          status: "ready",
          message,
          message_plain: messagePlain,
        })
        .eq("id", item.id);

      if (updateError) {
        console.error("Error updating queue item:", updateError);
        continue;
      }

      // Create notification
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

      console.log(`[PROSPECTING] Processed: profile=${profileName}, step=${item.step_index}`);
      processed++;
    }

    return new Response(JSON.stringify({ processed, messageErrors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[PROSPECTING] PROCESSOR_FAILED", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

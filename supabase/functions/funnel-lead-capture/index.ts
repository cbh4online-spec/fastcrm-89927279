import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      workspace_id,
      funnel_id,
      step_id,
      submission_id,
      name,
      email,
      consent_given,
      marketing_opt_in,
      utm_source,
      utm_medium,
      utm_campaign,
      slug,
      step_type,
    } = body;

    if (!workspace_id || !funnel_id || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Lookup lead by email in workspace
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, tags")
      .eq("workspace_id", workspace_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    let leadId: string;
    let isNew = false;

    // Build tags
    const newTags: string[] = [];
    if (slug) newTags.push(`funnel:${slug}`);
    if (step_type) newTags.push(`step:${step_type}`);
    if (utm_campaign) newTags.push(`campaign:${utm_campaign}`);
    if (marketing_opt_in) newTags.push("marketing_opt_in");

    if (existingLead) {
      leadId = existingLead.id;
      // Merge tags
      const currentTags: string[] = Array.isArray(existingLead.tags) ? existingLead.tags : [];
      const mergedTags = [...new Set([...currentTags, ...newTags])];

      await supabase
        .from("leads")
        .update({
          tags: mergedTags,
          updated_at: new Date().toISOString(),
          ...(name ? { name } : {}),
        })
        .eq("id", leadId);
    } else {
      // 2. Create new lead
      isNew = true;
      const { data: newLead, error: createError } = await supabase
        .from("leads")
        .insert({
          workspace_id,
          name: name || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          source: "funnel",
          status: "new",
          tags: newTags,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Lead creation error:", createError);
        return new Response(JSON.stringify({ error: "Failed to create lead" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      leadId = newLead.id;
    }

    // 3. Update submission with lead_id
    if (submission_id) {
      await supabase
        .from("funnel_submissions")
        .update({ lead_id: leadId })
        .eq("id", submission_id);
    }

    // 4. Activity logs
    await supabase.from("activity_logs").insert({
      workspace_id,
      entity_type: "lead",
      entity_id: leadId,
      action: "funnel.lead_captured",
      details: {
        funnel_id,
        step_id,
        slug,
        step_type,
        is_new: isNew,
        utm_source,
        utm_medium,
        utm_campaign,
        consent_given,
        marketing_opt_in,
      },
    });

    if (isNew) {
      await supabase.from("activity_logs").insert({
        workspace_id,
        entity_type: "lead",
        entity_id: leadId,
        action: "funnel.lead_created",
        details: { funnel_id, slug, email: normalizedEmail },
      });
    }

    return new Response(
      JSON.stringify({ lead_id: leadId, is_new: isNew }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("funnel-lead-capture error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

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

    // 1. Lookup contact by email in workspace
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id, tags")
      .eq("workspace_id", workspace_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    let contactId: string;
    let isNew = false;

    // Build tags
    const newTags: string[] = [];
    if (slug) newTags.push(`funnel:${slug}`);
    if (step_type) newTags.push(`step:${step_type}`);
    if (utm_campaign) newTags.push(`campaign:${utm_campaign}`);
    if (marketing_opt_in) newTags.push("marketing_opt_in");

    if (existingContact) {
      contactId = existingContact.id;
      // Merge tags
      const currentTags: string[] = Array.isArray(existingContact.tags) ? existingContact.tags : [];
      const mergedTags = [...new Set([...currentTags, ...newTags])];

      await supabase
        .from("contacts")
        .update({
          tags: mergedTags,
          updated_at: new Date().toISOString(),
          ...(name ? { name } : {}),
        })
        .eq("id", contactId);
    } else {
      // 2. Create new contact
      isNew = true;
      const { data: newContact, error: createError } = await supabase
        .from("contacts")
        .insert({
          workspace_id,
          name: name || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          source: "funnel",
          lead_source: "funnel",
          tags: newTags,
          status: "lead",
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Contact creation error:", createError);
        return new Response(JSON.stringify({ error: "Failed to create contact" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      contactId = newContact.id;
    }

    // 3. Update submission with contact_id
    if (submission_id) {
      await supabase
        .from("funnel_submissions")
        .update({ contact_id: contactId })
        .eq("id", submission_id);
    }

    // 4. Activity logs
    await supabase.from("activity_logs").insert({
      workspace_id,
      entity_type: "contact",
      entity_id: contactId,
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
        entity_type: "contact",
        entity_id: contactId,
        action: "funnel.contact_created",
        details: { funnel_id, slug, email: normalizedEmail },
      });
    }

    return new Response(
      JSON.stringify({ contact_id: contactId, is_new: isNew }),
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

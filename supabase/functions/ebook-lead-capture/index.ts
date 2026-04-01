import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      workspace_id, ebook_id, view_id, name, email,
      consent_given, marketing_opt_in,
      utm_source, utm_medium, utm_campaign, slug,
    } = body;

    if (!workspace_id || !ebook_id || !email?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = (name || "").trim();

    // 1. Lookup existing contact by email in workspace
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id, tags")
      .eq("workspace_id", workspace_id)
      .eq("email", trimmedEmail)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    let contactId: string;
    let isNew = false;
    const ebookTag = `ebook:${slug || ebook_id}`;
    const baseTags: string[] = [ebookTag];
    if (utm_campaign) baseTags.push(`campaign:${utm_campaign}`);
    if (marketing_opt_in) baseTags.push("marketing_opt_in");

    if (existingContact) {
      contactId = existingContact.id;
      // Merge tags without duplicates
      const currentTags: string[] = Array.isArray(existingContact.tags) ? existingContact.tags : [];
      const mergedTags = [...new Set([...currentTags, ...baseTags])];
      await supabase
        .from("contacts")
        .update({
          tags: mergedTags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contactId);
    } else {
      isNew = true;
      // Split name into first_name / last_name
      const parts = trimmedName.split(/\s+/);
      const firstName = parts[0] || trimmedName;
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

      const { data: newContact, error: createErr } = await supabase
        .from("contacts")
        .insert({
          workspace_id,
          name: trimmedName || trimmedEmail,
          first_name: firstName,
          last_name: lastName,
          email: trimmedEmail,
          source: "ebook",
          lead_source: "ebook",
          tags: baseTags,
        })
        .select("id")
        .single();

      if (createErr) {
        console.error("Error creating contact:", createErr);
        return new Response(
          JSON.stringify({ success: false, error: createErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      contactId = newContact.id;
    }

    // 2. Update ebook_view with contact_id
    if (view_id) {
      await supabase
        .from("ebook_views")
        .update({ contact_id: contactId })
        .eq("id", view_id);
    }

    // 3. Emit kernel events (fire-and-forget via direct insert to kernel_events if table exists)
    const events = [
      {
        workspace_id,
        type: "ebook.lead_captured",
        entity_kind: "contact",
        entity_id: contactId,
        actor_type: "system",
        actor_id: "ebook-lead-capture",
        source_module: "ebooks",
        schema_version: 1,
        occurred_at: new Date().toISOString(),
        payload: {
          ebook_id,
          slug,
          email: trimmedEmail,
          consent_given,
          marketing_opt_in,
          utm_source,
          utm_medium,
          utm_campaign,
          is_new_contact: isNew,
        },
      },
    ];

    if (isNew) {
      events.push({
        workspace_id,
        type: "ebook.contact_created",
        entity_kind: "contact",
        entity_id: contactId,
        actor_type: "system",
        actor_id: "ebook-lead-capture",
        source_module: "ebooks",
        schema_version: 1,
        occurred_at: new Date().toISOString(),
        payload: { ebook_id, slug, email: trimmedEmail },
      });
    } else {
      events.push({
        workspace_id,
        type: "ebook.contact_matched",
        entity_kind: "contact",
        entity_id: contactId,
        actor_type: "system",
        actor_id: "ebook-lead-capture",
        source_module: "ebooks",
        schema_version: 1,
        occurred_at: new Date().toISOString(),
        payload: { ebook_id, slug, email: trimmedEmail },
      });
    }

    if (marketing_opt_in) {
      events.push({
        workspace_id,
        type: "ebook.marketing_opt_in",
        entity_kind: "contact",
        entity_id: contactId,
        actor_type: "system",
        actor_id: "ebook-lead-capture",
        source_module: "ebooks",
        schema_version: 1,
        occurred_at: new Date().toISOString(),
        payload: { ebook_id, slug, email: trimmedEmail },
      });
    }

    // Try to insert kernel events (ignore if table doesn't exist)
    try {
      await supabase.from("kernel_events").insert(events);
    } catch {
      // kernel_events table may not exist yet
    }

    return new Response(
      JSON.stringify({ success: true, contact_id: contactId, is_new: isNew }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ebook-lead-capture error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

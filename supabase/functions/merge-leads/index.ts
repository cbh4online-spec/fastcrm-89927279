import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization");

    // Get user from JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, master_lead_id, merged_lead_ids, field_selections, group_id, quick_merge } = await req.json();
    if (!workspace_id || !master_lead_id || !merged_lead_ids?.length) {
      throw new Error("workspace_id, master_lead_id, and merged_lead_ids required");
    }

    // === SAFETY CHECKS ===
    const allIds = [master_lead_id, ...merged_lead_ids];
    const { data: allLeads, error: leadsErr } = await supabase
      .from("leads")
      .select("*")
      .in("id", allIds)
      .eq("workspace_id", workspace_id);

    if (leadsErr) throw leadsErr;
    if (!allLeads || allLeads.length !== allIds.length) {
      throw new Error("Some leads not found or belong to different workspaces");
    }

    // Check for locked records (if any lead has status 'locked')
    const lockedLeads = allLeads.filter(l => l.status === "locked");
    if (lockedLeads.length > 0) {
      throw new Error(`Cannot merge: ${lockedLeads.length} lead(s) are locked by another process`);
    }

    const masterLead = allLeads.find(l => l.id === master_lead_id);
    const duplicateLeads = allLeads.filter(l => l.id !== master_lead_id);
    if (!masterLead) throw new Error("Master lead not found");

    // === BUILD MERGED DATA ===
    const mergedData: Record<string, any> = {};
    const mergeSummary: Record<string, any> = {
      merged_count: duplicateLeads.length,
      field_sources: {},
      notes_preserved: 0,
      tags_preserved: 0,
      emails_preserved: 0,
      phones_preserved: 0,
      timeline_items_merged: 0,
      relationships_migrated: {},
      owner_after_merge: null,
    };

    // Scalar fields: use field_selections if provided, otherwise prefer non-empty most recent
    const scalarFields = [
      "email", "phone", "fax", "external_email", "source", "company_name",
      "company_status", "website", "linkedin_url", "facebook_url", "instagram_url",
      "twitter_url", "city", "address", "county", "parish", "region", "postal_code",
      "latitude", "longitude", "business_category", "tax_id", "legal_nature",
      "capital_social", "founding_date", "assigned_to", "estimated_value",
      "conversion_probability", "avatar_url", "inferred_profession",
      "inferred_specialty", "inferred_type", "inferred_workplace",
      "external_username", "external_instagram_id", "external_whatsapp_id",
      "google_place_id", "instagram_bio", "instagram_category",
    ];

    for (const field of scalarFields) {
      if (field_selections?.[field]) {
        const sourceLeadId = field_selections[field];
        const sourceLead = allLeads.find(l => l.id === sourceLeadId);
        if (sourceLead?.[field] != null) {
          mergedData[field] = sourceLead[field];
          mergeSummary.field_sources[field] = sourceLeadId;
          continue;
        }
      }
      // Rule: never overwrite non-empty with empty
      if (masterLead[field] != null && masterLead[field] !== "") continue;
      // Find most recent non-empty value
      const sorted = [...duplicateLeads].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      for (const dup of sorted) {
        if (dup[field] != null && dup[field] !== "") {
          mergedData[field] = dup[field];
          mergeSummary.field_sources[field] = dup.id;
          break;
        }
      }
    }

    // === LIST FIELDS: Union without duplicates ===

    // Tags
    const allTags = new Set<string>(masterLead.tags || []);
    duplicateLeads.forEach(d => (d.tags || []).forEach((t: string) => allTags.add(t)));
    mergedData.tags = Array.from(allTags);
    mergeSummary.tags_preserved = mergedData.tags.length;

    // Notes: combine all
    let mergedNotes = masterLead.notes || "";
    duplicateLeads.forEach(d => {
      if (d.notes?.trim()) {
        mergedNotes += `\n\n--- Notas de ${d.name} (ID: ${d.id.slice(0, 8)}) ---\n${d.notes}`;
        mergeSummary.notes_preserved++;
      }
    });
    if (masterLead.notes?.trim()) mergeSummary.notes_preserved++;
    if (mergedNotes.trim()) mergedData.notes = mergedNotes.trim();

    // Services: union
    const allServices = new Set<string>(masterLead.services || []);
    duplicateLeads.forEach(d => (d.services || []).forEach((s: string) => allServices.add(s)));
    if (allServices.size > 0) mergedData.services = Array.from(allServices);

    // CAE codes: union
    const allCaes = new Set<string>(masterLead.cae_codes || []);
    duplicateLeads.forEach(d => (d.cae_codes || []).forEach((c: string) => allCaes.add(c)));
    if (allCaes.size > 0) mergedData.cae_codes = Array.from(allCaes);

    // Photos: union
    const allPhotos = new Set<string>(masterLead.photos || []);
    duplicateLeads.forEach(d => (d.photos || []).forEach((p: string) => allPhotos.add(p)));
    if (allPhotos.size > 0) mergedData.photos = Array.from(allPhotos);

    // Lead sources: preserve all historical sources
    const allSources = new Set<string>();
    allLeads.forEach(l => { if (l.source) allSources.add(l.source); });
    if (allSources.size > 1) {
      mergedData.notes = (mergedData.notes || masterLead.notes || "") + 
        `\n\n--- Fontes históricas ---\n${Array.from(allSources).join(", ")}`;
    }

    // Preserve unique emails and phones
    const allEmails = new Set<string>();
    const allPhones = new Set<string>();
    allLeads.forEach(l => {
      if (l.email) allEmails.add(l.email);
      if (l.external_email) allEmails.add(l.external_email);
      if (l.phone) allPhones.add(l.phone);
      if (l.fax) allPhones.add(l.fax);
    });
    mergeSummary.emails_preserved = allEmails.size;
    mergeSummary.phones_preserved = allPhones.size;

    // Update master lead
    mergedData.updated_at = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("leads")
      .update(mergedData)
      .eq("id", master_lead_id);
    if (updateErr) throw updateErr;

    // === RELATIONSHIP REASSIGNMENT ===
    const dupIds = merged_lead_ids;
    
    // Core relationship tables
    const migrationTables = [
      { table: "opportunities", column: "lead_id" },
      { table: "conversations", column: "lead_id" },
      { table: "tasks", column: "related_id" },
      { table: "notes", column: "entity_id" },
      { table: "activity_logs", column: "record_id" },
    ];

    let totalTimelineItems = 0;

    for (const { table, column } of migrationTables) {
      try {
        const { data: existing } = await supabase
          .from(table)
          .select("id")
          .in(column, dupIds);

        if (existing?.length) {
          await supabase
            .from(table)
            .update({ [column]: master_lead_id } as any)
            .in(column, dupIds);
          mergeSummary.relationships_migrated[table] = existing.length;
          totalTimelineItems += existing.length;
        }
      } catch (e) {
        console.warn(`Migration for ${table} skipped:`, e);
      }
    }

    // Proposals
    try {
      const { data: props } = await (supabase.from("proposals") as any)
        .select("id")
        .in("lead_id", dupIds);
      if (props?.length) {
        await (supabase.from("proposals") as any)
          .update({ lead_id: master_lead_id })
          .in("lead_id", dupIds);
        mergeSummary.relationships_migrated.proposals = props.length;
        totalTimelineItems += props.length;
      }
    } catch (e) { console.warn("Proposals migration skipped:", e); }

    // Messages (via conversations already migrated — also check direct messages)
    try {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, conversation_id")
        .in("conversation_id", 
          (await supabase.from("conversations").select("id").eq("lead_id", master_lead_id)).data?.map((c: any) => c.id) || []
        );
      if (msgs?.length) {
        totalTimelineItems += msgs.length;
        mergeSummary.relationships_migrated.messages = msgs.length;
      }
    } catch (e) { console.warn("Messages count skipped:", e); }

    // Object relationships (polymorphic)
    try {
      for (const dupId of dupIds) {
        await supabase
          .from("object_relationships")
          .update({ source_id: master_lead_id } as any)
          .eq("source_id", dupId)
          .eq("source_type", "lead");
        await supabase
          .from("object_relationships")
          .update({ target_id: master_lead_id } as any)
          .eq("target_id", dupId)
          .eq("target_type", "lead");
      }
      mergeSummary.relationships_migrated.object_relationships = "migrated";
    } catch (e) { console.warn("Object relationships migration skipped:", e); }

    // Lead behavior signals
    try {
      const { data: signals } = await supabase
        .from("lead_behavior_signals")
        .select("id")
        .in("lead_id", dupIds);
      if (signals?.length) {
        await supabase
          .from("lead_behavior_signals")
          .update({ lead_id: master_lead_id } as any)
          .in("lead_id", dupIds);
        mergeSummary.relationships_migrated.behavior_signals = signals.length;
      }
    } catch (e) { console.warn("Behavior signals migration skipped:", e); }

    // AI agent executions related to leads
    try {
      await supabase
        .from("ai_agent_executions")
        .update({ entity_id: master_lead_id } as any)
        .in("entity_id", dupIds)
        .eq("entity_type", "lead");
    } catch (e) { console.warn("AI executions migration skipped:", e); }

    // AI field suggestions
    try {
      await supabase
        .from("ai_field_suggestions")
        .update({ entity_id: master_lead_id } as any)
        .in("entity_id", dupIds)
        .eq("entity_type", "lead");
    } catch (e) { console.warn("AI suggestions migration skipped:", e); }

    mergeSummary.timeline_items_merged = totalTimelineItems;
    mergeSummary.owner_after_merge = mergedData.assigned_to || masterLead.assigned_to || user.id;

    // === SOFT DELETE MERGED LEADS ===
    const { error: softDelErr } = await supabase
      .from("leads")
      .update({
        status: "merged",
        notes: `[MERGED] Fundido em lead ${master_lead_id} por ${user.id} em ${new Date().toISOString()}`,
        deleted_at: new Date().toISOString(),
      } as any)
      .in("id", dupIds);
    if (softDelErr) throw softDelErr;

    // === CREATE AUDIT TRAIL ===
    const { error: auditErr } = await supabase
      .from("lead_merge_audit")
      .insert({
        workspace_id,
        master_lead_id,
        merged_lead_ids: dupIds,
        merged_by: user.id,
        merge_summary_json: mergeSummary,
      });
    if (auditErr) console.error("Audit insert error:", auditErr);

    // === UPDATE DUPLICATE GROUP STATUS ===
    if (group_id) {
      await supabase
        .from("lead_duplicate_groups")
        .update({ status: "merged", updated_at: new Date().toISOString() })
        .eq("id", group_id);
    }

    // === POST-MERGE: Refresh duplicate groups (remove groups containing merged leads) ===
    try {
      const { data: affectedItems } = await supabase
        .from("lead_duplicate_group_items")
        .select("group_id")
        .in("lead_id", dupIds);
      
      if (affectedItems?.length) {
        const affectedGroupIds = [...new Set(affectedItems.map(i => i.group_id))];
        // Remove items pointing to merged leads
        await supabase
          .from("lead_duplicate_group_items")
          .delete()
          .in("lead_id", dupIds);
        
        // Mark groups with < 2 items remaining as resolved
        for (const gid of affectedGroupIds) {
          const { data: remaining } = await supabase
            .from("lead_duplicate_group_items")
            .select("id")
            .eq("group_id", gid);
          if (!remaining || remaining.length < 2) {
            await supabase
              .from("lead_duplicate_groups")
              .update({ status: "resolved", updated_at: new Date().toISOString() })
              .eq("id", gid);
          }
        }
      }
    } catch (e) { console.warn("Duplicate group cleanup skipped:", e); }

    // === POST-MERGE: Trigger AI recalculation (fire-and-forget) ===
    try {
      await supabase.functions.invoke("analyze-lead", {
        body: { lead_id: master_lead_id, workspace_id, source: "post_merge" },
      });
    } catch (e) { console.warn("Post-merge AI recalculation skipped:", e); }

    return new Response(
      JSON.stringify({
        success: true,
        master_lead_id,
        merged_count: dupIds.length,
        summary: mergeSummary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Log failed merge attempt
    console.error("merge-leads error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

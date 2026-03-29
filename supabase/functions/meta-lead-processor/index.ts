import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Meta Lead Processor — processes pending leads from meta_leads:
 * 1. Fetches full lead data from Graph API
 * 2. Normalizes fields using field mappings
 * 3. Deduplicates against existing contacts
 * 4. Creates/updates contact (and optionally opportunity)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get pending leads (batch of 20)
    const { data: pendingLeads, error: fetchError } = await supabase
      .from("meta_leads")
      .select("*")
      .eq("processing_status", "pending")
      .order("received_at", { ascending: true })
      .limit(20);

    if (fetchError) throw fetchError;
    if (!pendingLeads?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    for (const lead of pendingLeads) {
      try {
        // Mark as processing
        await supabase.from("meta_leads")
          .update({ processing_status: "processing" })
          .eq("id", lead.id);

        // Get page access token for this page
        const { data: pageAsset } = await supabase
          .from("meta_assets")
          .select("page_access_token")
          .eq("workspace_id", lead.workspace_id)
          .eq("asset_type", "page")
          .eq("asset_id_external", lead.page_id)
          .eq("selected_for_use", true)
          .maybeSingle();

        if (!pageAsset?.page_access_token) {
          throw new Error(`No active page token for page ${lead.page_id}`);
        }

        // Fetch full lead data from Meta
        const leadRes = await fetch(
          `https://graph.facebook.com/v21.0/${lead.lead_id_external}?access_token=${pageAsset.page_access_token}`
        );

        let leadData: any = {};
        if (leadRes.ok) {
          leadData = await leadRes.json();
        } else {
          console.warn("[meta-lead-processor] Failed to fetch lead data, using raw payload");
          leadData = lead.raw_payload_json || {};
        }

        // Normalize fields
        const normalized = await normalizeLeadFields(
          supabase,
          lead.workspace_id,
          lead.form_id,
          leadData
        );

        // Update lead with normalized data
        await supabase.from("meta_leads").update({
          normalized_payload_json: normalized,
          dedupe_key: generateDedupeKey(normalized),
        }).eq("id", lead.id);

        // Deduplicate and create/update contact
        const contactResult = await deduplicateAndCreateContact(
          supabase,
          lead.workspace_id,
          normalized,
          lead
        );

        // Get workspace config for auto-opportunity
        const { data: config } = await supabase
          .from("meta_module_config")
          .select("auto_create_opportunity, default_pipeline_id, default_lead_owner_id")
          .eq("workspace_id", lead.workspace_id)
          .maybeSingle();

        let opportunityId: string | null = null;
        if (config?.auto_create_opportunity && contactResult.contactId) {
          opportunityId = await createOpportunity(
            supabase,
            lead.workspace_id,
            contactResult.contactId,
            normalized,
            lead,
            config
          );
        }

        // Mark as processed
        await supabase.from("meta_leads").update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          contact_id: contactResult.contactId,
          opportunity_id: opportunityId,
          normalized_payload_json: normalized,
          dedupe_key: generateDedupeKey(normalized),
        }).eq("id", lead.id);

        processed++;
      } catch (err) {
        console.error("[meta-lead-processor] Lead processing failed:", lead.id, err);
        await supabase.from("meta_leads").update({
          processing_status: "failed",
          error_message: (err as Error).message,
        }).eq("id", lead.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ processed, failed, total: pendingLeads.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[meta-lead-processor] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function normalizeLeadFields(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  formId: string | null,
  leadData: any
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  // Get field mappings
  const { data: mappings } = await supabase
    .from("meta_lead_field_mappings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .or(formId ? `form_id.eq.${formId},form_id.is.null` : "form_id.is.null");

  const mappingMap = new Map<string, any>();
  for (const m of mappings || []) {
    mappingMap.set(m.meta_field_name.toLowerCase(), m);
  }

  // Process lead data fields
  const fieldData = leadData.field_data || [];
  for (const field of fieldData) {
    const fieldName = (field.name || "").toLowerCase();
    const fieldValue = Array.isArray(field.values) ? field.values[0] : field.values;

    if (!fieldValue) continue;

    const mapping = mappingMap.get(fieldName);
    if (mapping) {
      result[mapping.crm_field_name] = applyTransform(fieldValue, mapping.transform_rule);
    } else {
      // Auto-map common fields
      if (fieldName === "email") result.email = fieldValue.toLowerCase().trim();
      else if (fieldName === "phone_number" || fieldName === "phone") result.phone = normalizePhone(fieldValue);
      else if (fieldName === "full_name") result.name = capitalizeWords(fieldValue);
      else if (fieldName === "first_name") result.first_name = capitalizeWords(fieldValue);
      else if (fieldName === "last_name") result.last_name = capitalizeWords(fieldValue);
      else if (fieldName === "company_name") result.company = fieldValue;
      else if (fieldName === "city") result.city = fieldValue;
      else result[fieldName] = fieldValue;
    }
  }

  // Build full name if needed
  if (!result.name && (result.first_name || result.last_name)) {
    result.name = [result.first_name, result.last_name].filter(Boolean).join(" ");
  }

  return result;
}

function applyTransform(value: string, rule: string): string {
  switch (rule) {
    case "phone_normalize": return normalizePhone(value);
    case "email_lowercase": return value.toLowerCase().trim();
    case "name_capitalize": return capitalizeWords(value);
    default: return value;
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateDedupeKey(normalized: Record<string, string>): string {
  const parts = [
    normalized.email?.toLowerCase(),
    normalized.phone ? normalizePhone(normalized.phone) : null,
    normalized.name?.toLowerCase(),
  ].filter(Boolean);
  return parts.join("|");
}

async function deduplicateAndCreateContact(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  normalized: Record<string, string>,
  lead: any
): Promise<{ contactId: string | null; isNew: boolean }> {
  // 1. Try email match
  if (normalized.email) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", normalized.email)
      .maybeSingle();

    if (existing) {
      // Update existing contact with new data
      await supabase.from("contacts").update({
        phone: normalized.phone || undefined,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);

      return { contactId: existing.id, isNew: false };
    }
  }

  // 2. Try phone match
  if (normalized.phone) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("phone", normalized.phone)
      .maybeSingle();

    if (existing) {
      return { contactId: existing.id, isNew: false };
    }
  }

  // 3. Create new contact
  const { data: newContact, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: workspaceId,
      name: normalized.name || normalized.email || "Meta Lead",
      email: normalized.email || null,
      phone: normalized.phone || null,
      source: "meta_lead_ads",
      source_details: JSON.stringify({
        platform: lead.platform,
        form_id: lead.form_id,
        campaign_id: lead.campaign_id,
        ad_id: lead.ad_id,
        lead_id_external: lead.lead_id_external,
      }),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[meta-lead-processor] Contact creation failed:", error);
    return { contactId: null, isNew: false };
  }

  return { contactId: newContact.id, isNew: true };
}

async function createOpportunity(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  contactId: string,
  normalized: Record<string, string>,
  lead: any,
  config: any
): Promise<string | null> {
  try {
    const { data: opp, error } = await supabase
      .from("opportunities")
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        title: `Meta Lead - ${normalized.name || normalized.email || "Novo"}`,
        source: "meta_lead_ads",
        pipeline_id: config.default_pipeline_id || null,
        owner_id: config.default_lead_owner_id || null,
        stage: "new",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[meta-lead-processor] Opportunity creation failed:", error);
      return null;
    }
    return opp.id;
  } catch {
    return null;
  }
}

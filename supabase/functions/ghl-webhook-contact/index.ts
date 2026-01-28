import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ghl-location-id",
};

interface GHLContact {
  id: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  updated_at?: string;
  dateUpdated?: string;
}

interface GHLContactPayload {
  event_type?: string;
  location_id?: string;
  locationId?: string;
  contact: GHLContact;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body
    const body: GHLContactPayload = await req.json();
    
    // Get location ID from header or body
    const locationId = req.headers.get("X-GHL-Location-Id") || 
                       body.location_id || 
                       body.locationId;

    console.log("[GHL-CONTACT] Received webhook", { 
      locationId, 
      contactId: body.contact?.id,
      eventType: body.event_type 
    });

    if (!locationId) {
      console.error("[GHL-CONTACT] Missing location_id");
      return new Response(
        JSON.stringify({ error: "Missing location_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.contact?.id) {
      console.error("[GHL-CONTACT] Missing contact data");
      return new Response(
        JSON.stringify({ error: "Missing contact data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Find workspace by location_id (get first match if multiple exist)
    const { data: configs, error: configError } = await supabase
      .from("workspace_ghl_config")
      .select("workspace_id, sync_contacts")
      .eq("ghl_location_id", locationId)
      .eq("is_active", true)
      .limit(1);
    
    const config = configs?.[0] || null;

    if (configError) {
      console.error("[GHL-CONTACT] Config lookup error", configError);
      return new Response(
        JSON.stringify({ error: "Config lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config) {
      console.log("[GHL-CONTACT] No active config for location", locationId);
      return new Response(
        JSON.stringify({ message: "Location not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.sync_contacts) {
      console.log("[GHL-CONTACT] Contact sync disabled for workspace");
      return new Response(
        JSON.stringify({ message: "Contact sync disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceId = config.workspace_id;
    const contact = body.contact;
    const ghlContactId = contact.id;

    // 2. Check idempotency - have we already processed this contact?
    const { data: existingSync } = await supabase
      .from("ghl_sync_log")
      .select("id, fastcrm_entity_id, fastcrm_entity_type")
      .eq("workspace_id", workspaceId)
      .eq("ghl_entity_type", "contact")
      .eq("ghl_entity_id", ghlContactId)
      .maybeSingle();

    // Normalize contact fields (GHL sends both camelCase and snake_case)
    const firstName = contact.first_name || contact.firstName || "";
    const lastName = contact.last_name || contact.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || "GHL Contact";
    const email = contact.email?.trim() || null;
    const phone = contact.phone?.trim() || null;
    const tags = contact.tags || [];
    const customFields = contact.custom_fields || contact.customFields || {};

    let entityId: string;
    let entityType: "lead" | "contact";
    let eventType: "created" | "updated";

    if (existingSync) {
      // Update existing entity
      entityId = existingSync.fastcrm_entity_id;
      entityType = existingSync.fastcrm_entity_type as "lead" | "contact";
      eventType = "updated";

      const updateData = {
        name: fullName,
        email,
        phone,
        tags,
        ghl_synced_at: new Date().toISOString(),
      };

      if (entityType === "lead") {
        const { error: updateError } = await supabase
          .from("leads")
          .update(updateData)
          .eq("id", entityId);

        if (updateError) {
          console.error("[GHL-CONTACT] Lead update error", updateError);
        }
      } else {
        const { error: updateError } = await supabase
          .from("contacts")
          .update({
            ...updateData,
            first_name: firstName,
            last_name: lastName,
          })
          .eq("id", entityId);

        if (updateError) {
          console.error("[GHL-CONTACT] Contact update error", updateError);
        }
      }

      console.log("[GHL-CONTACT] Updated existing entity", { entityId, entityType });
    } else {
      // Check if we have a matching lead by email or phone
      let matchedLead = null;
      
      if (email) {
        const { data } = await supabase
          .from("leads")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("email", email)
          .maybeSingle();
        matchedLead = data;
      }
      
      if (!matchedLead && phone) {
        const { data } = await supabase
          .from("leads")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("phone", phone)
          .maybeSingle();
        matchedLead = data;
      }

      if (matchedLead) {
        // Update existing lead with GHL ID
        entityId = matchedLead.id;
        entityType = "lead";
        eventType = "updated";

        const { error: updateError } = await supabase
          .from("leads")
          .update({
            ghl_contact_id: ghlContactId,
            ghl_synced_at: new Date().toISOString(),
            tags,
          })
          .eq("id", entityId);

        if (updateError) {
          console.error("[GHL-CONTACT] Lead link error", updateError);
        }

        console.log("[GHL-CONTACT] Linked to existing lead", { entityId });
      } else {
        // Create new lead
        entityType = "lead";
        eventType = "created";

        const { data: newLead, error: insertError } = await supabase
          .from("leads")
          .insert({
            workspace_id: workspaceId,
            name: fullName,
            email,
            phone,
            source: "ghl",
            status: "new",
            tags,
            ghl_contact_id: ghlContactId,
            ghl_synced_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError || !newLead) {
          console.error("[GHL-CONTACT] Lead creation error", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to create lead" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        entityId = newLead.id;
        console.log("[GHL-CONTACT] Created new lead", { entityId });
      }

      // Log sync for idempotency
      const { error: logError } = await supabase
        .from("ghl_sync_log")
        .insert({
          workspace_id: workspaceId,
          ghl_entity_type: "contact",
          ghl_entity_id: ghlContactId,
          fastcrm_entity_type: entityType,
          fastcrm_entity_id: entityId,
          event_type: eventType,
          payload: body,
        });

      if (logError) {
        console.error("[GHL-CONTACT] Sync log error", logError);
      }
    }

    // Update last_sync_at on config
    await supabase
      .from("workspace_ghl_config")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        entity_id: entityId, 
        entity_type: entityType,
        event: eventType 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[GHL-CONTACT] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

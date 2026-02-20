import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ghl-location-id",
};

// Supports multiple GHL payload formats (workflow triggers, webhooks, etc.)
interface GHLWebhookPayload {
  // GHL workflow format - uses snake_case at root
  contact_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  tags?: string | string[];
  date_created?: string;
  contact_type?: string;
  location?: {
    id?: string;
    name?: string;
  };
  
  // GHL webhook format - uses camelCase at root
  type?: string;
  locationId?: string;
  location_id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  customFields?: Array<{ id: string; value: unknown }>;
  custom_fields?: Record<string, unknown>;
  dateAdded?: string;
  dateUpdated?: string;
  
  // Alternative nested format for compatibility
  event_type?: string;
  contact?: {
    id?: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse URL to get query params
    const url = new URL(req.url);
    const queryLocationId = url.searchParams.get("location_id");

    // Parse body
    const body: GHLWebhookPayload = await req.json();
    
    // Log full payload for debugging
    console.log("[GHL-CONTACT] Full payload received", JSON.stringify(body));
    
    // Get location ID from: query param > header > body > location object
    const locationId = queryLocationId ||
                       req.headers.get("X-GHL-Location-Id") || 
                       body.location_id || 
                       body.locationId ||
                       body.location?.id;

    // Extract contact ID - support workflow format (contact_id), webhook format (id), and nested format
    const ghlContactId = body.contact_id || body.id || body.contact?.id;

    console.log("[GHL-CONTACT] Received webhook", { 
      locationId, 
      contactId: ghlContactId,
      eventType: body.type || body.event_type 
    });

    if (!locationId) {
      console.error("[GHL-CONTACT] Missing location_id");
      return new Response(
        JSON.stringify({ error: "Missing location_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ghlContactId) {
      console.error("[GHL-CONTACT] Missing contact ID in payload");
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

    // 2. Check idempotency - have we already processed this contact?
    const { data: existingSync } = await supabase
      .from("ghl_sync_log")
      .select("id, fastcrm_entity_id, fastcrm_entity_type")
      .eq("workspace_id", workspaceId)
      .eq("ghl_entity_type", "contact")
      .eq("ghl_entity_id", ghlContactId)
      .maybeSingle();

    // Normalize contact fields - support workflow format, webhook format, and nested format
    const firstName = body.first_name || body.firstName || body.contact?.first_name || body.contact?.firstName || "";
    const lastName = body.last_name || body.lastName || body.contact?.last_name || body.contact?.lastName || "";
    const fullName = body.full_name || body.name || `${firstName} ${lastName}`.trim() || "GHL Contact";
    const email = body.email?.trim() || body.contact?.email?.trim() || null;
    const phone = body.phone?.trim() || body.contact?.phone?.trim() || null;
    
    // Tags can be string (comma-separated) or array
    let tags: string[] = [];
    if (typeof body.tags === "string" && body.tags) {
      tags = body.tags.split(",").map(t => t.trim()).filter(Boolean);
    } else if (Array.isArray(body.tags)) {
      tags = body.tags;
    } else if (Array.isArray(body.contact?.tags)) {
      tags = body.contact.tags;
    }
    
    console.log("[GHL-CONTACT] Normalized contact data", { ghlContactId, fullName, email, phone, tags });

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

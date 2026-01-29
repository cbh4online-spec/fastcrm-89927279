import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
  locationId?: string;
}

interface GHLContactsResponse {
  contacts: GHLContact[];
  meta?: {
    total?: number;
    startAfterId?: string;
    startAfter?: number;
  };
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  total_processed: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's auth for RLS
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get GHL config for workspace
    const { data: ghlConfig, error: configError } = await supabase
      .from("workspace_ghl_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (configError || !ghlConfig) {
      return new Response(
        JSON.stringify({ error: "GHL configuration not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = ghlConfig.ghl_api_key_encrypted;
    const locationId = ghlConfig.ghl_location_id;

    if (!apiKey || !locationId) {
      return new Response(
        JSON.stringify({ error: "GHL API Key or Location ID not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GHL Sync] Starting contact sync for workspace ${workspace_id}, location ${locationId}`);

    // Sync contacts from GHL
    const result: SyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      total_processed: 0,
    };

    let startAfterId: string | undefined = undefined;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 50; // Safety limit

    while (hasMore && pageCount < maxPages) {
      pageCount++;
      
      // Build GHL API URL with query params (GET method works with standard API Key)
      let ghlUrl = `https://services.leadconnectorhq.com/contacts/search?locationId=${encodeURIComponent(locationId)}&limit=100`;
      
      if (startAfterId) {
        ghlUrl += `&startAfterId=${encodeURIComponent(startAfterId)}`;
      }

      console.log(`[GHL Sync] Fetching page ${pageCount} via GET search endpoint`);

      const ghlResponse = await fetch(ghlUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      });

      if (!ghlResponse.ok) {
        const errorText = await ghlResponse.text();
        console.error(`[GHL Sync] API Error: ${ghlResponse.status} - ${errorText}`);
        
        // Provide user-friendly error messages
        if (ghlResponse.status === 401) {
          try {
            const errorData = JSON.parse(errorText);
            const errorMsg = errorData.message || "";
            if (errorMsg.includes("not authorized for this scope")) {
              result.errors.push("A API Key não tem permissão. Por favor, gere uma nova API Key no GHL com os scopes 'contacts.readonly' e 'contacts.search'.");
            } else {
              result.errors.push("API Key inválida ou expirada. Por favor, verifique a sua API Key.");
            }
          } catch {
            result.errors.push("API Key inválida ou expirada. Por favor, verifique a sua API Key.");
          }
        } else if (ghlResponse.status === 403) {
          result.errors.push("Acesso negado. Verifique se o Location ID está correcto.");
        } else {
          result.errors.push(`Erro da API GHL: ${ghlResponse.status} - ${errorText}`);
        }
        break;
      }

      const data: GHLContactsResponse = await ghlResponse.json();
      const contacts = data.contacts || [];

      console.log(`[GHL Sync] Page ${pageCount}: ${contacts.length} contacts`);

      if (contacts.length === 0) {
        hasMore = false;
        break;
      }

      // Process each contact
      for (const contact of contacts) {
        result.total_processed++;

        try {
          const fullName = [contact.firstName, contact.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || "Sem Nome";

          // Check if lead exists by ghl_contact_id, email, or phone
          let existingLead = null;

          // First check by ghl_contact_id
          const { data: byGhlId } = await supabase
            .from("leads")
            .select("id, ghl_contact_id")
            .eq("workspace_id", workspace_id)
            .eq("ghl_contact_id", contact.id)
            .limit(1)
            .maybeSingle();

          if (byGhlId) {
            existingLead = byGhlId;
          }

          // Check by email if not found
          if (!existingLead && contact.email) {
            const { data: byEmail } = await supabase
              .from("leads")
              .select("id, ghl_contact_id")
              .eq("workspace_id", workspace_id)
              .eq("email", contact.email.toLowerCase())
              .limit(1)
              .maybeSingle();

            if (byEmail) {
              existingLead = byEmail;
            }
          }

          // Check by phone if not found
          if (!existingLead && contact.phone) {
            const normalizedPhone = contact.phone.replace(/\D/g, "");
            const { data: byPhone } = await supabase
              .from("leads")
              .select("id, ghl_contact_id")
              .eq("workspace_id", workspace_id)
              .ilike("phone", `%${normalizedPhone.slice(-9)}%`)
              .limit(1)
              .maybeSingle();

            if (byPhone) {
              existingLead = byPhone;
            }
          }

          if (existingLead) {
            // Update existing lead with ghl_contact_id if not set
            if (!existingLead.ghl_contact_id) {
              await supabase
                .from("leads")
                .update({
                  ghl_contact_id: contact.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingLead.id);
              result.updated++;
            } else {
              result.skipped++;
            }
          } else {
            // Create new lead
            const { error: insertError } = await supabase.from("leads").insert({
              workspace_id,
              name: fullName,
              email: contact.email?.toLowerCase() || null,
              phone: contact.phone || null,
              ghl_contact_id: contact.id,
              status: "new",
              source: "ghl_sync",
              tags: contact.tags || [],
              created_at: contact.dateAdded || new Date().toISOString(),
            });

            if (insertError) {
              console.error(`[GHL Sync] Insert error for ${contact.id}:`, insertError);
              result.errors.push(`Failed to create lead for ${contact.id}: ${insertError.message}`);
            } else {
              result.created++;
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`[GHL Sync] Error processing contact ${contact.id}:`, errorMsg);
          result.errors.push(`Error processing ${contact.id}: ${errorMsg}`);
        }
      }

      // Check for more pages
      if (data.meta?.startAfterId) {
        startAfterId = data.meta.startAfterId;
      } else if (contacts.length < 100) {
        hasMore = false;
      } else {
        // Use last contact ID as cursor
        startAfterId = contacts[contacts.length - 1].id;
      }

      // Rate limiting delay (100ms between pages)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update last_sync_at
    await supabase
      .from("workspace_ghl_config")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id);

    // Log sync result
    await supabase.from("ghl_sync_log").insert({
      workspace_id,
      entity_type: "contact_sync",
      ghl_entity_id: `sync_${Date.now()}`,
      local_entity_id: null,
      local_entity_type: "leads",
      sync_direction: "inbound",
      status: result.errors.length > 0 ? "partial" : "success",
      error_message: result.errors.length > 0 ? result.errors.join("; ") : null,
      metadata: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        total_processed: result.total_processed,
        pages_fetched: pageCount,
      },
    });

    console.log(`[GHL Sync] Complete: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[GHL Sync] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

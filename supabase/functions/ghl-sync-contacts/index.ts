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

    const startTime = Date.now();
    const maxExecutionTime = 50000; // 50 seconds (leave buffer for cleanup)

    let startAfterId: string | undefined = undefined;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 100; // Safety limit
    let timedOut = false;

    while (hasMore && pageCount < maxPages) {
      // Check if we're running out of time
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`[GHL Sync] Approaching timeout, stopping after ${pageCount} pages`);
        timedOut = true;
        break;
      }

      pageCount++;
      
      // Use deprecated /contacts/ endpoint (requires contacts.readonly only, not contacts.search)
      let ghlUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(locationId)}&limit=100`;
      
      if (startAfterId) {
        ghlUrl += `&startAfterId=${encodeURIComponent(startAfterId)}`;
      }

      console.log(`[GHL Sync] Fetching page ${pageCount} via /contacts/ endpoint`);

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

      // Get all existing leads for batch comparison
      const ghlIds = contacts.map(c => c.id);
      const emails = contacts.filter(c => c.email).map(c => c.email!.toLowerCase());
      const phones = contacts.filter(c => c.phone).map(c => c.phone!.replace(/\D/g, "").slice(-9));

      // Batch query for existing leads
      const { data: existingByGhlId } = await supabase
        .from("leads")
        .select("id, ghl_contact_id, email, phone")
        .eq("workspace_id", workspace_id)
        .in("ghl_contact_id", ghlIds);

      const existingGhlIds = new Set((existingByGhlId || []).map(l => l.ghl_contact_id));

      // Prepare batch inserts
      const leadsToInsert: Array<{
        workspace_id: string;
        name: string;
        email: string | null;
        phone: string | null;
        ghl_contact_id: string;
        status: string;
        source: string;
        tags: string[];
        ghl_synced_at: string;
      }> = [];

      for (const contact of contacts) {
        result.total_processed++;

        // Skip if already synced
        if (existingGhlIds.has(contact.id)) {
          result.skipped++;
          continue;
        }

        const fullName = [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || "Sem Nome";

        leadsToInsert.push({
          workspace_id,
          name: fullName,
          email: contact.email?.toLowerCase() || null,
          phone: contact.phone || null,
          ghl_contact_id: contact.id,
          status: "new",
          source: "ghl",
          tags: contact.tags || [],
          ghl_synced_at: new Date().toISOString(),
        });
      }

      // Batch insert new leads
      if (leadsToInsert.length > 0) {
        const { error: insertError, data: insertedData } = await supabase
          .from("leads")
          .upsert(leadsToInsert, { 
            onConflict: "workspace_id,ghl_contact_id",
            ignoreDuplicates: true 
          })
          .select("id");

        if (insertError) {
          console.error(`[GHL Sync] Batch insert error:`, insertError);
          result.errors.push(`Batch insert failed: ${insertError.message}`);
        } else {
          result.created += insertedData?.length || leadsToInsert.length;
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

      // Minimal delay between pages
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Update last_sync_at
    await supabase
      .from("workspace_ghl_config")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id);

    // Log sync result
    await supabase.from("ghl_sync_log").insert({
      workspace_id,
      ghl_entity_type: "contact_batch",
      ghl_entity_id: `sync_${Date.now()}`,
      fastcrm_entity_type: "leads",
      fastcrm_entity_id: null,
      event_type: timedOut ? "partial_sync" : (result.errors.length > 0 ? "sync_with_errors" : "full_sync"),
      payload: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        total_processed: result.total_processed,
        pages_fetched: pageCount,
        timed_out: timedOut,
        errors: result.errors,
      },
    });

    if (timedOut) {
      result.errors.push(`Sincronização parcial: processadas ${pageCount} páginas (${result.total_processed} contactos). Execute novamente para continuar.`);
    }

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

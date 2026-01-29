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
    const { workspace_id, stream } = body;

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

    // ========== LOAD ALL EXISTING GHL CONTACT IDS UPFRONT ==========
    // This is more reliable than querying per-page with .in() which can have issues with large arrays
    const { data: existingLeadsData, error: existingError } = await supabase
      .from("leads")
      .select("ghl_contact_id")
      .eq("workspace_id", workspace_id)
      .not("ghl_contact_id", "is", null);

    if (existingError) {
      console.error(`[GHL Sync] Error loading existing leads:`, existingError.message);
    }

    const existingGhlIds = new Set<string>(
      (existingLeadsData || [])
        .map(l => l.ghl_contact_id)
        .filter((id): id is string => id !== null)
    );
    
    // DIAGNOSTIC LOGGING - Very detailed to identify the issue
    console.log(`[GHL Sync] ========== DIAGNOSTIC START ==========`);
    console.log(`[GHL Sync] existingLeadsData count: ${existingLeadsData?.length || 0}`);
    console.log(`[GHL Sync] existingGhlIds Set size: ${existingGhlIds.size}`);
    
    // Log sample IDs from database
    const sampleDbIds = Array.from(existingGhlIds).slice(0, 5);
    console.log(`[GHL Sync] Sample DB ghl_contact_ids: ${sampleDbIds.length > 0 ? sampleDbIds.join(', ') : '(empty)'}`);
    console.log(`[GHL Sync] ========== DIAGNOSTIC END ==========`);

    // If streaming is requested, use SSE
    if (stream) {
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          const result: SyncResult = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            total_processed: 0,
          };

          const startTime = Date.now();
          const maxExecutionTime = 50000;

          let startAfterId: string | undefined = undefined;
          let hasMore = true;
          let pageCount = 0;
          const maxPages = 100;
          let timedOut = false;
          let estimatedTotal = 0;

          try {
            // First, get an estimate of total contacts
            const countUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(locationId)}&limit=1`;
            const countResponse = await fetch(countUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Version: "2021-07-28",
                Accept: "application/json",
              },
            });
            
            if (countResponse.ok) {
              const countData = await countResponse.json();
              estimatedTotal = countData.meta?.total || 0;
              send("init", { estimatedTotal });
            }

            while (hasMore && pageCount < maxPages) {
              if (Date.now() - startTime > maxExecutionTime) {
                console.log(`[GHL Sync] Approaching timeout, stopping after ${pageCount} pages`);
                timedOut = true;
                break;
              }

              pageCount++;
              
              let ghlUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(locationId)}&limit=100`;
              
              if (startAfterId) {
                ghlUrl += `&startAfterId=${encodeURIComponent(startAfterId)}`;
              }

              console.log(`[GHL Sync] Fetching page ${pageCount}`);

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
                
                if (ghlResponse.status === 401) {
                  result.errors.push("API Key inválida ou expirada.");
                } else if (ghlResponse.status === 403) {
                  result.errors.push("Acesso negado. Verifique o Location ID.");
                } else {
                  result.errors.push(`Erro GHL: ${ghlResponse.status}`);
                }
                break;
              }

              const data: GHLContactsResponse = await ghlResponse.json();
              const contacts = data.contacts || [];

              if (contacts.length === 0) {
                hasMore = false;
                break;
              }

              // Prepare batch inserts - using local Set for deduplication (100% reliable)
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
                ai_next_action_type: null;
                ai_temperature: string;
              }> = [];

              // DEBUG: Log first page contact IDs for comparison
              if (pageCount === 1) {
                console.log(`[GHL Sync] ===== FIRST PAGE DEBUG =====`);
                console.log(`[GHL Sync] First 3 GHL contact IDs from API:`);
                for (let i = 0; i < Math.min(3, contacts.length); i++) {
                  const c = contacts[i];
                  const existsInSet = existingGhlIds.has(c.id);
                  console.log(`[GHL Sync]   ${i+1}. ID="${c.id}" | Type=${typeof c.id} | ExistsInSet=${existsInSet}`);
                }
                console.log(`[GHL Sync] ===== END FIRST PAGE DEBUG =====`);
              }

              for (const contact of contacts) {
                result.total_processed++;

                // Local deduplication check - simple and reliable
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
                  // Explicitly set to avoid check constraint violations
                  ai_next_action_type: null,
                  ai_temperature: 'cold',
                });

                // Add to Set to prevent duplicates in future pages
                existingGhlIds.add(contact.id);
              }

              console.log(`[GHL Sync] Page ${pageCount}: ${contacts.length} contacts, ${leadsToInsert.length} to insert, ${result.skipped} skipped total`);

              // Batch insert new leads
              if (leadsToInsert.length > 0) {
                console.log(`[GHL Sync] Page ${pageCount}: Inserting ${leadsToInsert.length} new leads`);
                
                const { error: insertError, data: insertedData } = await supabase
                  .from("leads")
                  .insert(leadsToInsert)
                  .select("id");

                if (insertError) {
                  // Handle unique constraint violation (already exists)
                  if (insertError.code === '23505') {
                    console.log(`[GHL Sync] Some contacts already exist, skipping duplicates`);
                    result.skipped += leadsToInsert.length;
                  } else {
                    console.error(`[GHL Sync] Batch insert error:`, insertError.message, insertError.code);
                    result.errors.push(`Batch error: ${insertError.message}`);
                  }
                } else {
                  const insertedCount = insertedData?.length || 0;
                  result.created += insertedCount;
                  console.log(`[GHL Sync] Successfully inserted ${insertedCount} leads`);
                }
              }

              // Send progress update
              send("progress", {
                page: pageCount,
                processed: result.total_processed,
                created: result.created,
                skipped: result.skipped,
                estimatedTotal,
              });

              // Check for more pages
              if (data.meta?.startAfterId) {
                startAfterId = data.meta.startAfterId;
              } else if (contacts.length < 100) {
                hasMore = false;
              } else {
                startAfterId = contacts[contacts.length - 1].id;
              }

              await new Promise((resolve) => setTimeout(resolve, 50));
            }

            // Update last_sync_at
            await supabase
              .from("workspace_ghl_config")
              .update({ last_sync_at: new Date().toISOString() })
              .eq("workspace_id", workspace_id);

            // Log sync result with valid UUIDs
            const syncLogId = crypto.randomUUID();
            console.log(`[GHL Sync] Final result: created=${result.created}, skipped=${result.skipped}, errors=${result.errors.length}`);
            await supabase.from("ghl_sync_log").insert({
              workspace_id,
              ghl_entity_type: "contact_batch",
              ghl_entity_id: syncLogId,
              fastcrm_entity_type: "leads",
              fastcrm_entity_id: syncLogId,
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
              result.errors.push(`Sincronização parcial: ${result.total_processed} processados. Execute novamente.`);
            }

            // Send final result
            send("complete", result);
            
          } catch (err) {
            console.error("[GHL Sync] Stream error:", err);
            send("error", { error: err instanceof Error ? err.message : "Unknown error" });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming mode (original behavior)
    const result: SyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      total_processed: 0,
    };

    const startTime = Date.now();
    const maxExecutionTime = 50000;

    let startAfterId: string | undefined = undefined;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 100;
    let timedOut = false;

    while (hasMore && pageCount < maxPages) {
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`[GHL Sync] Approaching timeout, stopping after ${pageCount} pages`);
        timedOut = true;
        break;
      }

      pageCount++;
      
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

      // Prepare batch inserts - using local Set for deduplication
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
        ai_next_action_type: null;
        ai_temperature: string;
      }> = [];

      for (const contact of contacts) {
        result.total_processed++;

        // Local deduplication check - simple and reliable
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
          // Explicitly set to avoid check constraint violations
          ai_next_action_type: null,
          ai_temperature: 'cold',
        });

        // Add to Set to prevent duplicates in future pages
        existingGhlIds.add(contact.id);
      }

      console.log(`[GHL Sync] Page ${pageCount}: ${leadsToInsert.length} to insert, ${result.skipped} skipped total`);

      if (leadsToInsert.length > 0) {
        console.log(`[GHL Sync] Page ${pageCount}: Inserting ${leadsToInsert.length} new leads`);
        
        const { error: insertError, data: insertedData } = await supabase
          .from("leads")
          .insert(leadsToInsert)
          .select("id");

        if (insertError) {
          // Handle unique constraint violation (already exists)
          if (insertError.code === '23505') {
            console.log(`[GHL Sync] Some contacts already exist, skipping duplicates`);
            result.skipped += leadsToInsert.length;
          } else {
            console.error(`[GHL Sync] Batch insert error:`, insertError.message, insertError.code);
            result.errors.push(`Batch insert failed: ${insertError.message}`);
          }
        } else {
          const insertedCount = insertedData?.length || 0;
          result.created += insertedCount;
          console.log(`[GHL Sync] Successfully inserted ${insertedCount} leads`);
        }
      }

      if (data.meta?.startAfterId) {
        startAfterId = data.meta.startAfterId;
      } else if (contacts.length < 100) {
        hasMore = false;
      } else {
        startAfterId = contacts[contacts.length - 1].id;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    await supabase
      .from("workspace_ghl_config")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id);

    // Log sync result with valid UUIDs
    const syncLogId = crypto.randomUUID();
    console.log(`[GHL Sync] Final result: created=${result.created}, skipped=${result.skipped}, errors=${result.errors.length}`);
    await supabase.from("ghl_sync_log").insert({
      workspace_id,
      ghl_entity_type: "contact_batch",
      ghl_entity_id: syncLogId,
      fastcrm_entity_type: "leads",
      fastcrm_entity_id: syncLogId,
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

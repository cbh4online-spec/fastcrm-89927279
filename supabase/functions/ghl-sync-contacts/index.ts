// Version 4.0 - FORCE CACHE BUST 2026-01-29T14:45
import { createClient } from "@supabase/supabase-js";

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
  website?: string;
  companyName?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  socialMedia?: { linkedIn?: string; facebook?: string; instagram?: string; twitter?: string };
  customFields?: Array<{ id?: string; field_key?: string; key?: string; value?: string }>;
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

type ContactsCursor = {
  startAfter?: number;
  startAfterId?: string;
};

const CONTACTS_PAGE_LIMIT = 100;
const PAGE_REQUEST_DELAY_MS = 150;
const MAX_429_RETRIES = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric * 1000;
  }

  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

function parseCursorNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return Math.trunc(numeric);
    }

    const dateMs = Date.parse(value);
    if (!Number.isNaN(dateMs)) {
      return dateMs;
    }
  }

  return undefined;
}

function describeCursor(cursor?: ContactsCursor): string {
  if (!cursor) return "initial";
  const parts: string[] = [];
  if (cursor.startAfter !== undefined) parts.push(`startAfter=${cursor.startAfter}`);
  if (cursor.startAfterId) parts.push(`startAfterId=${cursor.startAfterId}`);
  if (cursor.searchAfter) parts.push(`searchAfter=${JSON.stringify(cursor.searchAfter)}`);
  return parts.length ? parts.join("&") : "initial";
}

function cursorKey(mode: PaginationMode, cursor?: ContactsCursor): string {
  return `${mode}:${describeCursor(cursor)}`;
}

function buildContactsUrl(locationId: string, cursor?: ContactsCursor): string {
  const params = new URLSearchParams({
    locationId,
    limit: String(CONTACTS_PAGE_LIMIT),
  });

  // GHL requires BOTH cursor parts to advance the page. Sending only one of
  // them makes the API return the same page over and over.
  if (cursor?.startAfter !== undefined) {
    params.set("startAfter", String(cursor.startAfter));
  }
  if (cursor?.startAfterId) {
    params.set("startAfterId", cursor.startAfterId);
  }

  return `https://services.leadconnectorhq.com/contacts/?${params.toString()}`;
}

function resolveNextCursor(
  data: GHLContactsResponse,
  contacts: GHLContact[],
  mode: PaginationMode,
): ContactsCursor | null {
  if (contacts.length === 0) return null;

  const lastContact = contacts[contacts.length - 1];

  if (mode === "search") {
    const searchAfter = Array.isArray(lastContact?.searchAfter) ? lastContact.searchAfter : null;
    if (!searchAfter || searchAfter.length === 0) return null;
    return { searchAfter };
  }

  const metaStartAfter = parseCursorNumber(data.meta?.startAfter);
  const metaStartAfterId = typeof data.meta?.startAfterId === "string"
    ? data.meta.startAfterId.trim()
    : "";

  const fallbackStartAfter = parseCursorNumber(lastContact?.dateAdded);
  const fallbackStartAfterId = typeof lastContact?.id === "string" ? lastContact.id.trim() : "";

  const startAfter = metaStartAfter ?? fallbackStartAfter;
  const startAfterId = metaStartAfterId || fallbackStartAfterId;

  if (contacts.length < CONTACTS_PAGE_LIMIT && metaStartAfter === undefined && !metaStartAfterId) {
    return null;
  }

  if (startAfter === undefined && !startAfterId) return null;

  const next: ContactsCursor = {};
  if (startAfter !== undefined) next.startAfter = startAfter;
  if (startAfterId) next.startAfterId = startAfterId;
  return next;
}


function mapContactsApiError(status: number, errorText: string): string {
  if (status === 401) {
    try {
      const errorData = JSON.parse(errorText);
      const errorMsg = errorData.message || "";
      if (errorMsg.includes("not authorized for this scope")) {
        return "A API Key não tem permissão. Gere uma nova API Key no GHL com os scopes 'contacts.readonly' e 'contacts.search'.";
      }
    } catch {
      // ignore parse error and fall through
    }

    return "API Key inválida ou expirada. Verifique a API Key do GHL.";
  }

  if (status === 403) {
    return "Acesso negado. Verifique se o Location ID do GHL está correcto.";
  }

  if (status === 429) {
    return "A API do GHL atingiu o limite de pedidos (429). A sincronização foi abrandada e interrompida para evitar loop; tente novamente dentro de instantes.";
  }

  return `Erro da API GHL: ${status}${errorText ? ` - ${errorText.slice(0, 180)}` : ""}`;
}

async function fetchContactsPage(
  apiKey: string,
  locationId: string,
  cursor?: ContactsCursor,
): Promise<
  | { ok: true; data: GHLContactsResponse; url: string }
  | { ok: false; status: number; errorText: string; url: string; attempts: number }
> {
  let attempt = 0;

  while (attempt < MAX_429_RETRIES) {
    attempt += 1;
    const url = buildContactsUrl(locationId, cursor);

    console.log(`[GHL Sync] Fetching contacts page: ${url} (attempt ${attempt}/${MAX_429_RETRIES})`);

    const ghlResponse = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });

    const responseText = await ghlResponse.text();

    if (ghlResponse.ok) {
      try {
        return {
          ok: true,
          data: JSON.parse(responseText) as GHLContactsResponse,
          url,
        };
      } catch (error) {
        console.error("[GHL Sync] Invalid JSON from contacts API", error, responseText.slice(0, 300));
        return {
          ok: false,
          status: 502,
          errorText: `Resposta inválida do GHL: ${responseText.slice(0, 300)}`,
          url,
          attempts: attempt,
        };
      }
    }

    console.error(`[GHL Sync] Contacts API error: status=${ghlResponse.status} attempt=${attempt} body=${responseText.slice(0, 500)}`);

    if (ghlResponse.status === 429 && attempt < MAX_429_RETRIES) {
      const retryAfterMs = parseRetryAfterMs(ghlResponse.headers.get("Retry-After"))
        ?? Math.min(8000, 1000 * 2 ** (attempt - 1));
      const jitterMs = Math.floor(Math.random() * 300);
      const waitMs = retryAfterMs + jitterMs;

      console.warn(`[GHL Sync] Rate limit do GHL detectado. Nova tentativa em ${waitMs}ms (${describeCursor(cursor)})`);
      await sleep(waitMs);
      continue;
    }

    return {
      ok: false,
      status: ghlResponse.status,
      errorText: responseText,
      url,
      attempts: attempt,
    };
  }

  return {
    ok: false,
    status: 429,
    errorText: "Rate limit persistente após várias tentativas.",
    url: buildContactsUrl(locationId, cursor),
    attempts: MAX_429_RETRIES,
  };
}

Deno.serve(async (req) => {
  // VERSION MARKER - confirms deployment success
  console.log(`[GHL Sync v4.0 2026-01-29] Function started at ${new Date().toISOString()}`);
  
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

          let cursor: ContactsCursor | undefined = undefined;
          let hasMore = true;
          let pageCount = 0;
          const maxPages = 100;
          let timedOut = false;
          let estimatedTotal = 0;
          const seenPageSignatures = new Set<string>();
          const seenCursorKeys = new Set<string>();

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
              
              const pageResponse = await fetchContactsPage(apiKey, locationId, cursor);

              if (!pageResponse.ok) {
                result.errors.push(mapContactsApiError(pageResponse.status, pageResponse.errorText));
                break;
              }

              const data = pageResponse.data;
              const contacts = data.contacts || [];

              const pageSignature = getContactsPageSignature(contacts);
              if (seenPageSignatures.has(pageSignature)) {
                console.warn(`[GHL Sync] Duplicate page detected on page ${pageCount}: ${pageSignature}`);
                result.errors.push("A API do GHL devolveu páginas repetidas; a sincronização foi interrompida para evitar um ciclo infinito.");
                break;
              }
              seenPageSignatures.add(pageSignature);

              console.log(`[GHL Sync] Page ${pageCount}: ${contacts.length} contacts, cursor=${describeCursor(cursor)}, nextMeta=${JSON.stringify(data.meta || {})}`);

              if (contacts.length === 0) {
                hasMore = false;
                break;
              }

              // Prepare batch inserts - using local Set for deduplication (100% reliable)
              const leadsToInsert: Array<Record<string, unknown>> = [];

              // Helper: extract social URLs from GHL custom fields
function extractSocialFromCustomFields(socialMedia?: { linkedIn?: string; facebook?: string; instagram?: string; twitter?: string }, fields?: Array<{ id?: string; field_key?: string; key?: string; value?: string }>): { instagram_url?: string; linkedin_url?: string; facebook_url?: string; twitter_url?: string } {
                const result: Record<string, string> = {};
                // Priority 1: native GHL socialMedia fields
                if (socialMedia?.linkedIn) result.linkedin_url = socialMedia.linkedIn;
                if (socialMedia?.facebook) result.facebook_url = socialMedia.facebook;
                if (socialMedia?.instagram) result.instagram_url = socialMedia.instagram;
                if (socialMedia?.twitter) result.twitter_url = socialMedia.twitter;
                // Priority 2: custom fields (only fill if not already set)
                if (fields) {
                  for (const f of fields) {
                    const key = (f.field_key || f.key || f.id || "").toLowerCase();
                    const val = f.value;
                    if (!val) continue;
                    if (!result.instagram_url && key.includes("instagram")) result.instagram_url = val.startsWith("http") ? val : `https://instagram.com/${val}`;
                    if (!result.linkedin_url && key.includes("linkedin")) result.linkedin_url = val.startsWith("http") ? val : `https://linkedin.com/in/${val}`;
                    if (!result.facebook_url && key.includes("facebook")) result.facebook_url = val.startsWith("http") ? val : `https://facebook.com/${val}`;
                    if (!result.twitter_url && key.includes("twitter")) result.twitter_url = val.startsWith("http") ? val : `https://x.com/${val}`;
                  }
                }
                return result;
              }

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

                // Build full address from GHL fields
                const addressParts = [contact.address1, contact.city, contact.state, contact.postalCode, contact.country].filter(Boolean);
                const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : null;

                // Extract social URLs from custom fields
                const socialUrls = extractSocialFromCustomFields(contact.socialMedia, contact.customFields);

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
                  ai_next_action_type: null,
                  ai_temperature: 'cold',
                  // Additional GHL fields
                  website: contact.website || null,
                  company_name: contact.companyName || null,
                  address: fullAddress,
                  city: contact.city || null,
                  postal_code: contact.postalCode || null,
                  instagram_url: socialUrls.instagram_url || null,
                  linkedin_url: socialUrls.linkedin_url || null,
                  facebook_url: socialUrls.facebook_url || null,
                  twitter_url: socialUrls.twitter_url || null,
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
              const nextCursor = resolveNextCursor(data, contacts);
              if (!nextCursor) {
                hasMore = false;
              } else {
                const cursorKey = JSON.stringify(nextCursor);
                if (seenCursorKeys.has(cursorKey)) {
                  console.warn(`[GHL Sync] Duplicate cursor detected on page ${pageCount}: ${cursorKey}`);
                  result.errors.push("A API do GHL devolveu o mesmo cursor de paginação; a sincronização foi interrompida para evitar pedidos em loop.");
                  break;
                }
                seenCursorKeys.add(cursorKey);
                cursor = nextCursor;
              }

              await sleep(PAGE_REQUEST_DELAY_MS);
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

    let cursor: ContactsCursor | undefined = undefined;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 100;
    let timedOut = false;
    const seenPageSignatures = new Set<string>();
    const seenCursorKeys = new Set<string>();

    while (hasMore && pageCount < maxPages) {
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`[GHL Sync] Approaching timeout, stopping after ${pageCount} pages`);
        timedOut = true;
        break;
      }

      pageCount++;
      
      const pageResponse = await fetchContactsPage(apiKey, locationId, cursor);

      if (!pageResponse.ok) {
        result.errors.push(mapContactsApiError(pageResponse.status, pageResponse.errorText));
        break;
      }

      const data = pageResponse.data;
      const contacts = data.contacts || [];

      const pageSignature = getContactsPageSignature(contacts);
      if (seenPageSignatures.has(pageSignature)) {
        console.warn(`[GHL Sync] Duplicate page detected on page ${pageCount}: ${pageSignature}`);
        result.errors.push("A API do GHL devolveu páginas repetidas; a sincronização foi interrompida para evitar um ciclo infinito.");
        break;
      }
      seenPageSignatures.add(pageSignature);

      console.log(`[GHL Sync] Page ${pageCount}: ${contacts.length} contacts, cursor=${describeCursor(cursor)}, nextMeta=${JSON.stringify(data.meta || {})}`);

      if (contacts.length === 0) {
        hasMore = false;
        break;
      }

      // Prepare batch inserts - using local Set for deduplication
      const leadsToInsert: Array<Record<string, unknown>> = [];

      // Helper: extract social URLs from GHL custom fields
      function extractSocialFromCustomFieldsNS(socialMedia?: { linkedIn?: string; facebook?: string; instagram?: string; twitter?: string }, fields?: Array<{ id?: string; field_key?: string; key?: string; value?: string }>): { instagram_url?: string; linkedin_url?: string; facebook_url?: string; twitter_url?: string } {
        const result: Record<string, string> = {};
        if (socialMedia?.linkedIn) result.linkedin_url = socialMedia.linkedIn;
        if (socialMedia?.facebook) result.facebook_url = socialMedia.facebook;
        if (socialMedia?.instagram) result.instagram_url = socialMedia.instagram;
        if (socialMedia?.twitter) result.twitter_url = socialMedia.twitter;
        if (fields) {
          for (const f of fields) {
            const key = (f.field_key || f.key || f.id || "").toLowerCase();
            const val = f.value;
            if (!val) continue;
            if (!result.instagram_url && key.includes("instagram")) result.instagram_url = val.startsWith("http") ? val : `https://instagram.com/${val}`;
            if (!result.linkedin_url && key.includes("linkedin")) result.linkedin_url = val.startsWith("http") ? val : `https://linkedin.com/in/${val}`;
            if (!result.facebook_url && key.includes("facebook")) result.facebook_url = val.startsWith("http") ? val : `https://facebook.com/${val}`;
            if (!result.twitter_url && key.includes("twitter")) result.twitter_url = val.startsWith("http") ? val : `https://x.com/${val}`;
          }
        }
        return result;
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

        const addressParts = [contact.address1, contact.city, contact.state, contact.postalCode, contact.country].filter(Boolean);
        const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : null;
        const socialUrls = extractSocialFromCustomFieldsNS(contact.socialMedia, contact.customFields);

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
          ai_next_action_type: null,
          ai_temperature: 'cold',
          website: contact.website || null,
          company_name: contact.companyName || null,
          address: fullAddress,
          city: contact.city || null,
          postal_code: contact.postalCode || null,
          instagram_url: socialUrls.instagram_url || null,
          linkedin_url: socialUrls.linkedin_url || null,
          facebook_url: socialUrls.facebook_url || null,
          twitter_url: socialUrls.twitter_url || null,
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

      const nextCursor = resolveNextCursor(data, contacts);
      if (!nextCursor) {
        hasMore = false;
      } else {
        const cursorKey = JSON.stringify(nextCursor);
        if (seenCursorKeys.has(cursorKey)) {
          console.warn(`[GHL Sync] Duplicate cursor detected on page ${pageCount}: ${cursorKey}`);
          result.errors.push("A API do GHL devolveu o mesmo cursor de paginação; a sincronização foi interrompida para evitar pedidos em loop.");
          break;
        }
        seenCursorKeys.add(cursorKey);
        cursor = nextCursor;
      }

      await sleep(PAGE_REQUEST_DELAY_MS);
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

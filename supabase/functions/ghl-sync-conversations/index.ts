// Version 1.2 - GHL Conversation Sync (fixed message parsing + auto-lead creation + autopilot trigger)
import { createClient } from "@supabase/supabase-js";
import {
  toSocialType,
  matchAccountId,
  extractAccountIdsFromConversation,
  fetchGHLConversationDetail,
  logRoutingDecision,
} from "../_shared/ghlRouting.ts";

// Helper: Trigger autopilot for synced inbound messages
async function triggerAutopilotForSyncedMessage(
  supabaseUrl: string,
  supabaseServiceKey: string,
  params: {
    workspaceId: string;
    conversationId: string;
    channel: string;
    leadId: string;
    ghlContactId: string;
    locationId: string;
  }
): Promise<void> {
  try {
    console.log("[GHL Sync] Triggering autopilot for synced message", { conversationId: params.conversationId });
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ghl-webhook-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "autopilot_trigger",
        workspace_id: params.workspaceId,
        conversation_id: params.conversationId,
        channel: params.channel,
        lead_id: params.leadId,
        ghl_contact_id: params.ghlContactId,
        location_id: params.locationId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[GHL Sync] Autopilot trigger failed:", response.status, errText);
    } else {
      console.log("[GHL Sync] Autopilot triggered successfully for conv", params.conversationId);
    }
  } catch (err) {
    console.error("[GHL Sync] Error triggering autopilot:", err);
  }
}

// Helper: Fetch contact details from GHL API
interface GHLContactData {
  name: string;
  email: string | null;
  phone: string | null;
  ghl_contact_id: string;
  website?: string;
  company_name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  instagram_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
  twitter_url?: string;
}

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

// Motivo da última falha ao obter um contacto (para mensagens de erro úteis)
let lastContactFetchReason: string | null = null;

async function fetchGHLContact(apiKey: string, contactId: string): Promise<GHLContactData | null> {
  const MAX_ATTEMPTS = 2;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-04-15",
          Accept: "application/json",
        },
      });
    } catch (netErr) {
      lastContactFetchReason = `erro de rede (${netErr instanceof Error ? netErr.message : "desconhecido"})`;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      console.error(`[GHL Sync] Network error fetching contact ${contactId}`, netErr);
      return null;
    }

    // Retry apenas em falhas transitórias
    if (!response.ok && (response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) {
      console.warn(`[GHL Sync] Transient ${response.status} fetching contact ${contactId}, retrying...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
      continue;
    }
    break;
  }

  try {
    if (!response || !response.ok) {
      const status = response?.status ?? 0;
      lastContactFetchReason =
        status === 404 ? "contacto não existe no GHL (404)"
        : status === 401 ? "API Key inválida (401)"
        : status === 403 ? "sem permissões para ler contactos (403)"
        : status === 429 ? "limite de pedidos do GHL (429)"
        : `GHL respondeu ${status}`;
      console.error(`[GHL Sync] Failed to fetch contact ${contactId}: ${status}`);
      return null;
    }
    lastContactFetchReason = null;


    const data = await response.json();
    const contact = data.contact || data;

    const firstName = contact.firstName || contact.first_name || "";
    const lastName = contact.lastName || contact.last_name || "";
    const name = `${firstName} ${lastName}`.trim() || contact.name || `GHL Contact ${contactId.substring(0, 8)}`;

    const addressParts = [contact.address1, contact.city, contact.state, contact.postalCode, contact.country].filter(Boolean);
    const socialUrls = extractSocialFromCustomFields(contact.socialMedia, contact.customFields);

    return {
      name,
      email: contact.email || null,
      phone: contact.phone || null,
      ghl_contact_id: contactId,
      website: contact.website || undefined,
      company_name: contact.companyName || undefined,
      address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
      city: contact.city || undefined,
      postal_code: contact.postalCode || undefined,
      instagram_url: socialUrls.instagram_url,
      linkedin_url: socialUrls.linkedin_url,
      facebook_url: socialUrls.facebook_url,
      twitter_url: socialUrls.twitter_url,
    };
  } catch (err) {
    console.error(`[GHL Sync] Error fetching contact ${contactId}:`, err);
    return null;
  }
}

// Helper: Create a lead from GHL contact data (upsert by ghl_contact_id)
async function createLeadFromGHLContact(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string,
  contactData: GHLContactData
): Promise<{id: string} | null> {
  try {
    const insertData: Record<string, unknown> = {
      workspace_id,
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone,
      ghl_contact_id: contactData.ghl_contact_id,
      source: "ghl_auto_sync",
    };
    if (contactData.website) insertData.website = contactData.website;
    if (contactData.company_name) insertData.company_name = contactData.company_name;
    if (contactData.address) insertData.address = contactData.address;
    if (contactData.city) insertData.city = contactData.city;
    if (contactData.postal_code) insertData.postal_code = contactData.postal_code;
    if (contactData.instagram_url) insertData.instagram_url = contactData.instagram_url;
    if (contactData.linkedin_url) insertData.linkedin_url = contactData.linkedin_url;
    if (contactData.facebook_url) insertData.facebook_url = contactData.facebook_url;
    if (contactData.twitter_url) insertData.twitter_url = contactData.twitter_url;

    // First try to find existing lead by ghl_contact_id (handles pagination miss)
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("ghl_contact_id", contactData.ghl_contact_id)
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      console.log(`[GHL Sync] Found existing lead ${existingLead.id} for GHL contact ${contactData.ghl_contact_id} (duplicate avoided)`);
      return existingLead;
    }

    const { data: newLead, error } = await supabase
      .from("leads")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      // Handle unique constraint violation gracefully
      if (error.code === '23505') {
        console.log(`[GHL Sync] Lead already exists for contact ${contactData.ghl_contact_id} (race condition), fetching...`);
        const { data: raceLead } = await supabase
          .from("leads")
          .select("id")
          .eq("workspace_id", workspace_id)
          .eq("ghl_contact_id", contactData.ghl_contact_id)
          .limit(1)
          .maybeSingle();
        return raceLead || null;
      }
      console.error(`[GHL Sync] Error creating lead for contact ${contactData.ghl_contact_id}:`, error.message, error.code);
      return null;
    }

    console.log(`[GHL Sync] Auto-created lead ${newLead.id} for GHL contact ${contactData.ghl_contact_id} (${contactData.name})`);
    return newLead;
  } catch (err) {
    console.error(`[GHL Sync] Exception creating lead:`, err);
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GHLConversation {
  id: string;
  contactId: string;
  locationId: string;
  type?: number | string;
  unreadCount?: number;
  dateAdded?: string;
  dateUpdated?: string;
  lastMessageType?: string | number;
  lastMessageBody?: string;
  lastMessageDirection?: string;
  lastMessageDate?: string;
}

interface GHLMessage {
  id: string;
  conversationId: string;
  contactId: string;
  body: string;
  type?: number | string;
  direction?: string;
  status?: string;
  dateAdded?: string;
  attachments?: Array<{
    url?: string;
    type?: string;
    name?: string;
  }>;
}

interface SyncResult {
  conversations_created: number;
  conversations_updated: number;
  messages_created: number;
  messages_skipped: number;
  errors: string[];
  /** Conversas ignoradas (não fatais) com o motivo real */
  skipped_details: string[];
  total_processed: number;
  /** true quando a passagem foi interrompida e há mais para sincronizar */
  partial: boolean;
  /** cursor a partir do qual esta execução retomou (se aplicável) */
  resumed_from?: string | null;
}


// GHL message type numeric codes
const GHL_TYPE_CODES: Record<number, string> = {
  1: "sms",
  2: "email",
  3: "sms",
  4: "email",
  5: "messenger",
  6: "messenger",
  7: "live_chat",
  8: "web_widget",
  9: "whatsapp",
  10: "sms",
  11: "messenger",
  12: "other",
  13: "other",
  14: "sms",
  15: "whatsapp",
  16: "whatsapp",
  17: "instagram",
  18: "instagram",
  19: "messenger",
  20: "sms",
};

function resolveChannelSingle(typeCode?: number | string): string | null {
  const numCode = typeof typeCode === "number" ? typeCode : 
                  typeof typeCode === "string" && !isNaN(Number(typeCode)) ? Number(typeCode) : null;
  
  if (numCode !== null && GHL_TYPE_CODES[numCode]) {
    return GHL_TYPE_CODES[numCode];
  }

  if (typeof typeCode === "string") {
    const typeStringMap: Record<string, string> = {
      "TYPE_SMS": "sms",
      "TYPE_EMAIL": "email",
      "TYPE_WHATSAPP": "whatsapp",
      "TYPE_FB_MESSENGER": "messenger",
      "TYPE_INSTAGRAM": "instagram",
      "TYPE_INSTAGRAM_DM": "instagram",
      "TYPE_LIVE_CHAT": "live_chat",
      "TYPE_PHONE": "sms",
      "TYPE_CALL": "sms",
      "TYPE_CUSTOM_SMS": "sms",
      "TYPE_CUSTOM_EMAIL": "email",
      "TYPE_FACEBOOK_MESSENGER": "messenger",
    };
    const mapped = typeStringMap[typeCode.toUpperCase()] || typeStringMap[typeCode];
    if (mapped) return mapped;

    const channelMap: Record<string, string> = {
      "sms": "sms", "email": "email", "whatsapp": "whatsapp",
      "facebook": "messenger", "fb": "messenger", "messenger": "messenger",
      "instagram": "instagram", "ig": "instagram",
      "live_chat": "live_chat", "webchat": "web_widget",
    };
    if (channelMap[typeCode.toLowerCase()]) return channelMap[typeCode.toLowerCase()];
  }
  return null;
}

const SOCIAL_CHANNELS = new Set(["instagram", "whatsapp", "messenger", "facebook"]);

function resolveChannel(typeCode?: number | string, lastMessageType?: string | number): string {
  const primaryChannel = resolveChannelSingle(typeCode);
  const lastMsgChannel = resolveChannelSingle(lastMessageType);

  // If lastMessageType resolves to a social channel, ALWAYS prefer it over a generic primary
  // This fixes TYPE_PHONE conversations that are actually Instagram/WhatsApp DMs
  if (lastMsgChannel && SOCIAL_CHANNELS.has(lastMsgChannel)) {
    if (!primaryChannel || !SOCIAL_CHANNELS.has(primaryChannel)) {
      console.log(`[GHL Sync] Channel override: "${primaryChannel || 'unknown'}" → "${lastMsgChannel}" (from lastMessageType)`);
      return lastMsgChannel;
    }
  }

  return primaryChannel || lastMsgChannel || "other";
}

/**
 * Convert GHL timestamp (can be Unix ms, Unix s, or ISO string) to ISO string
 */
function normalizeTimestamp(value?: string | number): string | null {
  if (!value) return null;
  
  // If it's already a string that looks like ISO, return it
  if (typeof value === "string") {
    // Check if it's a valid ISO date
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
    // Try to parse as number string
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      value = numValue;
    } else {
      return null;
    }
  }
  
  // Handle numeric timestamps
  if (typeof value === "number") {
    // If value is > 1e12, it's in milliseconds, otherwise seconds
    if (value > 1e12) {
      return new Date(value).toISOString();
    } else if (value > 1e9) {
      return new Date(value * 1000).toISOString();
    }
  }
  
  return null;
}

function normalizeDirection(direction?: string): "inbound" | "outbound" {
  if (!direction) return "inbound";
  const lower = direction.toLowerCase();
  if (["outbound", "outgoing", "sent", "out"].includes(lower)) {
    return "outbound";
  }
  return "inbound";
}

Deno.serve(async (req) => {
  console.log(`[GHL Sync Conversations v1.0] Function started at ${new Date().toISOString()}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { workspace_id, stream, include_messages = true, days_back = 30 } = body;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get GHL config
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

    console.log(`[GHL Sync Conversations] Starting sync for workspace ${workspace_id}`);

    // --- Load allowed social channels for THIS workspace (incl. account ids) ---
    const { data: socialChannelConfig } = await supabase
      .from("workspace_ghl_social_channels")
      .select("channel_type, is_active, ghl_account_id")
      .eq("workspace_id", workspace_id);

    // Account ids actively claimed by THIS workspace, indexed by social type
    const ownAccountIdsByType = new Map<string, string[]>();
    for (const c of (socialChannelConfig || []) as Array<{ channel_type: string; is_active: boolean; ghl_account_id: string }>) {
      if (!c.is_active || !c.ghl_account_id) continue;
      const arr = ownAccountIdsByType.get(c.channel_type) || [];
      arr.push(c.ghl_account_id);
      ownAccountIdsByType.set(c.channel_type, arr);
    }
    
    const hasSocialChannelConfig = (socialChannelConfig?.length || 0) > 0;

    // --- Load social channels claimed by OTHER workspaces sharing the same locationId ---
    // This prevents pulling conversations that belong to a sibling workspace
    const { data: siblingConfigs } = await supabase
      .from("workspace_ghl_config")
      .select("workspace_id")
      .eq("ghl_location_id", locationId)
      .eq("is_active", true)
      .neq("workspace_id", workspace_id);

    const siblingWorkspaceIds = (siblingConfigs || []).map((c: { workspace_id: string }) => c.workspace_id);
    
    // Channels exclusively claimed by sibling workspaces
    const siblingClaimedChannels = new Set<string>();
    if (siblingWorkspaceIds.length > 0) {
      const { data: siblingChannels } = await supabase
        .from("workspace_ghl_social_channels")
        .select("workspace_id, channel_type, is_active")
        .in("workspace_id", siblingWorkspaceIds);

      for (const sc of siblingChannels || []) {
        if (sc.is_active) {
          siblingClaimedChannels.add(sc.channel_type);
        }
      }
      console.log(`[GHL Sync] Sibling workspaces: ${siblingWorkspaceIds.length}, claimed channels: ${[...siblingClaimedChannels].join(", ")}`);
    }

    const socialMap: Record<string, string> = {
      instagram: "instagram",
      messenger: "facebook",
      facebook: "facebook",
      whatsapp: "whatsapp",
    };

    function isSyncChannelAllowed(channel: string): boolean {
      const socialType = socialMap[channel.toLowerCase()];
      if (!socialType) return true; // Non-social channels (email, sms) always allowed

      // If THIS workspace has the channel active → allowed
      const thisWsHasChannel = socialChannelConfig?.some(
        (c: { channel_type: string; is_active: boolean }) =>
          c.channel_type === socialType && c.is_active
      );
      if (thisWsHasChannel) return true;

      // If a SIBLING workspace claims this channel AND this workspace does NOT → block
      if (siblingClaimedChannels.has(socialType)) {
        console.log(`[GHL Sync] Channel "${channel}" (${socialType}) claimed by sibling workspace, blocking for ${workspace_id}`);
        return false;
      }

      // No config at all → allow (backwards compat for single-workspace setups)
      if (!hasSocialChannelConfig && siblingClaimedChannels.size === 0) return true;

      // This workspace has social config but doesn't include this channel → block
      if (hasSocialChannelConfig) return false;

      return true;
    }
    console.log(`[GHL Sync] Social channel config loaded: ${socialChannelConfig?.length || 0} entries, siblings: ${siblingWorkspaceIds.length}`);

    // Load existing leads mapped by GHL contact ID (with pagination)
    const leadsByGhlId = new Map<string, string>();
    let leadsOffset = 0;
    const LEADS_PAGE_SIZE = 1000;
    while (true) {
      const { data: leadsBatch } = await supabase
        .from("leads")
        .select("id, ghl_contact_id")
        .eq("workspace_id", workspace_id)
        .not("ghl_contact_id", "is", null)
        .range(leadsOffset, leadsOffset + LEADS_PAGE_SIZE - 1);
      if (!leadsBatch || leadsBatch.length === 0) break;
      for (const lead of leadsBatch) {
        if (lead.ghl_contact_id) {
          leadsByGhlId.set(lead.ghl_contact_id, lead.id);
        }
      }
      if (leadsBatch.length < LEADS_PAGE_SIZE) break;
      leadsOffset += LEADS_PAGE_SIZE;
    }
    console.log(`[GHL Sync] Loaded ${leadsByGhlId.size} existing lead mappings (paginated)`);

    // Load existing conversations for THIS workspace
    const { data: existingConversations } = await supabase
      .from("conversations")
      .select("id, external_thread_id")
      .eq("workspace_id", workspace_id)
      .not("external_thread_id", "is", null);

    const conversationsByThreadId = new Map<string, string>();
    for (const conv of existingConversations || []) {
      if (conv.external_thread_id) {
        conversationsByThreadId.set(conv.external_thread_id, conv.id);
        if (conv.external_thread_id.startsWith("ghl_")) {
          conversationsByThreadId.set(conv.external_thread_id.replace("ghl_", ""), conv.id);
        }
      }
    }

    // Load conversations from SIBLING workspaces to prevent cross-workspace duplication
    // When multiple workspaces share a GHL location, a conversation synced to one must not be recreated in another
    const siblingThreadIds = new Set<string>();
    if (siblingWorkspaceIds.length > 0) {
      for (const sibWsId of siblingWorkspaceIds) {
        let sibOffset = 0;
        while (true) {
          const { data: sibConvs } = await supabase
            .from("conversations")
            .select("external_thread_id")
            .eq("workspace_id", sibWsId)
            .not("external_thread_id", "is", null)
            .range(sibOffset, sibOffset + 999);
          if (!sibConvs || sibConvs.length === 0) break;
          for (const sc of sibConvs) {
            if (sc.external_thread_id) siblingThreadIds.add(sc.external_thread_id);
          }
          if (sibConvs.length < 1000) break;
          sibOffset += 1000;
        }
      }
      console.log(`[GHL Sync] Loaded ${siblingThreadIds.size} conversation IDs from sibling workspaces (will skip these)`);
    }

    // Load existing message GHL IDs with pagination to avoid 1000-row limit
    const existingMessageIds = new Set<string>();
    let offset = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data } = await supabase
        .from("messages")
        .select("ghl_message_id")
        .eq("workspace_id", workspace_id)
        .not("ghl_message_id", "is", null)
        .range(offset, offset + PAGE_SIZE - 1);
      if (!data || data.length === 0) break;
      data.forEach(m => { if (m.ghl_message_id) existingMessageIds.add(m.ghl_message_id); });
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    console.log(`[GHL Sync] Loaded ${existingMessageIds.size} existing message IDs (paginated)`);

    if (stream) {
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          const result: SyncResult = {
            conversations_created: 0,
            conversations_updated: 0,
            messages_created: 0,
            messages_skipped: 0,
            errors: [],
            skipped_details: [],
            total_processed: 0,
            partial: false,
            resumed_from: null,
          };

          const startTime = Date.now();
          const maxExecutionTime = 45000;
          const PAGE_SIZE = 20;
          const FETCH_CONCURRENCY = 4;
          const CURSOR_SYNC_TYPE = "conversations";

          const saveCursor = async (value: string | undefined, partialRun: boolean) => {
            try {
              if (!value) return;
              await supabase.from("ghl_sync_cursors").upsert({
                workspace_id,
                sync_type: CURSOR_SYNC_TYPE,
                cursor: { last_sort_date: value, days_back },
                partial_runs: partialRun ? 1 : 0,
                updated_at: new Date().toISOString(),
              }, { onConflict: "workspace_id,sync_type" });
            } catch (e) {
              console.error("[GHL Sync] Failed to save cursor:", e);
            }
          };

          const clearCursor = async () => {
            try {
              await supabase
                .from("ghl_sync_cursors")
                .delete()
                .eq("workspace_id", workspace_id)
                .eq("sync_type", CURSOR_SYNC_TYPE);
            } catch (e) {
              console.error("[GHL Sync] Failed to clear cursor:", e);
            }
          };

          try {
            // Fetch conversations from GHL
            let hasMore = true;
            let pageCount = 0;
            const maxPages = 50;

            // Calculate date filter
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - days_back);

            let lastSortDate: string | undefined;

            // Retomar de onde a execução anterior parou (se o janela days_back for a mesma)
            try {
              const { data: savedCursor } = await supabase
                .from("ghl_sync_cursors")
                .select("cursor")
                .eq("workspace_id", workspace_id)
                .eq("sync_type", CURSOR_SYNC_TYPE)
                .maybeSingle();

              const c = savedCursor?.cursor as { last_sort_date?: string; days_back?: number } | undefined;
              if (c?.last_sort_date && (c.days_back === undefined || c.days_back === days_back)) {
                lastSortDate = c.last_sort_date;
                result.resumed_from = c.last_sort_date;
                console.log(`[GHL Sync] Resuming conversations sync from ${lastSortDate}`);
              }
            } catch (e) {
              console.error("[GHL Sync] Failed to load cursor:", e);
            }

            while (hasMore && pageCount < maxPages) {
              if (Date.now() - startTime > maxExecutionTime) {
                // Não é um erro: apenas ainda há mais para processar. O frontend continua automaticamente.
                result.partial = true;
                console.log(`[GHL Sync] Time budget reached after ${pageCount} pages`);
                await saveCursor(lastSortDate, true);
                break;
              }


              pageCount++;
              
              // Use GET /conversations/search with query params (correct GHL API endpoint)
              const queryParams = new URLSearchParams({
                locationId,
                limit: String(PAGE_SIZE),
                status: "all",
              });
              if (lastSortDate) {
                queryParams.set("startAfterDate", lastSortDate);
              }
              
              const ghlUrl = `https://services.leadconnectorhq.com/conversations/search?${queryParams.toString()}`;
              
              console.log(`[GHL Sync Conversations] Fetching page ${pageCount}: ${ghlUrl}`);

              const ghlResponse = await fetch(ghlUrl, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  Version: "2021-04-15",
                  Accept: "application/json",
                },
              });

              if (!ghlResponse.ok) {
                const errorText = await ghlResponse.text();
                console.error(`[GHL Sync Conversations] API Error: ${ghlResponse.status} - ${errorText}`);

                if (ghlResponse.status === 401) {
                  result.errors.push("API Key do GoHighLevel inválida ou expirada.");
                } else if (ghlResponse.status === 403) {
                  result.errors.push("Acesso negado pelo GoHighLevel. Verifique as permissões da API.");
                } else if (ghlResponse.status === 429) {
                  result.partial = true;
                  result.errors.push("Limite de pedidos do GoHighLevel atingido (429). A sincronização continua mais tarde do último ponto.");
                  await saveCursor(lastSortDate, true);
                } else {
                  result.partial = true;
                  result.errors.push(`Erro do GoHighLevel (${ghlResponse.status}) ao obter conversas.`);
                  await saveCursor(lastSortDate, true);
                }
                break;
              }


              const data = await ghlResponse.json();
              const conversations: GHLConversation[] = data.conversations || [];
              
              console.log(`[GHL Sync] Page ${pageCount}: got ${conversations.length} conversations`);

              if (conversations.length === 0) {
                hasMore = false;
                break;
              }

              // Pré-carregar em paralelo (lotes pequenos) as mensagens de cada conversa.
              // É a chamada dominante por conversa; paralelizar reduz muito o tempo por página.
              const prefetchedMessages = new Map<string, unknown>();
              if (include_messages) {
                for (let i = 0; i < conversations.length; i += FETCH_CONCURRENCY) {
                  if (Date.now() - startTime > maxExecutionTime) break;
                  const batch = conversations.slice(i, i + FETCH_CONCURRENCY);
                  await Promise.all(batch.map(async (c) => {
                    try {
                      const r = await fetch(
                        `https://services.leadconnectorhq.com/conversations/${c.id}/messages`,
                        {
                          method: "GET",
                          headers: {
                            Authorization: `Bearer ${apiKey}`,
                            Version: "2021-04-15",
                            Accept: "application/json",
                          },
                        },
                      );
                      if (r.ok) prefetchedMessages.set(c.id, await r.json());
                    } catch (e) {
                      console.error(`[GHL Sync] Prefetch messages failed for conv ${c.id}`, e);
                    }
                  }));
                }
              }

              let processedInPage = 0;

              for (const ghlConv of conversations) {
                // Orçamento de tempo verificado por conversa (e não só por página):
                // grava o cursor da última conversa processada para retomar sem repetir.
                if (Date.now() - startTime > maxExecutionTime) {
                  result.partial = true;
                  const cursorValue = processedInPage > 0
                    ? (conversations[processedInPage - 1].lastMessageDate
                      || conversations[processedInPage - 1].dateUpdated
                      || conversations[processedInPage - 1].id)
                    : lastSortDate;
                  await saveCursor(cursorValue, true);
                  console.log(`[GHL Sync] Time budget reached mid-page after ${processedInPage} conversations`);
                  hasMore = true;
                  break;
                }

                processedInPage++;
                result.total_processed++;


                // Find or auto-create lead for this conversation
                let leadId = leadsByGhlId.get(ghlConv.contactId);
                let leadIsNew = false;
                if (!leadId) {
                  console.log(`[GHL Sync] No lead found for contact ${ghlConv.contactId}, auto-creating...`);
                  const contactData = await fetchGHLContact(apiKey, ghlConv.contactId);
                  if (contactData) {
                    const newLead = await createLeadFromGHLContact(supabase, workspace_id, contactData);
                    if (newLead) {
                      leadId = newLead.id;
                      leadsByGhlId.set(ghlConv.contactId, leadId);
                      leadIsNew = true;
                    }
                  }
                  if (!leadId) {
                    const reason = lastContactFetchReason || "não foi possível criar o lead no FastCRM";
                    console.log(`[GHL Sync] Could not create lead for contact ${ghlConv.contactId}: ${reason}`);
                    result.skipped_details.push(`Conversa ignorada — contacto ${ghlConv.contactId}: ${reason}`);
                    result.messages_skipped++;
                    continue;
                  }

                }

                // For existing leads, update missing social URLs from GHL contact data
                if (!leadIsNew && leadId) {
                  try {
                    const { data: existingLead } = await supabase
                      .from("leads")
                      .select("instagram_url, linkedin_url, facebook_url, twitter_url")
                      .eq("id", leadId)
                      .single();

                    if (existingLead && (!existingLead.instagram_url || !existingLead.linkedin_url || !existingLead.facebook_url || !existingLead.twitter_url)) {
                      const contactData = await fetchGHLContact(apiKey, ghlConv.contactId);
                      if (contactData) {
                        const socialUpdates: Record<string, string> = {};
                        if (!existingLead.instagram_url && contactData.instagram_url) socialUpdates.instagram_url = contactData.instagram_url;
                        if (!existingLead.linkedin_url && contactData.linkedin_url) socialUpdates.linkedin_url = contactData.linkedin_url;
                        if (!existingLead.facebook_url && contactData.facebook_url) socialUpdates.facebook_url = contactData.facebook_url;
                        if (!existingLead.twitter_url && contactData.twitter_url) socialUpdates.twitter_url = contactData.twitter_url;

                        if (Object.keys(socialUpdates).length > 0) {
                          await supabase.from("leads").update(socialUpdates).eq("id", leadId);
                          console.log(`[GHL Sync] Updated lead ${leadId} social URLs:`, Object.keys(socialUpdates).join(", "));
                        }
                      }
                    }
                  } catch (err) {
                    console.error(`[GHL Sync] Error updating social URLs for lead ${leadId}:`, err);
                  }
                }

                console.log(`[GHL Sync] Conv ${ghlConv.id} type=${ghlConv.type}, lastMessageType=${ghlConv.lastMessageType}`);
                let channel = resolveChannel(ghlConv.type, ghlConv.lastMessageType);

                // --- Channel governance: skip if channel not allowed ---
                if (!isSyncChannelAllowed(channel)) {
                  console.log(`[GHL Sync] Skipping conv ${ghlConv.id} - channel "${channel}" not active for workspace`);
                  result.messages_skipped++;
                  continue;
                }

                // --- ACCOUNT-ID ISOLATION (fail-closed): for social channels,
                //     verify the conversation actually belongs to a page/account
                //     claimed by THIS workspace. Prevents cross-workspace
                //     contamination when multiple workspaces share the same
                //     GHL location_id.
                const socialType = toSocialType(channel);
                const hasSiblings = siblingWorkspaceIds.length > 0;
                if (socialType && (hasSiblings || ownAccountIdsByType.has(socialType))) {
                  const ownIds = ownAccountIdsByType.get(socialType) || [];

                  if (ownIds.length === 0) {
                    // No account claimed by this workspace for this social type → skip
                    console.log(`[GHL Sync] Skipping conv ${ghlConv.id} - no ${socialType} account claimed by workspace ${workspace_id}`);
                    await logRoutingDecision(supabase, {
                      source: "sync_conversations",
                      source_workspace_id: workspace_id,
                      ghl_location_id: locationId,
                      ghl_conversation_id: ghlConv.id,
                      channel_type: socialType,
                      action: "skipped_wrong_workspace",
                      reason: "workspace_has_no_account_for_channel",
                    });
                    result.messages_skipped++;
                    continue;
                  }

                  // Fetch detail to extract the real account/page id
                  const detail = await fetchGHLConversationDetail(apiKey, ghlConv.id);
                  const candidateIds = extractAccountIdsFromConversation(detail);

                  if (candidateIds.length === 0) {
                    // FAIL-CLOSED: if siblings share the location, we cannot prove
                    // ownership without an account id → skip to avoid contamination.
                    if (hasSiblings) {
                      console.log(`[GHL Sync] Skipping conv ${ghlConv.id} - no account_id in detail and siblings exist (fail-closed)`);
                      await logRoutingDecision(supabase, {
                        source: "sync_conversations",
                        source_workspace_id: workspace_id,
                        ghl_location_id: locationId,
                        ghl_conversation_id: ghlConv.id,
                        channel_type: socialType,
                        action: "skipped_wrong_workspace",
                        reason: "no_account_id_with_siblings_fail_closed",
                      });
                      result.messages_skipped++;
                      continue;
                    }
                    console.log(`[GHL Sync] Conv ${ghlConv.id} - no account_id in detail, no siblings, allowing`);
                  } else {
                    const ownsIt = ownIds.some(stored =>
                      candidateIds.some(cand => matchAccountId(String(stored), String(cand)))
                    );
                    if (!ownsIt) {
                      console.log(`[GHL Sync] Skipping conv ${ghlConv.id} - account_id ${candidateIds.join(",")} not owned by workspace ${workspace_id} (owns: ${ownIds.join(",")})`);
                      await logRoutingDecision(supabase, {
                        source: "sync_conversations",
                        source_workspace_id: workspace_id,
                        ghl_location_id: locationId,
                        ghl_conversation_id: ghlConv.id,
                        ghl_account_id: candidateIds[0],
                        channel_type: socialType,
                        action: "skipped_wrong_workspace",
                        reason: "account_id_owned_by_other_workspace",
                      });
                      result.messages_skipped++;
                      continue;
                    }
                    // Log successful ownership match for audit trail
                    await logRoutingDecision(supabase, {
                      source: "sync_conversations",
                      source_workspace_id: workspace_id,
                      resolved_workspace_id: workspace_id,
                      ghl_location_id: locationId,
                      ghl_conversation_id: ghlConv.id,
                      ghl_account_id: candidateIds.find(c => ownIds.some(o => matchAccountId(String(o), String(c)))) || candidateIds[0],
                      channel_type: socialType,
                      action: "imported",
                      reason: "account_id_match",
                    });
                  }
                }


                const externalThreadId = `ghl_${ghlConv.id}`;

                // CRITICAL: Skip if this conversation already exists in a sibling workspace
                if (siblingThreadIds.has(externalThreadId)) {
                  console.log(`[GHL Sync] Skipping conv ${ghlConv.id} - already exists in sibling workspace`);
                  result.messages_skipped++;
                  continue;
                }

                // Check if conversation exists in THIS workspace
                let conversationId = conversationsByThreadId.get(externalThreadId);

                if (!conversationId) {
                  // Normalize the timestamp from GHL
                  const lastMessageAt = normalizeTimestamp(ghlConv.lastMessageDate) || 
                                        normalizeTimestamp(ghlConv.dateUpdated) || 
                                        new Date().toISOString();
                  
                  // Create new conversation
                  const { data: newConv, error: convError } = await supabase
                    .from("conversations")
                    .insert({
                      workspace_id,
                      lead_id: leadId,
                      channel,
                      status: "open",
                      unread_count: ghlConv.unreadCount || 0,
                      external_thread_id: externalThreadId,
                      last_message_at: lastMessageAt,
                      last_message_preview: ghlConv.lastMessageBody?.substring(0, 100),
                      channel_metadata: {
                        ghl_conversation_id: ghlConv.id,
                        ghl_contact_id: ghlConv.contactId,
                        source: "ghl_sync",
                      },
                    })
                    .select("id")
                    .single();

                  if (convError || !newConv) {
                    console.error(`[GHL Sync Conversations] Error creating conversation`, convError);
                    continue;
                  }

                  conversationId = newConv.id;
                  conversationsByThreadId.set(externalThreadId, conversationId);
                  result.conversations_created++;
                  console.log(`[GHL Sync Conversations] Created conversation ${conversationId}`);
                } else {
                  // Update existing conversation
                  const lastMessageAt = normalizeTimestamp(ghlConv.lastMessageDate) || 
                                        normalizeTimestamp(ghlConv.dateUpdated);
                  
                  // Re-classify channel if it was "other" and we now have better type info
                  const updateData: Record<string, unknown> = {
                    last_message_at: lastMessageAt,
                    last_message_preview: ghlConv.lastMessageBody?.substring(0, 100),
                    unread_count: ghlConv.unreadCount || 0,
                  };

                  // Check if the existing conversation has channel "other" and try to fix it
                  const { data: existingConv } = await supabase
                    .from("conversations")
                    .select("channel")
                    .eq("id", conversationId)
                    .single();
                  
                  if (
                    (existingConv?.channel === "other" || existingConv?.channel === "sms") &&
                    channel !== "other" && channel !== "sms" &&
                    channel !== existingConv?.channel
                  ) {
                    updateData.channel = channel;
                    console.log(`[GHL Sync] Reclassifying conversation ${conversationId} from "${existingConv.channel}" to "${channel}"`);
                  }
                  
                  await supabase
                    .from("conversations")
                    .update(updateData)
                    .eq("id", conversationId);
                  
                  result.conversations_updated++;
                }

                // Fetch messages for this conversation if enabled
                if (include_messages && conversationId) {
                  try {
                    const messagesUrl = `https://services.leadconnectorhq.com/conversations/${ghlConv.id}/messages`;

                    // Usar o resultado pré-carregado em paralelo quando disponível
                    let msgData: Record<string, unknown> | null =
                      (prefetchedMessages.get(ghlConv.id) as Record<string, unknown> | undefined) ?? null;
                    let msgStatus = msgData ? 200 : 0;

                    if (!msgData) {
                      const msgResponse = await fetch(messagesUrl, {
                        method: "GET",
                        headers: {
                          Authorization: `Bearer ${apiKey}`,
                          Version: "2021-04-15",
                          Accept: "application/json",
                        },
                      });
                      msgStatus = msgResponse.status;
                      if (msgResponse.ok) msgData = await msgResponse.json();
                    }

                    if (msgData) {
                      const msgDataAny = msgData as any;


                      // Robust parsing: handle multiple response formats from GHL API
                      let rawMessages = msgDataAny.messages;
                      if (rawMessages && !Array.isArray(rawMessages) && typeof rawMessages === "object") {
                        // Nested format: { messages: { messages: [...] } }
                        rawMessages = rawMessages.messages || Object.values(rawMessages);
                      }
                      if (!rawMessages) {
                        rawMessages = msgDataAny.data || [];
                      }

                      const messages: GHLMessage[] = Array.isArray(rawMessages) ? rawMessages : [];
                      
                      console.log(`[GHL Sync] Conv ${ghlConv.id} messages response keys: ${Object.keys(msgData).join(",")}, parsed count: ${messages.length}`);

                      for (const msg of messages) {
                        if (!msg || !msg.id) continue;
                        
                        // Skip if already synced
                        if (existingMessageIds.has(msg.id)) {
                          result.messages_skipped++;
                          continue;
                        }

                        const direction = normalizeDirection(msg.direction);
                        const attachments = (msg.attachments || []).map(att => ({
                          url: att.url,
                          type: att.type || "file",
                          name: att.name || "attachment",
                        }));

                        const sentAt = normalizeTimestamp(msg.dateAdded) || new Date().toISOString();
                        
                        const { error: msgError } = await supabase
                          .from("messages")
                          .insert({
                            conversation_id: conversationId,
                            workspace_id,
                            content: msg.body || "",
                            direction,
                            sent_at: sentAt,
                            ghl_message_id: msg.id,
                            external_message_id: msg.id,
                            attachments: attachments.length > 0 ? attachments : null,
                          });

                        if (msgError) {
                          if (msgError.code === "23505") {
                            result.messages_skipped++;
                          } else {
                            console.error(`[GHL Sync] Message insert error for ${msg.id}:`, msgError);
                          }
                        } else {
                          result.messages_created++;
                          existingMessageIds.add(msg.id);
                        }
                      }
                      // After processing messages, infer channel from message types if current channel is "other" or "sms"
                      if ((channel === "other" || channel === "sms") && messages.length > 0) {
                        const msgTypeSet = new Set<number>();
                        for (const msg of messages) {
                          if (msg.type !== undefined) {
                            const numType = typeof msg.type === "number" ? msg.type : Number(msg.type);
                            if (!isNaN(numType)) msgTypeSet.add(numType);
                          }
                        }
                        // Determine real channel from message types (priority: instagram > whatsapp > messenger)
                        let inferredChannel: string | null = null;
                        if (msgTypeSet.has(17) || msgTypeSet.has(18)) {
                          inferredChannel = "instagram";
                        } else if (msgTypeSet.has(15) || msgTypeSet.has(16)) {
                          inferredChannel = "whatsapp";
                        } else if (msgTypeSet.has(5) || msgTypeSet.has(6) || msgTypeSet.has(19)) {
                          inferredChannel = "messenger";
                        }
                        if (inferredChannel && inferredChannel !== channel) {
                          console.log(`[GHL Sync] Inferred channel "${inferredChannel}" from message types [${[...msgTypeSet].join(",")}] for conv ${ghlConv.id} (was "${channel}")`);
                          channel = inferredChannel;

                          // CRITICAL: Re-check channel governance after inference
                          // If the real channel is not allowed for this workspace, DELETE the conversation and messages we just created
                          if (!isSyncChannelAllowed(channel)) {
                            console.log(`[GHL Sync] ROLLBACK: channel "${channel}" not allowed for workspace ${workspace_id} after inference. Deleting conv ${conversationId}`);
                            await supabase.from("messages").delete().eq("conversation_id", conversationId);
                            await supabase.from("conversations").delete().eq("id", conversationId);
                            result.conversations_created = Math.max(0, result.conversations_created - 1);
                            continue;
                          }

                          await supabase
                            .from("conversations")
                            .update({ channel: inferredChannel })
                            .eq("id", conversationId);
                        }
                        }

                        // After channel inference, update lead social URL if channel is social and lead lacks it
                        if (leadId && (channel === "instagram" || channel === "messenger")) {
                          try {
                            const socialField = channel === "instagram" ? "instagram_url" : "facebook_url";
                            const { data: leadSocial } = await supabase
                              .from("leads")
                              .select(socialField)
                              .eq("id", leadId)
                              .single();

                            if (leadSocial && !leadSocial[socialField]) {
                              // Try to get the social handle from GHL contact
                              const contactData = await fetchGHLContact(apiKey, ghlConv.contactId);
                              const socialUrl = channel === "instagram" ? contactData?.instagram_url : contactData?.facebook_url;
                              if (socialUrl) {
                                await supabase.from("leads").update({ [socialField]: socialUrl }).eq("id", leadId);
                                console.log(`[GHL Sync] Updated lead ${leadId} ${socialField} = ${socialUrl} (from channel inference)`);
                              }
                            }
                          } catch (err) {
                            console.error(`[GHL Sync] Error updating social URL after channel inference:`, err);
                          }
                        }

                      // Trigger autopilot if the last message in this conversation is inbound AND recent (< 2 hours)
                      if (messages.length > 0 && conversationId && leadId) {
                        const lastMsg = messages[messages.length - 1];
                        const lastDirection = normalizeDirection(lastMsg?.direction);
                        const lastMsgDate = lastMsg?.dateAdded ? new Date(lastMsg.dateAdded) : null;
                        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
                        const isRecent = lastMsgDate && lastMsgDate > twoHoursAgo;
                        if (lastDirection === "inbound" && isRecent) {
                          // Fire-and-forget autopilot trigger (don't block sync)
                          triggerAutopilotForSyncedMessage(
                            supabaseUrl,
                            supabaseServiceKey,
                            {
                              workspaceId: workspace_id,
                              conversationId,
                              channel,
                              leadId,
                              ghlContactId: ghlConv.contactId,
                              locationId,
                            }
                          ).catch(err => console.error("[GHL Sync] Autopilot trigger error (non-blocking):", err));
                        }
                      }
                    } else {
                      console.error(`[GHL Sync] Messages API error for conv ${ghlConv.id}: ${msgStatus}`);
                    }

                  } catch (msgErr) {
                    console.error(`[GHL Sync Conversations] Error fetching messages`, msgErr);
                  }
                }

                // Send progress
                send("progress", {
                  page: pageCount,
                  processed: result.total_processed,
                  conversations_created: result.conversations_created,
                  messages_created: result.messages_created,
                });
              }

              // Interrompido a meio da página: o cursor intermédio já foi gravado
              if (result.partial) {
                break;
              }

              // Update pagination cursor using sort date
              if (conversations.length > 0) {
                const lastConv = conversations[conversations.length - 1];
                lastSortDate = lastConv.lastMessageDate || lastConv.dateUpdated || lastConv.id;
                // Persistir a cada página para permitir retoma
                await saveCursor(lastSortDate, true);
              }

              // Continue if we got a full page
              hasMore = conversations.length >= PAGE_SIZE;
            }

            // Se ainda há páginas por processar, a passagem é parcial
            if (hasMore && pageCount >= maxPages) {
              result.partial = true;
              result.errors.push(`Sincronização parcial: limite de ${maxPages} páginas por execução. Retoma automática do último ponto.`);
              await saveCursor(lastSortDate, true);
            }

            // Passagem concluída sem interrupções → limpar cursor
            if (!result.partial) {
              await clearCursor();
            }

            // Update last_sync_at
            await supabase
              .from("workspace_ghl_config")
              .update({ last_sync_at: new Date().toISOString() })
              .eq("workspace_id", workspace_id);


            // Log sync
            await supabase.from("ghl_sync_log").insert({
              workspace_id,
              ghl_entity_type: "conversation_batch",
              ghl_entity_id: crypto.randomUUID(),
              fastcrm_entity_type: "conversations",
              fastcrm_entity_id: crypto.randomUUID(),
              event_type: result.errors.length > 0 ? "sync_with_errors" : "full_sync",
              payload: result,
            });

            send("complete", result);
            
          } catch (err) {
            console.error("[GHL Sync Conversations] Stream error:", err);
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

    // Non-streaming mode - simplified
    return new Response(
      JSON.stringify({ 
        message: "Use stream=true for conversation sync",
        hint: "POST with { workspace_id, stream: true }" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[GHL Sync Conversations] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

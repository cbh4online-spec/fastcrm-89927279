import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type DiscoveredChannel = {
  channel_type: string;
  ghl_account_id: string;
  account_name: string;
};

type JsonRecord = Record<string, unknown>;

const ACCOUNT_ARRAY_KEYS = [
  "accounts",
  "data",
  "items",
  "results",
  "connections",
  "channels",
  "pages",
  "businesses",
  "integrations",
  "socialAccounts",
  "social_accounts",
];

const SOCIAL_TYPE_MAP: Record<string, string> = {
  facebook: "facebook",
  fb: "facebook",
  messenger: "facebook",
  facebook_messenger: "facebook",
  fb_messenger: "facebook",
  type_fb: "facebook",
  type_fb_messenger: "facebook",
  type_facebook_messenger: "facebook",
  instagram: "instagram",
  ig: "instagram",
  instagram_dm: "instagram",
  type_instagram: "instagram",
  type_instagram_dm: "instagram",
  whatsapp: "whatsapp",
  whatsapp_api: "whatsapp",
  twilio_whatsapp: "whatsapp",
  type_whatsapp: "whatsapp",
  type_whatsapp_api: "whatsapp",
  type_twilio_whatsapp: "whatsapp",
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map(asString).filter(Boolean))];
}

function normalizeSocialType(value: unknown): string | null {
  const raw = asString(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!raw) return null;

  if (SOCIAL_TYPE_MAP[raw]) return SOCIAL_TYPE_MAP[raw];
  if (raw.includes("instagram")) return "instagram";
  if (raw.includes("facebook") || raw.includes("messenger") || raw === "fb") return "facebook";
  if (raw.includes("whatsapp")) return "whatsapp";
  return null;
}

function extractCandidateArrays(payload: unknown, depth = 0): JsonRecord[] {
  const MAX_DEPTH = 4;
  if (depth > MAX_DEPTH) return [];

  if (Array.isArray(payload)) {
    const records = payload.map(asRecord).filter((v): v is JsonRecord => !!v);
    if (records.length > 0) return records;
    // Arrays of arrays — recurse
    const nested: JsonRecord[] = [];
    for (const item of payload) {
      nested.push(...extractCandidateArrays(item, depth + 1));
    }
    return nested;
  }

  const record = asRecord(payload);
  if (!record) return [];

  // Check known keys at this level — if found as array, use it directly
  for (const key of ACCOUNT_ARRAY_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) {
      const items = value.map(asRecord).filter((i): i is JsonRecord => !!i);
      if (items.length > 0) {
        console.log(`[extractCandidateArrays] Found ${items.length} items at key "${key}" (depth=${depth})`);
        return items;
      }
    }
  }

  // Recurse into nested objects that contain known keys (e.g. results.accounts)
  for (const key of ACCOUNT_ARRAY_KEYS) {
    const value = record[key];
    const nested = asRecord(value);
    if (nested) {
      const deepResult = extractCandidateArrays(nested, depth + 1);
      if (deepResult.length > 0) {
        console.log(`[extractCandidateArrays] Found ${deepResult.length} items inside "${key}" object (depth=${depth})`);
        return deepResult;
      }
    }
  }

  // Try ANY nested object or array values
  for (const [key, value] of Object.entries(record)) {
    if (ACCOUNT_ARRAY_KEYS.includes(key)) continue; // already tried
    if (Array.isArray(value)) {
      const items = value.map(asRecord).filter((i): i is JsonRecord => !!i);
      if (items.length > 0) {
        console.log(`[extractCandidateArrays] Found ${items.length} items at non-standard key "${key}" (depth=${depth})`);
        return items;
      }
    }
    const nested = asRecord(value);
    if (nested) {
      const deepResult = extractCandidateArrays(nested, depth + 1);
      if (deepResult.length > 0) return deepResult;
    }
  }

  // Last resort: treat the record itself as a single entry
  return [record];
}

function extractChannelType(entry: JsonRecord, fallbackType?: string): string | null {
  const directType = uniqueStrings([
    entry.type,
    entry.channel_type,
    entry.channelType,
    entry.platform,
    entry.provider,
    entry.integration_type,
    entry.integrationType,
    entry.network,
    entry.source,
    fallbackType,
  ]);

  for (const candidate of directType) {
    const normalized = normalizeSocialType(candidate);
    if (normalized) return normalized;
  }

  const nestedCandidates = [
    asRecord(entry.account),
    asRecord(entry.page),
    asRecord(entry.profile),
    asRecord(entry.channel),
    asRecord(entry.integration),
    asRecord(entry.instagram_business_account),
  ].filter((value): value is JsonRecord => !!value);

  for (const nested of nestedCandidates) {
    const nestedType = extractChannelType(nested, fallbackType);
    if (nestedType) return nestedType;
  }

  return null;
}

function extractAccountId(entry: JsonRecord): string {
  const nestedInstagram = asRecord(entry.instagram_business_account);
  const nestedPage = asRecord(entry.page);
  const nestedAccount = asRecord(entry.account);
  const nestedChannel = asRecord(entry.channel);

  return uniqueStrings([
    entry.id,
    entry.pageId,
    entry.page_id,
    entry.accountId,
    entry.account_id,
    entry.channelId,
    entry.channel_id,
    entry.integrationId,
    entry.integration_id,
    entry.socialAccountId,
    entry.social_account_id,
    entry.businessAccountId,
    entry.business_account_id,
    nestedInstagram?.id,
    nestedPage?.id,
    nestedAccount?.id,
    nestedChannel?.id,
  ])[0] || "";
}

function extractAccountName(entry: JsonRecord, fallbackLabel: string): string {
  const nestedInstagram = asRecord(entry.instagram_business_account);
  const nestedPage = asRecord(entry.page);
  const nestedAccount = asRecord(entry.account);
  const nestedChannel = asRecord(entry.channel);

  return uniqueStrings([
    entry.name,
    entry.pageName,
    entry.page_name,
    entry.accountName,
    entry.account_name,
    entry.username,
    entry.userName,
    entry.ig_username,
    entry.handle,
    entry.displayName,
    entry.display_name,
    entry.companyName,
    entry.company_name,
    nestedInstagram?.username,
    nestedInstagram?.name,
    nestedPage?.name,
    nestedAccount?.name,
    nestedChannel?.name,
  ])[0] || fallbackLabel;
}

function inferConversationType(value: unknown): string | null {
  const normalized = normalizeSocialType(value);
  if (normalized) return normalized;

  const raw = asString(value).toUpperCase();
  if (!raw) return null;
  if (raw.includes("INSTAGRAM")) return "instagram";
  if (raw.includes("FACEBOOK") || raw.includes("FB") || raw.includes("MESSENGER")) return "facebook";
  if (raw.includes("WHATSAPP")) return "whatsapp";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Não autorizado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id } = await req.json();
    if (!workspace_id || typeof workspace_id !== "string") {
      return new Response(
        JSON.stringify({ error: "workspace_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .limit(1);
    if (!member?.length) {
      return new Response(
        JSON.stringify({ error: "Sem acesso a este workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GHL config
    const { data: ghlConfig } = await supabase
      .from("workspace_ghl_config")
      .select("ghl_location_id, ghl_api_key_encrypted")
      .eq("workspace_id", workspace_id)
      .limit(1);

    if (!ghlConfig?.length) {
      return new Response(
        JSON.stringify({ error: "Configuração GHL não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { ghl_location_id, ghl_api_key_encrypted } = ghlConfig[0];
    if (!ghl_location_id || !ghl_api_key_encrypted) {
      return new Response(
        JSON.stringify({ error: "Location ID ou API Key não configurados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ghlHeaders = {
      Authorization: `Bearer ${ghl_api_key_encrypted}`,
      Version: "2021-07-28",
      Accept: "application/json",
    };

    const channels: DiscoveredChannel[] = [];

    const foundKeys = new Set<string>();

    const addChannel = (type: string, id: string, name: string) => {
      const key = `${type}::${id}`;
      if (foundKeys.has(key)) return;
      foundKeys.add(key);
      channels.push({ channel_type: type, ghl_account_id: id, account_name: name });
    };

    const collectChannelsFromPayload = (payload: unknown, fallbackType?: string) => {
      const entries = extractCandidateArrays(payload);
      for (const entry of entries) {
        const channelType = extractChannelType(entry, fallbackType);
        if (!channelType) continue;
        const accountId = extractAccountId(entry);
        if (!accountId) continue;
        const fallbackLabel =
          channelType === "facebook"
            ? "Facebook Page"
            : channelType === "instagram"
              ? "Instagram Account"
              : "WhatsApp";
        const accountName = extractAccountName(entry, fallbackLabel);
        addChannel(channelType, accountId, accountName);
      }
    };

    // ─── Strategy 1: Social-media-posting Facebook accounts ───
    try {
      const fbRes = await fetch(
        `https://services.leadconnectorhq.com/social-media-posting/${ghl_location_id}/oauth/facebook/accounts`,
        { headers: ghlHeaders }
      );
      const fbStatus = fbRes.status;
      const fbBody = await fbRes.text();
      console.log(`[Strategy1] Facebook accounts API: status=${fbStatus} body=${fbBody.substring(0, 500)}`);
      
      if (fbRes.ok) {
        try {
          const fbData = JSON.parse(fbBody);
          collectChannelsFromPayload(fbData, "facebook");
        } catch (e) {
          console.warn("[Strategy1] FB parse error:", e);
        }
      }
    } catch (e) {
      console.warn("[Strategy1] Facebook fetch error:", e);
    }

    // ─── Strategy 2: Social-media-posting Instagram accounts ───
    try {
      const igRes = await fetch(
        `https://services.leadconnectorhq.com/social-media-posting/${ghl_location_id}/oauth/instagram/accounts`,
        { headers: ghlHeaders }
      );
      const igStatus = igRes.status;
      const igBody = await igRes.text();
      console.log(`[Strategy2] Instagram accounts API: status=${igStatus} body=${igBody.substring(0, 500)}`);

      if (igRes.ok) {
        try {
          const igData = JSON.parse(igBody);
          collectChannelsFromPayload(igData, "instagram");
        } catch (e) {
          console.warn("[Strategy2] IG parse error:", e);
        }
      }
    } catch (e) {
      console.warn("[Strategy2] Instagram fetch error:", e);
    }

    // ─── Strategy 3: Try /social-media-posting/{locationId}/accounts (generic) ───
    try {
      const genRes = await fetch(
        `https://services.leadconnectorhq.com/social-media-posting/${ghl_location_id}/accounts`,
        { headers: ghlHeaders }
      );
      const genStatus = genRes.status;
      const genBody = await genRes.text();
      console.log(`[Strategy3] Generic accounts API: status=${genStatus} body=${genBody.substring(0, 500)}`);

      if (genRes.ok) {
        try {
          const genData = JSON.parse(genBody);
          collectChannelsFromPayload(genData);
        } catch (e) {
          console.warn("[Strategy3] parse error:", e);
        }
      }
    } catch (e) {
      console.warn("[Strategy3] fetch error:", e);
    }

    // ─── Strategy 4: Custom Values / Integrations endpoint ───
    try {
      const intRes = await fetch(
        `https://services.leadconnectorhq.com/locations/${ghl_location_id}/integrations`,
        { headers: ghlHeaders }
      );
      const intStatus = intRes.status;
      const intBody = await intRes.text();
      console.log(`[Strategy4] Integrations API: status=${intStatus} body=${intBody.substring(0, 500)}`);
      if (intRes.ok) {
        try {
          const intData = JSON.parse(intBody);
          collectChannelsFromPayload(intData);
        } catch (e) {
          console.warn("[Strategy4] parse error:", e);
        }
      }
    } catch (e) {
      console.warn("[Strategy4] error:", e);
    }

    // ─── Strategy 5: Location info for WhatsApp / phone ───
    try {
      const locRes = await fetch(
        `https://services.leadconnectorhq.com/locations/${ghl_location_id}`,
        { headers: ghlHeaders }
      );
      if (locRes.ok) {
        const locData = await locRes.json();
        const loc = locData?.location || locData;
        if (loc?.phone || loc?.twilio?.phone) {
          addChannel("whatsapp", loc.id || ghl_location_id, loc.phone || loc.twilio?.phone || "WhatsApp");
        }
      } else {
        await locRes.text();
      }
    } catch (e) {
      console.warn("[Strategy5] Location error:", e);
    }

    // ─── Strategy 6: Discover from conversations (secondary) ───
    try {
      let allConversations: any[] = [];
      let nextPageUrl: string | null = `https://services.leadconnectorhq.com/conversations/search?locationId=${ghl_location_id}&limit=100`;
      let pageCount = 0;
      const maxPages = 5; // Increased to 5 pages for better coverage

      while (nextPageUrl && pageCount < maxPages) {
        const searchRes = await fetch(nextPageUrl, { headers: ghlHeaders });
        if (!searchRes.ok) {
          await searchRes.text();
          break;
        }
        const searchData = await searchRes.json();
        const convs = searchData?.conversations || [];
        allConversations = allConversations.concat(convs);
        pageCount++;

        if (searchData?.meta?.nextPageUrl) {
          nextPageUrl = searchData.meta.nextPageUrl;
        } else if (searchData?.meta?.nextPage) {
          nextPageUrl = `https://services.leadconnectorhq.com/conversations/search?locationId=${ghl_location_id}&limit=100&page=${searchData.meta.nextPage}`;
        } else {
          nextPageUrl = null;
        }
      }

      console.log(`[Strategy6] Scanned ${allConversations.length} conversations across ${pageCount} pages`);

      // Log unique conversation types found
      const uniqueTypes = new Set(allConversations.map((c: any) => c.type));
      console.log(`[Strategy6] Unique conversation types: ${[...uniqueTypes].join(", ")}`);

      for (const conv of allConversations) {
        const channelType = inferConversationType(conv.type) || inferConversationType(conv.messageType);
        if (!channelType) continue;

        const inboxId = asString(conv.inbox) || asString(conv.inboxId) || asString(conv.inboxName);
        const companyName = asString(conv.companyName) || asString(conv.company_name);
        const phone = asString(conv.phone) || asString(conv.contactPhone);
        const pageName = uniqueStrings([
          conv.pageName,
          conv.page_name,
          conv.accountName,
          conv.account_name,
          conv.username,
          conv.userName,
          conv.ig_username,
          companyName,
          inboxId,
        ])[0];
        const fallbackName =
          channelType === "instagram"
            ? "Instagram DM"
            : channelType === "facebook"
              ? "Facebook Messenger"
              : "WhatsApp";

        const pageId =
          uniqueStrings([
            conv.inboxId,
            conv.inbox,
            conv.pageId,
            conv.page_id,
            conv.accountId,
            conv.account_id,
            conv.channelId,
            conv.channel_id,
            phone,
          ])[0] || `${channelType}-${pageName || ghl_location_id}`;

        let normalizedName = pageName || fallbackName;
        if (channelType === "instagram" && normalizedName && !normalizedName.startsWith("Instagram")) {
          normalizedName = `Instagram · ${normalizedName}`;
        }
        if (channelType === "facebook" && normalizedName && !normalizedName.startsWith("Facebook")) {
          normalizedName = `Facebook · ${normalizedName}`;
        }

        if (pageId) addChannel(channelType, pageId, normalizedName);
      }
    } catch (e) {
      console.warn("[Strategy6] Conversations error:", e);
    }

    console.log(`Returning ${channels.length} channels: ${JSON.stringify(channels.map(c => `${c.channel_type}:${c.account_name}`))}`);

    return new Response(JSON.stringify({ channels }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-list-social-channels error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Erro interno ao buscar canais", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

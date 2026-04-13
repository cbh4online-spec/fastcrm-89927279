import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const userId = user.id;

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
      .eq("user_id", userId)
      .limit(1);
    if (!member?.length) {
      return new Response(
        JSON.stringify({ error: "Sem acesso a este workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GHL config
    const { data: ghlConfig, error: configError } = await supabase
      .from("workspace_ghl_config")
      .select("ghl_location_id, ghl_api_key_encrypted")
      .eq("workspace_id", workspace_id)
      .limit(1);

    if (configError || !ghlConfig?.length) {
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

    const channels: Array<{
      channel_type: string;
      ghl_account_id: string;
      account_name: string;
    }> = [];

    // --- Strategy 1: Get location info for WhatsApp / phone ---
    try {
      const locRes = await fetch(
        `https://services.leadconnectorhq.com/locations/${ghl_location_id}`,
        { headers: ghlHeaders }
      );
      if (locRes.ok) {
        const locData = await locRes.json();
        const loc = locData?.location || locData;
        if (loc?.phone || loc?.twilio?.phone) {
          channels.push({
            channel_type: "whatsapp",
            ghl_account_id: loc.id || ghl_location_id,
            account_name: loc.phone || loc.twilio?.phone || "WhatsApp",
          });
        }
      } else {
        console.warn(`Location fetch failed: ${locRes.status}`);
        await locRes.text();
      }
    } catch (e) {
      console.warn("Location fetch error:", e);
    }

    // --- Strategy 2: Discover channels from recent conversations ---
    // GHL conversation types: TYPE_PHONE, TYPE_EMAIL, TYPE_SMS, TYPE_FB, TYPE_INSTAGRAM, TYPE_WHATSAPP, etc.
    const channelTypeMap: Record<string, { channel_type: string; label: string }> = {
      TYPE_FB: { channel_type: "facebook", label: "Facebook Messenger" },
      TYPE_INSTAGRAM: { channel_type: "instagram", label: "Instagram DM" },
      TYPE_WHATSAPP: { channel_type: "whatsapp", label: "WhatsApp" },
    };

    // Track which channel types we already found
    const foundTypes = new Set(channels.map((c) => c.channel_type));

    try {
      const searchRes = await fetch(
        `https://services.leadconnectorhq.com/conversations/search?locationId=${ghl_location_id}&limit=100`,
        { headers: ghlHeaders }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const conversations = searchData?.conversations || [];
        console.log(`Found ${conversations.length} conversations to scan for channel types`);

        // Collect unique channel types and their identifiers
        const discoveredChannels = new Map<string, { accountId: string; accountName: string }>();

        for (const conv of conversations) {
          const convType = conv.type as string;
          const mapping = channelTypeMap[convType];
          if (!mapping) continue;
          if (foundTypes.has(mapping.channel_type)) continue;
          if (discoveredChannels.has(mapping.channel_type)) continue;

          // Extract account/page identifier from conversation
          const accountId = conv.companyName || conv.locationId || ghl_location_id;
          let accountName = mapping.label;

          // Try to get a better name from the conversation metadata
          if (convType === "TYPE_FB") {
            accountName = conv.companyName || conv.fullName
              ? `Facebook · ${conv.companyName || "Page"}`
              : "Facebook Messenger";
          } else if (convType === "TYPE_INSTAGRAM") {
            accountName = conv.companyName
              ? `Instagram · ${conv.companyName}`
              : "Instagram DM";
          }

          discoveredChannels.set(mapping.channel_type, {
            accountId: `${mapping.channel_type}-${ghl_location_id}`,
            accountName,
          });
        }

        for (const [channelType, info] of discoveredChannels) {
          channels.push({
            channel_type: channelType,
            ghl_account_id: info.accountId,
            account_name: info.accountName,
          });
          foundTypes.add(channelType);
        }
      } else {
        console.warn(`Conversations search failed: ${searchRes.status}`);
        const body = await searchRes.text();
        console.warn(`Conversations search body: ${body.substring(0, 500)}`);
      }
    } catch (e) {
      console.warn("Conversations search error:", e);
    }

    // --- Strategy 3: Try social-media-posting endpoints as fallback ---
    if (!foundTypes.has("facebook")) {
      try {
        const fbRes = await fetch(
          `https://services.leadconnectorhq.com/social-media-posting/${ghl_location_id}/oauth/facebook/accounts`,
          { headers: ghlHeaders }
        );
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          const accounts = fbData?.accounts || fbData?.data || [];
          for (const acc of accounts) {
            channels.push({
              channel_type: "facebook",
              ghl_account_id: acc.id || acc.pageId || String(acc),
              account_name: acc.name || acc.pageName || "Facebook Page",
            });
          }
        } else {
          console.warn(`Facebook social-media-posting fetch failed: ${fbRes.status}`);
          await fbRes.text();
        }
      } catch (e) {
        console.warn("Facebook fallback error:", e);
      }
    }

    if (!foundTypes.has("instagram")) {
      try {
        const igRes = await fetch(
          `https://services.leadconnectorhq.com/social-media-posting/${ghl_location_id}/oauth/instagram/accounts`,
          { headers: ghlHeaders }
        );
        if (igRes.ok) {
          const igData = await igRes.json();
          const accounts = igData?.accounts || igData?.data || [];
          for (const acc of accounts) {
            channels.push({
              channel_type: "instagram",
              ghl_account_id: acc.id || acc.accountId || String(acc),
              account_name: acc.name || acc.username || "Instagram Account",
            });
          }
        } else {
          console.warn(`Instagram social-media-posting fetch failed: ${igRes.status}`);
          await igRes.text();
        }
      } catch (e) {
        console.warn("Instagram fallback error:", e);
      }
    }

    console.log(`Returning ${channels.length} channels: ${JSON.stringify(channels.map(c => c.channel_type))}`);

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

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

    const channels: Array<{
      channel_type: string;
      ghl_account_id: string;
      account_name: string;
    }> = [];

    const foundKeys = new Set<string>();

    const addChannel = (type: string, id: string, name: string) => {
      const key = `${type}::${id}`;
      if (foundKeys.has(key)) return;
      foundKeys.add(key);
      channels.push({ channel_type: type, ghl_account_id: id, account_name: name });
    };

    // ─── Strategy 1: Social-media-posting Facebook accounts ───
    // This is the primary source for Facebook pages (like the GHL integrations modal)
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
          // The response could be { accounts: [...] }, { data: [...] }, or just [...]
          const accounts = fbData?.accounts || fbData?.data || (Array.isArray(fbData) ? fbData : []);
          console.log(`[Strategy1] Found ${accounts.length} Facebook accounts`);
          for (const acc of accounts) {
            const pageId = acc.id || acc.pageId || acc.page_id || "";
            const pageName = acc.name || acc.pageName || acc.page_name || "Facebook Page";
            if (pageId) {
              addChannel("facebook", String(pageId), pageName);
            }
          }
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
          const accounts = igData?.accounts || igData?.data || (Array.isArray(igData) ? igData : []);
          console.log(`[Strategy2] Found ${accounts.length} Instagram accounts`);
          for (const acc of accounts) {
            const accId = acc.id || acc.accountId || acc.account_id || acc.instagram_business_account?.id || "";
            const accName = acc.name || acc.username || acc.ig_username || "Instagram Account";
            if (accId) {
              addChannel("instagram", String(accId), accName);
            }
          }
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
          const accounts = genData?.accounts || genData?.data || (Array.isArray(genData) ? genData : []);
          for (const acc of accounts) {
            const platform = (acc.type || acc.platform || acc.provider || "").toLowerCase();
            let channelType = "";
            if (platform.includes("facebook") || platform.includes("fb")) channelType = "facebook";
            else if (platform.includes("instagram") || platform.includes("ig")) channelType = "instagram";
            else if (platform.includes("whatsapp") || platform.includes("wa")) channelType = "whatsapp";
            
            if (channelType) {
              const accId = acc.id || acc.pageId || acc.accountId || "";
              const accName = acc.name || acc.pageName || acc.username || `${platform} Account`;
              if (accId) addChannel(channelType, String(accId), accName);
            }
          }
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
    const channelTypeMap: Record<string, { channel_type: string; label: string }> = {
      TYPE_FB: { channel_type: "facebook", label: "Facebook Messenger" },
      TYPE_INSTAGRAM: { channel_type: "instagram", label: "Instagram DM" },
      TYPE_WHATSAPP: { channel_type: "whatsapp", label: "WhatsApp" },
    };

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
        const convType = conv.type as string;
        const mapping = channelTypeMap[convType];
        if (!mapping) continue;

        const inboxId = conv.inbox || conv.inboxId || "";
        const companyName = conv.companyName || "";

        let pageId = "";
        let pageName = "";

        if (convType === "TYPE_INSTAGRAM") {
          pageId = inboxId || `instagram-${companyName || ghl_location_id}`;
          pageName = companyName || inboxId || "Instagram DM";
          if (pageName && !pageName.startsWith("Instagram")) pageName = `Instagram · ${pageName}`;
        } else if (convType === "TYPE_FB") {
          pageId = inboxId || `facebook-${companyName || ghl_location_id}`;
          pageName = companyName || inboxId || "Facebook Messenger";
          if (pageName && !pageName.startsWith("Facebook")) pageName = `Facebook · ${pageName}`;
        } else if (convType === "TYPE_WHATSAPP") {
          const phone = conv.phone || conv.contactPhone || "";
          pageId = inboxId || phone || `whatsapp-${ghl_location_id}`;
          pageName = phone || companyName || "WhatsApp";
        }

        if (pageId) addChannel(mapping.channel_type, pageId, pageName);
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

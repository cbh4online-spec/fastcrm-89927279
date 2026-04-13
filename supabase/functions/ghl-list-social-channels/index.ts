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

    // Track unique channels by composite key
    const foundKeys = new Set<string>();

    const addChannel = (type: string, id: string, name: string) => {
      const key = `${type}::${id}`;
      if (foundKeys.has(key)) return;
      foundKeys.add(key);
      channels.push({ channel_type: type, ghl_account_id: id, account_name: name });
    };

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
          addChannel("whatsapp", loc.id || ghl_location_id, loc.phone || loc.twilio?.phone || "WhatsApp");
        }
      } else {
        console.warn(`Location fetch failed: ${locRes.status}`);
        await locRes.text();
      }
    } catch (e) {
      console.warn("Location fetch error:", e);
    }

    // --- Strategy 2: Discover ALL unique pages/profiles from conversations ---
    // Scan multiple pages of conversations to find all unique channel pages
    const channelTypeMap: Record<string, { channel_type: string; label: string }> = {
      TYPE_FB: { channel_type: "facebook", label: "Facebook Messenger" },
      TYPE_INSTAGRAM: { channel_type: "instagram", label: "Instagram DM" },
      TYPE_WHATSAPP: { channel_type: "whatsapp", label: "WhatsApp" },
    };

    try {
      // Scan up to 3 pages of conversations for better coverage
      let allConversations: any[] = [];
      let nextPageUrl: string | null = `https://services.leadconnectorhq.com/conversations/search?locationId=${ghl_location_id}&limit=100`;
      let pageCount = 0;
      const maxPages = 3;

      while (nextPageUrl && pageCount < maxPages) {
        const searchRes = await fetch(nextPageUrl, { headers: ghlHeaders });
        if (!searchRes.ok) {
          console.warn(`Conversations search page ${pageCount} failed: ${searchRes.status}`);
          await searchRes.text();
          break;
        }
        const searchData = await searchRes.json();
        const convs = searchData?.conversations || [];
        allConversations = allConversations.concat(convs);
        pageCount++;

        // Check for next page
        if (searchData?.meta?.nextPageUrl) {
          nextPageUrl = searchData.meta.nextPageUrl;
        } else if (searchData?.meta?.nextPage) {
          nextPageUrl = `https://services.leadconnectorhq.com/conversations/search?locationId=${ghl_location_id}&limit=100&page=${searchData.meta.nextPage}`;
        } else {
          nextPageUrl = null;
        }
      }

      console.log(`Scanned ${allConversations.length} conversations across ${pageCount} pages`);

      // Log a sample conversation for debugging (redact sensitive info)
      if (allConversations.length > 0) {
        const sample = allConversations[0];
        console.log(`Sample conversation keys: ${Object.keys(sample).join(", ")}`);
        console.log(`Sample type=${sample.type}, companyName=${sample.companyName}, inbox=${sample.inbox}, assignedTo=${sample.assignedTo}`);
      }

      // Collect ALL unique pages/profiles per channel type
      // Use multiple fields to identify unique pages: inbox, companyName, assignedTo, etc.
      for (const conv of allConversations) {
        const convType = conv.type as string;
        const mapping = channelTypeMap[convType];
        if (!mapping) continue;

        // Build a unique page identifier from conversation metadata
        // GHL conversations may have different fields depending on the channel:
        // - inbox: the inbox/page that received the message
        // - companyName: sometimes the page name
        // - assignedTo: assigned user (not relevant for page identification)
        // - contactName / fullName: the contact (not the page)
        
        // For social channels, the key differentiator is typically the inbox or page account
        const inboxId = conv.inbox || conv.inboxId || "";
        const companyName = conv.companyName || "";
        
        // Create a unique page key - prefer inbox, fall back to companyName, then location
        let pageId = "";
        let pageName = "";

        if (convType === "TYPE_INSTAGRAM") {
          // For Instagram, try to extract the IG username/page from conversation
          pageId = inboxId || `instagram-${companyName || ghl_location_id}`;
          pageName = companyName || inboxId || "Instagram DM";
          // If the name doesn't look like an IG handle, prefix it
          if (pageName && !pageName.startsWith("Instagram")) {
            pageName = `Instagram · ${pageName}`;
          }
        } else if (convType === "TYPE_FB") {
          pageId = inboxId || `facebook-${companyName || ghl_location_id}`;
          pageName = companyName || inboxId || "Facebook Messenger";
          if (pageName && !pageName.startsWith("Facebook")) {
            pageName = `Facebook · ${pageName}`;
          }
        } else if (convType === "TYPE_WHATSAPP") {
          // WhatsApp may have multiple numbers
          const phone = conv.phone || conv.contactPhone || "";
          pageId = inboxId || phone || `whatsapp-${ghl_location_id}`;
          pageName = phone || companyName || "WhatsApp";
        }

        if (pageId) {
          addChannel(mapping.channel_type, pageId, pageName);
        }
      }
    } catch (e) {
      console.warn("Conversations search error:", e);
    }

    // --- Strategy 3: Try social-media-posting endpoints as fallback ---
    if (!foundKeys.has("facebook")) {
      try {
        const fbRes = await fetch(
          `https://services.leadconnectorhq.com/social-media-posting/${ghl_location_id}/oauth/facebook/accounts`,
          { headers: ghlHeaders }
        );
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          const accounts = fbData?.accounts || fbData?.data || [];
          for (const acc of accounts) {
            addChannel(
              "facebook",
              acc.id || acc.pageId || String(acc),
              acc.name || acc.pageName || "Facebook Page"
            );
          }
        } else {
          await fbRes.text();
        }
      } catch (e) {
        console.warn("Facebook fallback error:", e);
      }
    }

    if (!channels.some(c => c.channel_type === "instagram")) {
      try {
        const igRes = await fetch(
          `https://services.leadconnectorhq.com/social-media-posting/${ghl_location_id}/oauth/instagram/accounts`,
          { headers: ghlHeaders }
        );
        if (igRes.ok) {
          const igData = await igRes.json();
          const accounts = igData?.accounts || igData?.data || [];
          for (const acc of accounts) {
            addChannel(
              "instagram",
              acc.id || acc.accountId || String(acc),
              acc.name || acc.username || "Instagram Account"
            );
          }
        } else {
          await igRes.text();
        }
      } catch (e) {
        console.warn("Instagram fallback error:", e);
      }
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

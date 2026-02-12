import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const appUrl = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";

    if (error) {
      console.error("OAuth error:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?whatsapp_error=${error}` },
      });
    }

    if (!code || !state) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?whatsapp_error=missing_params` },
      });
    }

    const [workspaceId, userId] = state.split(":");
    if (!workspaceId || !userId) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?whatsapp_error=invalid_state` },
      });
    }

    const META_APP_ID = Deno.env.get("META_APP_ID");
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error("Missing Meta app credentials");
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/whatsapp-oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const userAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000;

    // Get WhatsApp Business Accounts
    const wabaResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/businesses?access_token=${userAccessToken}`
    );

    let wabaId = null;
    let phoneNumberId = null;
    let displayPhoneNumber = null;

    if (wabaResponse.ok) {
      const businessData = await wabaResponse.json();
      
      if (businessData.data && businessData.data.length > 0) {
        const businessId = businessData.data[0].id;
        
        // Get WhatsApp Business Account for this business
        const whatsappAccountResponse = await fetch(
          `https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts?access_token=${userAccessToken}`
        );

        if (whatsappAccountResponse.ok) {
          const whatsappData = await whatsappAccountResponse.json();
          
          if (whatsappData.data && whatsappData.data.length > 0) {
            wabaId = whatsappData.data[0].id;

            // Get phone numbers for this WABA
            const phoneResponse = await fetch(
              `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${userAccessToken}`
            );

            if (phoneResponse.ok) {
              const phoneData = await phoneResponse.json();
              if (phoneData.data && phoneData.data.length > 0) {
                phoneNumberId = phoneData.data[0].id;
                displayPhoneNumber = phoneData.data[0].display_phone_number;
              }
            }
          }
        }
      }
    }

    if (!wabaId) {
      console.error("No WhatsApp Business Account found");
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?whatsapp_error=no_waba_found` },
      });
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Save to database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { error: upsertError } = await supabase
      .from("whatsapp_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          display_phone_number: displayPhoneNumber,
          access_token: userAccessToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          connected_by: userId,
        },
        { onConflict: "workspace_id" }
      );

    if (upsertError) {
      console.error("Database error:", upsertError);
      throw new Error("Failed to save connection");
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/dashboard/settings?whatsapp_connected=true` },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    const appUrl = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/dashboard/settings?whatsapp_error=connection_failed` },
    });
  }
});

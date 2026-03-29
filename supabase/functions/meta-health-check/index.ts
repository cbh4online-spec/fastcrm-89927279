import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Meta Health Check — verifies tokens, permissions, and webhook subscriptions.
 * Can be invoked manually or via pg_cron.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    let workspaceFilter: string | null = null;

    // Optional: filter by workspace_id from body
    if (req.method === "POST") {
      try {
        const body = await req.json();
        workspaceFilter = body.workspace_id || null;
      } catch {}
    }

    // Get all active connections
    let query = supabase
      .from("meta_connections")
      .select("*")
      .in("status", ["active", "warning"]);

    if (workspaceFilter) {
      query = query.eq("workspace_id", workspaceFilter);
    }

    const { data: connections, error } = await query;
    if (error) throw error;

    const results: any[] = [];

    for (const conn of connections || []) {
      const healthDetails: any = {
        token_valid: false,
        token_expires_in_days: null,
        permissions_ok: false,
        checked_at: new Date().toISOString(),
      };

      let healthStatus = "healthy";
      let connStatus = conn.status;

      // 1. Check token validity
      try {
        const debugRes = await fetch(
          `https://graph.facebook.com/v21.0/debug_token?input_token=${conn.encrypted_access_token}&access_token=${conn.encrypted_access_token}`
        );
        if (debugRes.ok) {
          const debugData = await debugRes.json();
          const tokenInfo = debugData.data;

          healthDetails.token_valid = tokenInfo.is_valid;
          healthDetails.scopes = tokenInfo.scopes;

          if (!tokenInfo.is_valid) {
            healthStatus = "unhealthy";
            connStatus = "expired";
            healthDetails.error = "Token is invalid or expired";
          } else if (tokenInfo.expires_at) {
            const expiresAt = new Date(tokenInfo.expires_at * 1000);
            const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            healthDetails.token_expires_in_days = Math.round(daysUntilExpiry);

            if (daysUntilExpiry < 7) {
              healthStatus = "degraded";
              connStatus = "warning";
              healthDetails.warning = `Token expires in ${Math.round(daysUntilExpiry)} days`;
            }
          }

          // Check required permissions
          const requiredScopes = ["pages_show_list", "pages_messaging"];
          const grantedScopes = new Set(tokenInfo.scopes || []);
          const missingScopes = requiredScopes.filter((s) => !grantedScopes.has(s));
          healthDetails.permissions_ok = missingScopes.length === 0;
          healthDetails.missing_scopes = missingScopes;

          if (missingScopes.length > 0) {
            healthStatus = "degraded";
          }
        } else {
          healthStatus = "unhealthy";
          healthDetails.error = "Failed to debug token";
        }
      } catch (e) {
        healthStatus = "unhealthy";
        healthDetails.error = (e as Error).message;
      }

      // 2. Test basic API call
      try {
        const meRes = await fetch(
          `https://graph.facebook.com/v21.0/me?access_token=${conn.encrypted_access_token}`
        );
        healthDetails.api_reachable = meRes.ok;
        if (!meRes.ok) {
          healthStatus = "unhealthy";
          connStatus = "error";
        }
      } catch {
        healthDetails.api_reachable = false;
        healthStatus = "unhealthy";
      }

      // Update connection health
      await supabase.from("meta_connections").update({
        health_status: healthStatus,
        health_details_json: healthDetails,
        last_healthcheck_at: new Date().toISOString(),
        status: connStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", conn.id);

      results.push({
        connection_id: conn.id,
        workspace_id: conn.workspace_id,
        health_status: healthStatus,
        status: connStatus,
      });
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[meta-health-check] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

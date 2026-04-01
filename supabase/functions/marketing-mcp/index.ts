import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...extra }));
}

async function verifyWorkspaceMember(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  workspaceId: string,
  isSuperAdmin: boolean
): Promise<boolean> {
  if (isSuperAdmin) return true;
  const { data } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

function redactProvider(p: Record<string, unknown>) {
  const { encrypted_credentials_json: _, ...safe } = p;
  return { ...safe, has_credentials: !!_ && JSON.stringify(_) !== "{}" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const isSuperAdmin =
      user.app_metadata?.is_super_admin === true ||
      user.user_metadata?.is_super_admin === true;

    const body = await req.json();
    const { action, workspace_id } = body;

    if (!action) return json({ error: "Missing action" }, 400);
    if (!workspace_id && action !== "health_check_internal") {
      return json({ error: "Missing workspace_id" }, 400);
    }

    if (workspace_id) {
      const hasAccess = await verifyWorkspaceMember(supabase, user.id, workspace_id, isSuperAdmin);
      if (!hasAccess) return json({ error: "Forbidden" }, 403);
    }

    // ========================
    // PROVIDER CRUD
    // ========================

    if (action === "list_providers") {
      const { data, error } = await supabase
        .from("marketing_mcp_providers")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ providers: (data || []).map(redactProvider) });
    }

    if (action === "create_provider") {
      const { provider_key, provider_name, provider_type, server_url, auth_type, credentials, metadata_json } = body;
      if (!provider_key || !provider_name || !server_url) {
        return json({ error: "Missing required fields: provider_key, provider_name, server_url" }, 400);
      }
      if (provider_key.length > 50 || provider_name.length > 200 || server_url.length > 2000) {
        return json({ error: "Field length exceeded" }, 400);
      }

      const { data, error } = await supabase
        .from("marketing_mcp_providers")
        .insert({
          workspace_id,
          provider_key,
          provider_name,
          provider_type: provider_type || "mcp",
          server_url,
          auth_type: auth_type || "bearer",
          encrypted_credentials_json: credentials ? { token: credentials } : {},
          metadata_json: metadata_json || {},
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") return json({ error: "Provider key already exists in this workspace" }, 409);
        return json({ error: error.message }, 500);
      }

      log("marketing_mcp_provider_created", { workspace_id, provider_id: data.id, provider_key });
      return json({ provider: redactProvider(data) }, 201);
    }

    if (action === "update_provider") {
      const { provider_id, provider_name, server_url, auth_type, credentials, is_default_for_pages, is_default_for_funnels, metadata_json } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);

      const updates: Record<string, unknown> = {};
      if (provider_name !== undefined) updates.provider_name = provider_name;
      if (server_url !== undefined) updates.server_url = server_url;
      if (auth_type !== undefined) updates.auth_type = auth_type;
      if (credentials !== undefined) updates.encrypted_credentials_json = { token: credentials };
      if (is_default_for_pages !== undefined) updates.is_default_for_pages = is_default_for_pages;
      if (is_default_for_funnels !== undefined) updates.is_default_for_funnels = is_default_for_funnels;
      if (metadata_json !== undefined) updates.metadata_json = metadata_json;

      const { data, error } = await supabase
        .from("marketing_mcp_providers")
        .update(updates)
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      log("marketing_mcp_provider_updated", { workspace_id, provider_id });
      return json({ provider: redactProvider(data) });
    }

    if (action === "delete_provider") {
      const { provider_id } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);

      const { error } = await supabase
        .from("marketing_mcp_providers")
        .delete()
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id);

      if (error) return json({ error: error.message }, 500);
      log("marketing_mcp_provider_deleted", { workspace_id, provider_id });
      return json({ success: true });
    }

    if (action === "enable_provider" || action === "disable_provider") {
      const { provider_id } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);
      const enabled = action === "enable_provider";

      const { data, error } = await supabase
        .from("marketing_mcp_providers")
        .update({ is_enabled: enabled })
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      log(enabled ? "marketing_mcp_provider_enabled" : "marketing_mcp_provider_disabled", { workspace_id, provider_id });
      return json({ provider: redactProvider(data) });
    }

    // ========================
    // CONNECTION TEST
    // ========================

    if (action === "test_connection") {
      const { provider_id } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);

      log("marketing_mcp_provider_test_started", { workspace_id, provider_id });

      const { data: provider, error: fetchErr } = await supabase
        .from("marketing_mcp_providers")
        .select("*")
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (fetchErr || !provider) return json({ error: "Provider not found" }, 404);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        };

        const creds = provider.encrypted_credentials_json as Record<string, string> | null;
        if (creds?.token && provider.auth_type === "bearer") {
          headers["Authorization"] = `Bearer ${creds.token}`;
        } else if (creds?.token && provider.auth_type === "api_key") {
          headers["X-API-Key"] = creds.token;
        }

        const mcpPayload = {
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "FastCRM", version: "1.0.0" },
          },
          id: 1,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const resp = await fetch(provider.server_url, {
          method: "POST",
          headers,
          body: JSON.stringify(mcpPayload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "Unknown error");
          throw new Error(`HTTP ${resp.status}: ${errText.substring(0, 500)}`);
        }

        const result = await resp.json();
        log("marketing_mcp_provider_test_succeeded", { workspace_id, provider_id });

        return json({
          success: true,
          server_info: result?.result?.serverInfo || null,
          protocol_version: result?.result?.protocolVersion || null,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log("marketing_mcp_provider_test_failed", { workspace_id, provider_id, error: errMsg });
        return json({ success: false, error: errMsg });
      }
    }

    // ========================
    // HEALTH CHECK
    // ========================

    if (action === "health_check") {
      const { provider_id } = body;
      if (!provider_id) return json({ error: "Missing provider_id" }, 400);

      log("marketing_mcp_health_check_started", { workspace_id, provider_id });

      const { data: provider, error: fetchErr } = await supabase
        .from("marketing_mcp_providers")
        .select("*")
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id)
        .single();

      if (fetchErr || !provider) return json({ error: "Provider not found" }, 404);

      let status = "error";
      let lastError: string | null = null;

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        };

        const creds = provider.encrypted_credentials_json as Record<string, string> | null;
        if (creds?.token && provider.auth_type === "bearer") {
          headers["Authorization"] = `Bearer ${creds.token}`;
        } else if (creds?.token && provider.auth_type === "api_key") {
          headers["X-API-Key"] = creds.token;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const resp = await fetch(provider.server_url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "FastCRM", version: "1.0.0" },
            },
            id: 1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (resp.ok) {
          status = "connected";
          log("marketing_mcp_health_check_succeeded", { workspace_id, provider_id });
        } else {
          lastError = `HTTP ${resp.status}`;
          log("marketing_mcp_health_check_failed", { workspace_id, provider_id, error: lastError });
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        log("marketing_mcp_health_check_failed", { workspace_id, provider_id, error: lastError });
      }

      await supabase
        .from("marketing_mcp_providers")
        .update({
          connection_status: status,
          last_health_check_at: new Date().toISOString(),
          last_error: lastError,
        })
        .eq("id", provider_id)
        .eq("workspace_id", workspace_id);

      return json({ status, last_error: lastError });
    }

    // ========================
    // WORKFLOW BINDINGS
    // ========================

    if (action === "list_bindings") {
      const { data, error } = await supabase
        .from("marketing_mcp_workflow_bindings")
        .select("*, provider:marketing_mcp_providers(id, provider_name, provider_key, is_enabled)")
        .eq("workspace_id", workspace_id);
      if (error) return json({ error: error.message }, 500);
      return json({ bindings: data || [] });
    }

    if (action === "upsert_binding") {
      const { workflow_type, provider_id } = body;
      if (!workflow_type || !provider_id) {
        return json({ error: "Missing workflow_type or provider_id" }, 400);
      }
      const validTypes = ["landing_page", "funnel", "website", "campaign", "section_library"];
      if (!validTypes.includes(workflow_type)) {
        return json({ error: `Invalid workflow_type. Must be one of: ${validTypes.join(", ")}` }, 400);
      }

      const { data, error } = await supabase
        .from("marketing_mcp_workflow_bindings")
        .upsert(
          { workspace_id, workflow_type, provider_id },
          { onConflict: "workspace_id,workflow_type" }
        )
        .select("*, provider:marketing_mcp_providers(id, provider_name, provider_key, is_enabled)")
        .single();

      if (error) return json({ error: error.message }, 500);
      log("marketing_mcp_workflow_binding_updated", { workspace_id, workflow_type, provider_id });
      return json({ binding: data });
    }

    if (action === "delete_binding") {
      const { binding_id } = body;
      if (!binding_id) return json({ error: "Missing binding_id" }, 400);

      const { error } = await supabase
        .from("marketing_mcp_workflow_bindings")
        .delete()
        .eq("id", binding_id)
        .eq("workspace_id", workspace_id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("marketing-mcp error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

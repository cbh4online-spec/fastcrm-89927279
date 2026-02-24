import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing X-Workspace-Id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, module_slug } = await req.json();

    if (!action || !module_slug) {
      return new Response(JSON.stringify({ error: "Missing action or module_slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch module with manifest
    const { data: module, error: moduleError } = await supabase
      .from("marketplace_modules")
      .select("id, slug, name, manifest_json")
      .eq("slug", module_slug)
      .eq("status", "active")
      .single();

    if (moduleError || !module) {
      return new Response(JSON.stringify({ error: "Module not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const manifest = (module.manifest_json as Record<string, unknown>) || {};
    const featureFlags = (manifest.feature_flags as string[]) || [];

    if (action === "enable") {
      // Upsert workspace_modules
      const { data: existing } = await supabase
        .from("workspace_modules")
        .select("id, status")
        .eq("workspace_id", workspaceId)
        .eq("module_id", module.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === "active" || existing.status === "trial") {
          return new Response(
            JSON.stringify({ success: true, message: "Already enabled", manifest }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Reactivate
        await supabase
          .from("workspace_modules")
          .update({
            status: "active",
            cancel_at_period_end: false,
            current_period_start: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("workspace_modules").insert({
          workspace_id: workspaceId,
          module_id: module.id,
          status: "active",
          subscribed_by: userId,
          current_period_start: new Date().toISOString(),
        });
      }

      // Enable feature flags
      for (const flag of featureFlags) {
        const { data: existingFlag } = await supabase
          .from("workspace_feature_flags")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("flag_key", flag)
          .maybeSingle();

        if (existingFlag) {
          await supabase
            .from("workspace_feature_flags")
            .update({ enabled: true })
            .eq("id", existingFlag.id);
        } else {
          await supabase.from("workspace_feature_flags").insert({
            workspace_id: workspaceId,
            flag_key: flag,
            enabled: true,
          });
        }
      }

      // Audit log
      await supabase.from("extension_audit_logs").insert({
        workspace_id: workspaceId,
        extension_key: module_slug,
        action: "enable",
        user_id: userId,
        metadata: { module_id: module.id, module_name: module.name },
      });

      return new Response(
        JSON.stringify({ success: true, action: "enabled", manifest }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "disable") {
      // Set canceled
      await supabase
        .from("workspace_modules")
        .update({ status: "canceled", cancel_at_period_end: true })
        .eq("workspace_id", workspaceId)
        .eq("module_id", module.id);

      // Disable feature flags
      for (const flag of featureFlags) {
        await supabase
          .from("workspace_feature_flags")
          .update({ enabled: false })
          .eq("workspace_id", workspaceId)
          .eq("flag_key", flag);
      }

      // Audit log
      await supabase.from("extension_audit_logs").insert({
        workspace_id: workspaceId,
        extension_key: module_slug,
        action: "disable",
        user_id: userId,
        metadata: { module_id: module.id, module_name: module.name },
      });

      return new Response(
        JSON.stringify({ success: true, action: "disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'enable' or 'disable'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Extension provisioner error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

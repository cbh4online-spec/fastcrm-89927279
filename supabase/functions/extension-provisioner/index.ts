import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id",
};

interface ManifestObjectDef {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface ManifestFieldDef {
  object_type: string;
  key: string;
  type: string;
  label: string;
}

interface ManifestViewDef {
  object_type: string;
  name: string;
  filter: Record<string, unknown>;
}

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

    // Service client for admin operations on core_object_types
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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
    const manifestObjects = (manifest.objects as ManifestObjectDef[]) || [];
    const manifestFields = (manifest.fields as ManifestFieldDef[]) || [];
    const manifestViews = (manifest.views as ManifestViewDef[]) || [];

    if (action === "enable") {
      // --- Upsert workspace_modules ---
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

      // --- Enable feature flags ---
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

      // --- Provision manifest objects into core_object_types ---
      for (const obj of manifestObjects) {
        const { data: existingObj, error: objQueryErr } = await serviceClient
          .from("core_object_types")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("slug", obj.type)
          .maybeSingle();

        if (objQueryErr) {
          console.error(`[provisioner] Error querying core_object_types for slug=${obj.type}:`, objQueryErr);
          continue;
        }

        if (existingObj) {
          const { error: objUpdateErr } = await serviceClient
            .from("core_object_types")
            .update({ is_active: true, source_module: module_slug })
            .eq("id", existingObj.id);
          if (objUpdateErr) console.error(`[provisioner] Error updating core_object_types id=${existingObj.id}:`, objUpdateErr);
        } else {
          const { error: objInsertErr } = await serviceClient.from("core_object_types").insert({
            workspace_id: workspaceId,
            slug: obj.type,
            name: obj.label,
            icon: obj.icon,
            color: obj.color,
            description: obj.description,
            source_module: module_slug,
            is_active: true,
          });
          if (objInsertErr) console.error(`[provisioner] Error inserting core_object_types slug=${obj.type}:`, objInsertErr);
        }
      }

      // --- Provision manifest fields into core_object_fields ---
      for (const field of manifestFields) {
        const { data: objType, error: objLookupErr } = await serviceClient
          .from("core_object_types")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("slug", field.object_type)
          .maybeSingle();

        if (objLookupErr) {
          console.error(`[provisioner] Error looking up object type slug=${field.object_type}:`, objLookupErr);
          continue;
        }

        if (objType) {
          const { data: existingField, error: fieldQueryErr } = await serviceClient
            .from("core_object_fields")
            .select("id")
            .eq("object_id", objType.id)
            .eq("slug", field.key)
            .maybeSingle();

          if (fieldQueryErr) {
            console.error(`[provisioner] Error querying core_object_fields slug=${field.key}:`, fieldQueryErr);
            continue;
          }

          if (!existingField) {
            const { error: fieldInsertErr } = await serviceClient.from("core_object_fields").insert({
              object_id: objType.id,
              slug: field.key,
              field_type: field.type,
              name: field.label,
              workspace_id: workspaceId,
            });
            if (fieldInsertErr) console.error(`[provisioner] Error inserting core_object_fields slug=${field.key}:`, fieldInsertErr);
          }
        }
      }

      // --- Provision manifest views into core_object_views ---
      for (const view of manifestViews) {
        const { data: objType, error: objLookupErr } = await serviceClient
          .from("core_object_types")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("slug", view.object_type)
          .maybeSingle();

        if (objLookupErr) {
          console.error(`[provisioner] Error looking up object type for view slug=${view.object_type}:`, objLookupErr);
          continue;
        }

        if (objType) {
          const { data: existingView, error: viewQueryErr } = await serviceClient
            .from("core_object_views")
            .select("id")
            .eq("object_id", objType.id)
            .eq("name", view.name)
            .maybeSingle();

          if (viewQueryErr) {
            console.error(`[provisioner] Error querying core_object_views name=${view.name}:`, viewQueryErr);
            continue;
          }

          if (!existingView) {
            const { error: viewInsertErr } = await serviceClient.from("core_object_views").insert({
              object_id: objType.id,
              name: view.name,
              filters: view.filter,
              workspace_id: workspaceId,
            });
            if (viewInsertErr) console.error(`[provisioner] Error inserting core_object_views name=${view.name}:`, viewInsertErr);
          }
        }
      }

      // --- Audit log ---
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
      // --- Set workspace_modules to canceled ---
      await supabase
        .from("workspace_modules")
        .update({ status: "canceled", cancel_at_period_end: true })
        .eq("workspace_id", workspaceId)
        .eq("module_id", module.id);

      // --- Disable feature flags ---
      for (const flag of featureFlags) {
        await supabase
          .from("workspace_feature_flags")
          .update({ enabled: false })
          .eq("workspace_id", workspaceId)
          .eq("flag_key", flag);
      }

      // --- Soft-disable extension objects (preserve data) ---
      if (manifestObjects.length > 0) {
        const objectSlugs = manifestObjects.map((o) => o.type);
        const { error: disableErr } = await serviceClient
          .from("core_object_types")
          .update({ is_active: false })
          .eq("workspace_id", workspaceId)
          .eq("source_module", module_slug)
          .in("slug", objectSlugs);
        if (disableErr) console.error(`[provisioner] Error disabling objects:`, disableErr);
      }

      // --- Audit log ---
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


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DisconnectEmailRequest {
  connectionId: string;
  workspaceId: string;
  deleteData?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: DisconnectEmailRequest = await req.json();
    const { connectionId, workspaceId, deleteData = false } = body;

    // Verify user is admin/owner of workspace
    const { data: member } = await supabaseClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Permission denied");
    }

    // Get connection info for logging
    const { data: connection } = await supabaseClient
      .from("email_connections")
      .select("email_address")
      .eq("id", connectionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (!connection) {
      throw new Error("Email connection not found");
    }

    if (deleteData) {
      // Delete the connection entirely (cascade will handle related data)
      const { error: deleteError } = await supabaseClient
        .from("email_connections")
        .delete()
        .eq("id", connectionId)
        .eq("workspace_id", workspaceId);

      if (deleteError) {
        throw new Error("Failed to delete email connection");
      }
    } else {
      // Just deactivate - keep data but stop syncing
      const { error: updateError } = await supabaseClient
        .from("email_connections")
        .update({
          is_active: false,
          // Clear sensitive data
          encrypted_app_password: null,
          oauth_access_token: null,
          oauth_refresh_token: null,
        })
        .eq("id", connectionId)
        .eq("workspace_id", workspaceId);

      if (updateError) {
        throw new Error("Failed to disconnect email");
      }
    }

    // Log the disconnection
    await supabaseClient
      .from("crm_activities")
      .insert({
        workspace_id: workspaceId,
        entity_type: "workspace",
        entity_id: workspaceId,
        activity_type: "email_disconnected",
        title: `Email desconectado: ${connection.email_address}`,
        description: deleteData ? "Conexão e dados removidos" : "Conexão desativada",
        performed_by: user.id,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: deleteData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Email disconnect error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

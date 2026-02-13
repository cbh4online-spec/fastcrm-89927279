import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadRequest {
  workspace_id: string;
  name: string;
  email: string;
  phone?: string;
  source?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, name, email, phone, source }: LeadRequest = await req.json();

    if (!workspace_id || !name || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify workspace exists
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("id", workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(
        JSON.stringify({ error: "Invalid workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workspace owner to use as created_by
    const { data: ownerMember, error: ownerError } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("role", "owner")
      .single();

    if (ownerError || !ownerMember) {
      return new Response(
        JSON.stringify({ error: "Workspace configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .insert({
        workspace_id,
        name,
        email,
        phone: phone || null,
        source: source || "Landing Page",
        status: "new",
        created_by: ownerMember.user_id,
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to create lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, lead_id: lead.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Public lead creation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

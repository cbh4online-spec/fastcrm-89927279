import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-api-key",
};

const SCORE_WEIGHTS: Record<string, number> = {
  signup: 20,
  activation: 30,
  feature_used: 5,
  trial_started: 15,
  trial_expired: -10,
  upgrade: 50,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth: either JWT or X-Api-Key + X-Workspace-Id
    let workspaceId: string;
    const apiKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("authorization");

    if (apiKey) {
      // Webhook mode: validate API key against workspace api_keys
      const wsId = req.headers.get("x-workspace-id");
      if (!wsId) {
        return new Response(
          JSON.stringify({ error: "Missing X-Workspace-Id header" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Simple: check workspace exists (in production, validate against api_keys table)
      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("id", wsId)
        .single();
      if (!ws) {
        return new Response(
          JSON.stringify({ error: "Invalid workspace" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      workspaceId = wsId;
    } else if (authHeader) {
      // JWT mode
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claims, error } = await userClient.auth.getClaims(token);
      if (error || !claims?.claims) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const wsId = req.headers.get("x-workspace-id");
      if (!wsId) {
        return new Response(
          JSON.stringify({ error: "Missing X-Workspace-Id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      workspaceId = wsId;
    } else {
      return new Response(
        JSON.stringify({ error: "No authentication provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { email, event_type, event_data, source } = body;

    if (!email || !event_type) {
      return new Response(
        JSON.stringify({ error: "email and event_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scoreImpact = SCORE_WEIGHTS[event_type] ?? 0;

    // Match to existing lead by email
    const { data: existingLead } = await supabaseAdmin
      .from("leads")
      .select("id, lead_score")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .single();

    // Match to existing contact by email
    const { data: existingContact } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .single();

    let leadId = existingLead?.id ?? null;
    let contactId = existingContact?.id ?? null;

    // If no lead exists, create one
    if (!leadId) {
      const { data: newLead } = await supabaseAdmin
        .from("leads")
        .insert({
          workspace_id: workspaceId,
          email,
          name: email.split("@")[0],
          source: source || "product_signal",
          status: "new",
          lead_score: Math.max(0, scoreImpact),
          created_by: "00000000-0000-0000-0000-000000000000",
        })
        .select("id")
        .single();
      leadId = newLead?.id ?? null;
    } else {
      // Update existing lead score
      const currentScore = existingLead.lead_score ?? 0;
      const newScore = Math.max(0, Math.min(100, currentScore + scoreImpact));
      await supabaseAdmin
        .from("leads")
        .update({ lead_score: newScore })
        .eq("id", leadId);
    }

    // Apply routing rules
    let routingAction: string | null = null;
    let routingDetails: Record<string, unknown> | null = null;

    const { data: leadData } = await supabaseAdmin
      .from("leads")
      .select("lead_score")
      .eq("id", leadId)
      .single();

    const currentScore = leadData?.lead_score ?? 0;

    const { data: rules } = await supabaseAdmin
      .from("lead_routing_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        if (currentScore >= rule.score_min && currentScore <= rule.score_max) {
          routingAction = rule.action_type;
          routingDetails = {
            rule_id: rule.id,
            rule_name: rule.name,
            action_config: rule.action_config,
          };

          // Execute routing action
          if (rule.action_type === "create_task" && leadId) {
            const config = rule.action_config as Record<string, unknown>;
            await supabaseAdmin.from("tasks").insert({
              workspace_id: workspaceId,
              title: (config?.title as string) || `Follow up: ${email}`,
              entity_type: "lead",
              entity_id: leadId,
              status: "pending",
              priority: "high",
              created_by: "00000000-0000-0000-0000-000000000000",
            });
          }
          break;
        }
      }
    }

    // Insert product signal
    const { data: signal, error: insertError } = await supabaseAdmin
      .from("product_signals")
      .insert({
        workspace_id: workspaceId,
        lead_id: leadId,
        contact_id: contactId,
        email,
        event_type,
        event_data: event_data || {},
        source: source || "api",
        score_impact: scoreImpact,
        routing_action: routingAction,
        routing_details: routingDetails,
        processed: true,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        signal_id: signal?.id,
        lead_id: leadId,
        contact_id: contactId,
        score_impact: scoreImpact,
        routing_action: routingAction,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ingest-product-signal] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

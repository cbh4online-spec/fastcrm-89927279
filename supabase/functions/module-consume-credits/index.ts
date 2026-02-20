import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MODULE-CONSUME-CREDITS] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    logStep("User authenticated", { userId: user.id });

    const { 
      workspaceId, 
      moduleId, 
      actionKey,
      entityType,
      entityId,
      metadata 
    } = await req.json();

    if (!workspaceId || !moduleId || !actionKey) {
      throw new Error("Missing required parameters: workspaceId, moduleId, actionKey");
    }

    logStep("Consuming credits", { workspaceId, moduleId, actionKey });

    // Call the database function
    const { data, error } = await supabase.rpc('consume_module_credits', {
      p_workspace_id: workspaceId,
      p_module_id: moduleId,
      p_action_key: actionKey,
      p_user_id: user.id,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_metadata: metadata || {}
    });

    if (error) {
      logStep("Error consuming credits", { error: error.message });
      throw error;
    }

    const result = data?.[0] || { success: false, credits_consumed: 0, credits_remaining: 0, message: 'Unknown error' };

    logStep("Credits consumption result", result);

    return new Response(JSON.stringify({
      success: result.success,
      creditsConsumed: result.credits_consumed,
      creditsRemaining: result.credits_remaining,
      message: result.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

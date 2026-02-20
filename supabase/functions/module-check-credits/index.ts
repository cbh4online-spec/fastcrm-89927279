import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MODULE-CHECK-CREDITS] ${step}${detailsStr}`);
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

    const { workspaceId, moduleId, actionKey } = await req.json();

    if (!workspaceId || !moduleId || !actionKey) {
      throw new Error("Missing required parameters: workspaceId, moduleId, actionKey");
    }

    logStep("Checking credits", { workspaceId, moduleId, actionKey });

    // Call the database function
    const { data, error } = await supabase.rpc('check_module_credits', {
      p_workspace_id: workspaceId,
      p_module_id: moduleId,
      p_action_key: actionKey
    });

    if (error) {
      logStep("Error checking credits", { error: error.message });
      throw error;
    }

    const result = data?.[0] || { can_execute: false, credits_required: 0, credits_available: 0, message: 'Unknown error' };

    logStep("Credits check result", result);

    return new Response(JSON.stringify({
      canExecute: result.can_execute,
      creditsRequired: result.credits_required,
      creditsAvailable: result.credits_available,
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

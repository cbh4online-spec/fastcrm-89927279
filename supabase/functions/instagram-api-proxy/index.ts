import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INSTAGRAM-API-PROXY] ${step}${detailsStr}`);
};

// RapidAPI Instagram Looter2 endpoints
const RAPIDAPI_HOST = "instagram-looter2.p.rapidapi.com";
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}`;

interface RequestBody {
  action: "search" | "profile" | "media" | "hashtag" | "location" | "location_info" | "explore" | "user_posts";
  params: Record<string, string>;
  workspaceId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { action, params, workspaceId }: RequestBody = await req.json();
    if (!action || !workspaceId) {
      throw new Error("Missing required parameters: action, workspaceId");
    }

    // Verify workspace is metodopare
    const { data: workspace, error: wsError } = await supabaseClient
      .from("workspaces")
      .select("id, slug")
      .eq("id", workspaceId)
      .single();

    if (wsError || !workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.slug !== "metodopare") {
      throw new Error("Instagram Looter is only available for metodopare workspace");
    }

    // Check user is member of metodopare
    const { data: membership } = await supabaseClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    // Check if super admin
    const { data: superAdminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (!membership && !superAdminRole) {
      throw new Error("User is not a member of metodopare workspace");
    }

    logStep("Workspace verified", { slug: workspace.slug });

    // Check daily usage limit
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabaseClient
      .from("ig_looter_usage")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .single();

    const { data: config } = await supabaseClient
      .from("ig_looter_config")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    const dailyLimit = config?.daily_action_limit ?? 200;
    const currentActions = usage?.actions_count ?? 0;

    if (currentActions >= dailyLimit) {
      throw new Error(`Daily action limit reached (${dailyLimit}). Try again tomorrow.`);
    }

    // Get RapidAPI key
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      throw new Error("RapidAPI key not configured");
    }

    // Build endpoint URL based on action
    let endpoint = "";
    let queryParams = new URLSearchParams();

    switch (action) {
      case "search":
        endpoint = "/search";
        if (params.query) queryParams.append("query", params.query);
        break;
      case "profile":
        endpoint = "/web-profile";
        if (params.username) queryParams.append("username", params.username);
        break;
      case "user_posts":
        endpoint = "/posts";
        if (params.username) queryParams.append("username", params.username);
        break;
      case "media":
        endpoint = "/media";
        if (params.code) queryParams.append("shortcode", params.code);
        break;
      case "hashtag":
        endpoint = "/search";
        if (params.hashtag) queryParams.append("query", params.hashtag.replace("#", ""));
        queryParams.append("select", "hashtags");
        break;
      case "location":
        endpoint = "/search";
        if (params.query) queryParams.append("query", params.query);
        queryParams.append("select", "places");
        break;
      case "location_info":
        endpoint = "/location-info";
        if (params.id) queryParams.append("id", params.id);
        break;
      case "explore":
        endpoint = "/search";
        if (params.query) queryParams.append("query", params.query);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const url = `${RAPIDAPI_BASE_URL}${endpoint}?${queryParams.toString()}`;
    logStep("Making API request", { action, url });

    // Make request to RapidAPI with retry logic for transient errors
    let apiResponse: Response | null = null;
    let lastError = "";
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      apiResponse = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      });
      
      if (apiResponse.ok) break;
      
      const errorText = await apiResponse.text();
      lastError = errorText;
      logStep(`API error (attempt ${attempt})`, { status: apiResponse.status, error: errorText });
      
      // Only retry on 5xx errors (server-side issues)
      if (apiResponse.status >= 500 && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        continue;
      }
      break;
    }

    if (!apiResponse || !apiResponse.ok) {
      const status = apiResponse?.status || 500;
      if (status >= 500) {
        throw new Error("API Instagram temporariamente indisponível. Tente novamente em alguns segundos.");
      }
      throw new Error(`Instagram API error: ${status}`);
    }

    const apiData = await apiResponse.json();
    logStep("API response received", { hasData: !!apiData });

    // Update usage counter
    await supabaseClient
      .from("ig_looter_usage")
      .upsert({
        workspace_id: workspaceId,
        user_id: user.id,
        usage_date: today,
        actions_count: currentActions + 1,
        searches_count: (usage?.searches_count ?? 0) + (["search", "hashtag", "location", "explore"].includes(action) ? 1 : 0),
        profiles_viewed: (usage?.profiles_viewed ?? 0) + (action === "profile" ? 1 : 0),
      }, {
        onConflict: "workspace_id,user_id,usage_date"
      });

    // Log search if applicable
    if (["search", "hashtag", "location", "explore"].includes(action)) {
      await supabaseClient
        .from("ig_searches")
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          search_type: action === "search" ? "global" : action,
          query: params.query || params.hashtag || "",
          filters: params,
          results_count: Array.isArray(apiData?.data?.items) ? apiData.data.items.length : 0,
          status: "completed",
        });
    }

    return new Response(JSON.stringify({
      success: true,
      data: apiData,
      usage: {
        actions_today: currentActions + 1,
        limit: dailyLimit,
        remaining: dailyLimit - currentActions - 1,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

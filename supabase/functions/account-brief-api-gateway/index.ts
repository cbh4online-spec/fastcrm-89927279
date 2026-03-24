import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const { action, workspaceId, ...params } = await req.json();

    if (!workspaceId || !action) {
      return new Response(JSON.stringify({ error: "Missing action or workspaceId" }), { status: 400, headers: corsHeaders });
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    let result: unknown;

    switch (action) {
      case "get_account": {
        const { data } = await supabase
          .from("account_brief_accounts")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("id", params.accountId)
          .maybeSingle();
        result = data;
        break;
      }

      case "list_accounts": {
        const { data } = await supabase
          .from("account_brief_accounts")
          .select("id, name, domain, total_score, score_label, favorite, commercial_status, last_analysis_at")
          .eq("workspace_id", workspaceId)
          .is("archived_at", null)
          .order("total_score", { ascending: false })
          .limit(params.limit || 100);
        result = data;
        break;
      }

      case "get_brief": {
        const { data } = await supabase
          .from("account_brief_briefs")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("account_id", params.accountId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        result = data;
        break;
      }

      case "get_score": {
        const { data } = await supabase
          .from("account_brief_scores")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("account_id", params.accountId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        result = data;
        break;
      }

      case "get_changes": {
        const { data } = await supabase
          .from("account_brief_change_alerts")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("account_id", params.accountId)
          .order("created_at", { ascending: false })
          .limit(params.limit || 20);
        result = data;
        break;
      }

      case "get_segments": {
        const { data } = await supabase
          .from("account_brief_segments")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false });
        result = data;
        break;
      }

      case "get_kpis": {
        const { data } = await supabase
          .from("account_brief_kpi_snapshots")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("snapshot_date", { ascending: false })
          .limit(50);
        result = data;
        break;
      }

      case "get_usage": {
        const { data } = await supabase
          .from("account_brief_usage_counters")
          .select("*")
          .eq("workspace_id", workspaceId);
        result = data;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { workspace_id, account_id, job_type, priority = 5 } = body;

    if (!workspace_id || !account_id || !job_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check quota
    const period = new Date().toISOString().slice(0, 7);
    const metricKey = job_type === "initial_analysis" ? "initial_analyses_month" : "reanalyses_month";

    const { data: counter } = await supabase
      .from("account_brief_usage_counters")
      .select("units_used, units_limit")
      .eq("workspace_id", workspace_id)
      .eq("period_key", period)
      .eq("metric_key", metricKey)
      .maybeSingle();

    if (counter && counter.units_limit > 0 && counter.units_limit < 99999 && counter.units_used >= counter.units_limit) {
      return new Response(JSON.stringify({
        error: "Limite atingido",
        error_code: "QUOTA_EXCEEDED",
        metric_key: metricKey,
        units_used: counter.units_used,
        units_limit: counter.units_limit,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check parallelism limits (max 3 running per workspace)
    const { count: runningCount } = await supabase
      .from("account_brief_job_queue")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("status", "running");

    const effectivePriority = (runningCount || 0) >= 3 ? Math.max(priority, 3) : priority;

    const correlationId = crypto.randomUUID();
    const { data: job, error: insertErr } = await supabase
      .from("account_brief_job_queue")
      .insert({
        workspace_id,
        account_id,
        job_type,
        priority: effectivePriority,
        status: "queued",
        correlation_id: correlationId,
        timeout_ms: 120000,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Record usage event
    await supabase.from("account_brief_usage_events").insert({
      workspace_id,
      account_id,
      event_type: "job_enqueued",
      metric_key: metricKey,
      units_consumed: 1,
      source_action: job_type,
    });

    // Upsert counter
    await supabase.from("account_brief_usage_counters").upsert({
      workspace_id,
      period_key: period,
      metric_key: metricKey,
      units_used: (counter?.units_used || 0) + 1,
      units_limit: counter?.units_limit || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,period_key,metric_key" });

    return new Response(JSON.stringify({ job, correlation_id: correlationId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

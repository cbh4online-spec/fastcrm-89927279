import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch up to 20 pending/retry jobs
    const { data: jobs, error: fetchErr } = await supabase
      .from("jobs")
      .select("*")
      .in("status", ["pending", "retry"])
      .lte("run_after", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(20);

    if (fetchErr) throw fetchErr;
    if (!jobs?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let completed = 0;
    let failed = 0;

    for (const job of jobs) {
      // Mark as running
      await supabase.from("jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", job.id);

      try {
        switch (job.type) {
          case "compute_drift": {
            const wid = job.payload_json?.workspace_id ?? job.workspace_id;
            await supabase.functions.invoke("compute-drift", { body: { workspace_id: wid } });
            break;
          }
          case "compute_impact": {
            const p = job.payload_json ?? {};
            await supabase.functions.invoke("compute-impact", { body: p });
            break;
          }
          case "compute_metrics": {
            const wid = job.payload_json?.workspace_id ?? job.workspace_id;
            await supabase.functions.invoke("compute-metrics", { body: { workspace_id: wid } });
            break;
          }
          case "cleanup_alerts": {
            const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
            await supabase
              .from("context_alerts")
              .update({ status: "resolved", updated_at: new Date().toISOString() })
              .eq("workspace_id", job.workspace_id)
              .lt("created_at", cutoff)
              .in("status", ["unread", "read"]);
            break;
          }
          case "create_tasks_from_drift": {
            const wid = job.payload_json?.workspace_id ?? job.workspace_id;
            const { data: driftItems } = await supabase
              .from("context_drift")
              .select("block_id, drift_score, severity, context_blocks(title)")
              .eq("workspace_id", wid)
              .in("severity", ["risk", "critical"]);

            for (const item of driftItems ?? []) {
              const block = item.context_blocks as unknown as { title: string } | null;
              await supabase.from("tasks").insert({
                workspace_id: wid,
                related_type: "context_block",
                related_id: item.block_id,
                title: `Atualizar: ${block?.title ?? "Bloco"}`,
                description: `Drift score: ${item.drift_score}. Severidade: ${item.severity}`,
                status: "open",
                priority: item.severity === "critical" ? "high" : "medium",
              });
            }
            break;
          }
          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        await supabase.from("jobs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", job.id);
        completed++;
      } catch (err) {
        const attempts = (job.attempts ?? 0) + 1;
        const maxAttempts = job.max_attempts ?? 3;
        const newStatus = attempts >= maxAttempts ? "failed" : "retry";
        const runAfter = new Date(Date.now() + 5 * 60000).toISOString();

        await supabase.from("jobs").update({
          status: newStatus,
          attempts,
          last_error: err.message,
          run_after: runAfter,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: jobs.length, completed, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

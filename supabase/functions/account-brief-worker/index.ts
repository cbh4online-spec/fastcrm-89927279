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

    // Pick up next queued job (highest priority first, oldest first)
    const { data: jobs } = await supabase
      .from("account_brief_job_queue")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No jobs to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const job = jobs[0];

    // Check parallelism (max 5 global running)
    const { count: globalRunning } = await supabase
      .from("account_brief_job_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "running");

    if ((globalRunning || 0) >= 5) {
      return new Response(JSON.stringify({ message: "Max parallelism reached, skipping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as running
    await supabase
      .from("account_brief_job_queue")
      .update({ status: "running", started_at: new Date().toISOString(), attempts: job.attempts + 1 })
      .eq("id", job.id);

    // Create steps
    const stepNames = ["discovery", "crawl", "extraction", "scoring"];
    for (const stepName of stepNames) {
      await supabase.from("account_brief_job_steps").insert({
        job_id: job.id,
        step_name: stepName,
        status: "pending",
      });
    }

    let hasError = false;
    let errorSummary = "";

    try {
      // Execute: call the existing analysis function
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

      // Update step: discovery
      await updateStep(supabase, job.id, "discovery", "running");

      const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/account-brief-analyze-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          workspace_id: job.workspace_id,
          account_id: job.account_id,
          correlation_id: job.correlation_id,
        }),
      });

      if (!analyzeRes.ok) {
        const errBody = await analyzeRes.text();
        throw new Error(`Analysis failed: ${errBody}`);
      }

      // Mark all steps as completed
      for (const stepName of stepNames) {
        await updateStep(supabase, job.id, stepName, "completed");
      }
    } catch (stepErr) {
      hasError = true;
      errorSummary = stepErr instanceof Error ? stepErr.message : String(stepErr);

      // Check if we should retry
      if (job.attempts + 1 < job.max_attempts) {
        const backoffMs = Math.min(30000 * Math.pow(2, job.attempts), 300000);
        const retryAt = new Date(Date.now() + backoffMs).toISOString();
        await supabase
          .from("account_brief_job_queue")
          .update({
            status: "retrying",
            error_summary: errorSummary,
            scheduled_at: retryAt,
          })
          .eq("id", job.id);

        // Create notification
        await supabase.from("account_brief_notifications").insert({
          workspace_id: job.workspace_id,
          account_id: job.account_id,
          notification_type: "operacional",
          priority: "medium",
          title: "Análise em retry",
          body: `Tentativa ${job.attempts + 1}/${job.max_attempts}. Próxima em ${Math.round(backoffMs / 1000)}s.`,
          channel: "feed",
          related_run_id: null,
        });

        return new Response(JSON.stringify({ status: "retrying", job_id: job.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Final status
    const finalStatus = hasError ? "failed" : "completed";
    await supabase
      .from("account_brief_job_queue")
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        error_summary: hasError ? errorSummary : null,
      })
      .eq("id", job.id);

    // Create notification for failure
    if (hasError) {
      await supabase.from("account_brief_notifications").insert({
        workspace_id: job.workspace_id,
        account_id: job.account_id,
        notification_type: "técnico",
        priority: "high",
        title: "Análise falhou",
        body: errorSummary.substring(0, 200),
        channel: "feed",
      });
    }

    return new Response(JSON.stringify({ status: finalStatus, job_id: job.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function updateStep(supabase: any, jobId: string, stepName: string, status: string) {
  const update: any = { status };
  if (status === "running") update.started_at = new Date().toISOString();
  if (status === "completed" || status === "failed") update.finished_at = new Date().toISOString();
  await supabase
    .from("account_brief_job_steps")
    .update(update)
    .eq("job_id", jobId)
    .eq("step_name", stepName);
}

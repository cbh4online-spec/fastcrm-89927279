import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId } = await req.json();
    if (!accountId || !workspaceId) {
      return new Response(JSON.stringify({ error: "accountId e workspaceId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get account
    const { data: account, error: accError } = await supabase
      .from("account_brief_accounts")
      .select("id, domain, normalized_domain, name")
      .eq("id", accountId)
      .eq("workspace_id", workspaceId)
      .single();

    if (accError || !account) {
      return new Response(JSON.stringify({ error: "Conta não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    // Create analysis run
    const { data: run, error: runError } = await supabase
      .from("account_brief_analysis_runs")
      .insert({
        workspace_id: workspaceId,
        account_id: accountId,
        trigger_type: "manual",
        status: "processing",
        correlation_id: correlationId,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runError) throw runError;
    const runId = run.id;

    const accountDomain = account.normalized_domain || account.domain;
    if (!accountDomain) {
      await failRun(supabase, runId, "Conta sem domínio — não é possível analisar", startTime);
      return new Response(JSON.stringify({ success: false, error: "Conta sem domínio configurado. Adicione um domínio antes de analisar.", runId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[refresh] Starting full pipeline for ${accountDomain} (run: ${runId})`);

    // Emit Kernel event: analysis_started
    await emitKernelEvent(supabase, workspaceId, "account_brief.analysis_started", accountId, correlationId);

    // Step 1: Discover pages
    const discoverRes = await invokeFunction(supabaseUrl, serviceRoleKey, "account-brief-discover-pages", {
      accountId, workspaceId, domain: accountDomain, runId,
    });

    if (!discoverRes.success) {
      await failRun(supabase, runId, `Discovery failed: ${discoverRes.error}`, startTime);
      await emitKernelEvent(supabase, workspaceId, "account_brief.analysis_failed", accountId, correlationId, { step: "discover", error: discoverRes.error });
      return new Response(JSON.stringify({ success: false, error: discoverRes.error, runId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Crawl site
    const crawlRes = await invokeFunction(supabaseUrl, serviceRoleKey, "account-brief-crawl-site", {
      accountId, workspaceId, runId,
    });

    if (!crawlRes.success || !crawlRes.processed) {
      await failRun(supabase, runId, "Crawl failed or no pages processed", startTime);
      await emitKernelEvent(supabase, workspaceId, "account_brief.analysis_failed", accountId, correlationId, { step: "crawl" });
      return new Response(JSON.stringify({ success: false, error: "Crawl failed", runId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Extract structured data
    const extractRes = await invokeFunction(supabaseUrl, serviceRoleKey, "account-brief-extract-structured", {
      accountId, workspaceId, runId,
    });

    let extractedData = null;
    if (extractRes.success && extractRes.extracted) {
      extractedData = extractRes.extracted;
    } else {
      console.warn("[refresh] Extraction failed, continuing with scoring without AI data");
    }

    // Step 4: Generate brief
    const briefRes = await invokeFunction(supabaseUrl, serviceRoleKey, "account-brief-generate-brief", {
      accountId, workspaceId, extractedData, runId,
    });

    if (!briefRes.success) {
      console.warn("[refresh] Brief generation failed:", briefRes.error);
    }

    // Step 5: Compute score
    const scoreRes = await invokeFunction(supabaseUrl, serviceRoleKey, "account-brief-compute-score", {
      accountId, workspaceId, extractedData, runId,
    });

    const durationMs = Date.now() - startTime;
    const hasFailures = (crawlRes.failed || 0) > 0 || !extractRes.success || !briefRes.success;
    const finalStatus = hasFailures ? "partial" : "completed";

    // Update run
    await supabase.from("account_brief_analysis_runs").update({
      status: finalStatus,
      pages_discovered: discoverRes.discovered || 0,
      pages_processed: crawlRes.processed || 0,
      pages_failed: crawlRes.failed || 0,
      duration_ms: durationMs,
      finished_at: new Date().toISOString(),
      error_summary: hasFailures ? "Some steps completed with warnings" : null,
    }).eq("id", runId);

    // Update account
    await supabase.from("account_brief_accounts").update({
      last_analysis_at: new Date().toISOString(),
      last_analysis_run_id: runId,
      updated_at: new Date().toISOString(),
    }).eq("id", accountId);

    // Step 6: Compute diffs (fire-and-forget)
    invokeFunction(supabaseUrl, serviceRoleKey, "account-brief-diff-runs", {
      accountId, workspaceId, currentRunId: runId,
    }).catch((e) => console.warn("[refresh] Diff computation failed:", e));

    // Emit Kernel event: analysis_completed
    await emitKernelEvent(supabase, workspaceId, "account_brief.analysis_completed", accountId, correlationId, {
      runId, status: finalStatus, score: scoreRes.score || 0, durationMs,
      discovered: discoverRes.discovered || 0, processed: crawlRes.processed || 0,
    });

    // Emit score_updated if score changed
    if (scoreRes.score) {
      await emitKernelEvent(supabase, workspaceId, "account_brief.score_updated", accountId, correlationId, {
        score: scoreRes.score, label: scoreRes.label,
      });
    }

    // Register in system_function_runs for System Health
    await supabase.from("system_function_runs").insert({
      workspace_id: workspaceId,
      module_id: "account-brief",
      function_name: "account-brief-refresh-account",
      status: finalStatus === "completed" ? "success" : "partial",
      duration_ms: durationMs,
      metadata: { accountId, runId, score: scoreRes.score },
    }).then(({ error }) => {
      if (error) console.warn("[refresh] Failed to log system_function_run:", error.message);
    });

    console.log(`[refresh] Pipeline completed: ${finalStatus} in ${durationMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      runId,
      status: finalStatus,
      discovered: discoverRes.discovered || 0,
      processed: crawlRes.processed || 0,
      failed: crawlRes.failed || 0,
      score: scoreRes.score || 0,
      scoreLabel: scoreRes.label || "Baixo",
      durationMs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[refresh] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function failRun(supabase: any, runId: string, error: string, startTime: number) {
  await supabase.from("account_brief_analysis_runs").update({
    status: "failed",
    error_summary: error,
    duration_ms: Date.now() - startTime,
    finished_at: new Date().toISOString(),
  }).eq("id", runId);
}

async function emitKernelEvent(
  supabase: any, workspaceId: string, type: string, entityId: string,
  correlationId: string, payload: Record<string, unknown> = {}
) {
  try {
    await supabase.from("kernel_events").insert({
      workspace_id: workspaceId,
      type,
      entity_kind: "account_brief_account",
      entity_id: entityId,
      actor_type: "system",
      source_module: "account-brief",
      correlation_id: correlationId,
      payload,
      schema_version: 1,
    });
  } catch (err) {
    console.warn(`[kernel] Failed to emit ${type}:`, err);
  }
}

async function invokeFunction(
  supabaseUrl: string, serviceRoleKey: string, functionName: string, body: Record<string, unknown>
): Promise<any> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[refresh] ${functionName} failed: ${response.status} — ${errorText}`);
      return { success: false, error: `${functionName}: ${response.status}` };
    }

    return await response.json();
  } catch (err) {
    console.error(`[refresh] ${functionName} error:`, err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

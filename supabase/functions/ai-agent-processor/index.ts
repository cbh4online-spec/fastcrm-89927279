/**
 * AI Agent Job Processor
 * 
 * Processes pending jobs from the queue:
 * 1. Fetches next pending job by priority
 * 2. Acquires lock
 * 3. Calls appropriate agent
 * 4. Updates job status
 * 5. Releases lock
 */

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_JOBS_PER_RUN = 10;
const LOCK_TTL_SECONDS = 120;

// Backoff delays in milliseconds
const BACKOFF_DELAYS = [
  5 * 60 * 1000,   // 5 minutes
  15 * 60 * 1000,  // 15 minutes
  60 * 60 * 1000,  // 1 hour
];

interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  jobs: Array<{
    jobId: string;
    status: string;
    agentType: string;
    entityId: string;
    error?: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();
  
  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    jobs: [],
  };

  try {
    // Get workspaceId from request if provided (for targeted processing)
    let workspaceFilter: string | null = null;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      workspaceFilter = body.workspaceId || null;
    }

    // Fetch pending jobs ordered by priority and scheduled time
    let query = supabase
      .from("ai_agent_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_for", { ascending: true })
      .limit(MAX_JOBS_PER_RUN);

    if (workspaceFilter) {
      query = query.eq("workspace_id", workspaceFilter);
    }

    const { data: jobs, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching jobs:", fetchError);
      throw new Error("Failed to fetch pending jobs");
    }

    if (!jobs || jobs.length === 0) {
      return jsonResponse({
        message: "No pending jobs",
        ...result,
      });
    }

    console.log(`Processing ${jobs.length} pending jobs`);

    // Process each job
    for (const job of jobs) {
      const jobResult = await processJob(supabase, job);
      result.processed++;
      
      if (jobResult.success) {
        result.succeeded++;
      } else if (jobResult.skipped) {
        result.skipped++;
      } else {
        result.failed++;
      }

      result.jobs.push({
        jobId: job.id,
        status: jobResult.status,
        agentType: job.agent_type,
        entityId: job.entity_id,
        error: jobResult.error || undefined,
      });
    }

    const duration = Date.now() - startTime;
    console.log(`Processed ${result.processed} jobs in ${duration}ms`);

    return jsonResponse({
      message: `Processed ${result.processed} jobs`,
      durationMs: duration,
      ...result,
    });

  } catch (err) {
    console.error("Processor error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({
      error: errorMessage,
      ...result,
    }, 500);
  }
});

async function processJob(
  supabase: any,
  job: any
): Promise<{ success: boolean; skipped: boolean; status: string; error?: string }> {
  const { id: jobId, workspace_id, agent_type, entity_id, entity_type, trigger_type, context, attempts, max_attempts } = job;

  console.log(`Processing job ${jobId}: ${agent_type} for ${entity_type}/${entity_id}`);

  try {
    // Try to acquire lock
    const { data: lockResult, error: lockError } = await supabase.rpc("acquire_agent_lock", {
      p_workspace_id: workspace_id,
      p_entity_id: entity_id,
      p_agent_type: agent_type,
      p_job_id: jobId,
      p_ttl_seconds: LOCK_TTL_SECONDS,
    });

    if (lockError || !lockResult?.acquired) {
      console.log(`Could not acquire lock for job ${jobId}: ${lockResult?.reason || "unknown"}`);
      return { success: false, skipped: true, status: "skipped", error: "Lock not available" };
    }

    // Update job to running
    await supabase
      .from("ai_agent_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        attempts: attempts + 1,
      })
      .eq("id", jobId);

    // Call the orchestrator to execute the agent
    const orchestratorResponse = await fetch(
      `${supabaseUrl}/functions/v1/ai-agent-orchestrator`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          agentType: agent_type,
          entityId: entity_id,
          entityType: entity_type,
          triggerType: trigger_type,
          workspaceId: workspace_id,
          jobId: jobId,
          context,
        }),
      }
    );

    const agentResult = await orchestratorResponse.json();

    if (!orchestratorResponse.ok || !agentResult.success) {
      throw new Error(agentResult.error || "Agent execution failed");
    }

    // Update job to completed
    await supabase
      .from("ai_agent_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        execution_id: agentResult.executionId,
      })
      .eq("id", jobId);

    // Release lock
    await supabase.rpc("release_agent_lock", {
      p_workspace_id: workspace_id,
      p_entity_id: entity_id,
      p_agent_type: agent_type,
    });

    console.log(`Job ${jobId} completed successfully`);
    return { success: true, skipped: false, status: "completed" };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Job ${jobId} failed:`, err);

    // Calculate if should retry
    const newAttempts = attempts + 1;
    const shouldRetry = newAttempts < max_attempts;

    if (shouldRetry) {
      // Schedule retry with backoff
      const backoffDelay = BACKOFF_DELAYS[Math.min(newAttempts - 1, BACKOFF_DELAYS.length - 1)];
      const nextSchedule = new Date(Date.now() + backoffDelay).toISOString();

      await supabase
        .from("ai_agent_jobs")
        .update({
          status: "pending",
          scheduled_for: nextSchedule,
          error_message: errorMessage,
          started_at: null,
        })
        .eq("id", jobId);

      console.log(`Job ${jobId} will retry at ${nextSchedule} (attempt ${newAttempts}/${max_attempts})`);
    } else {
      // Mark as failed permanently
      await supabase
        .from("ai_agent_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq("id", jobId);

      console.log(`Job ${jobId} failed permanently after ${newAttempts} attempts`);
    }

    // Release lock
    try {
      await supabase.rpc("release_agent_lock", {
        p_workspace_id: workspace_id,
        p_entity_id: entity_id,
        p_agent_type: agent_type,
      });
    } catch (e) {
      console.error(`Failed to release lock for job ${jobId}:`, e);
    }

    return {
      success: false,
      skipped: false,
      status: shouldRetry ? "retry_scheduled" : "failed",
      error: errorMessage,
    };
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

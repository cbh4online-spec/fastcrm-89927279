/**
 * AI Agent Lifecycle Manager
 * 
 * Central API for managing agent job lifecycle:
 * - Dispatch new jobs
 * - Acquire/release locks
 * - Check job status
 * - Cancel pending jobs
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DispatchRequest {
  workspaceId: string;
  agentType: string;
  entityId: string;
  entityType: string;
  triggerType: string;
  priority?: number;
  context?: Record<string, unknown>;
  scheduledFor?: string;
}

interface LockRequest {
  workspaceId: string;
  entityId: string;
  agentType: string;
  jobId?: string;
  ttlSeconds?: number;
}

// Priority mapping
const TRIGGER_PRIORITIES: Record<string, number> = {
  manual: 100,
  status_changed: 80,
  entity_created: 60,
  message_received: 40,
  time_based: 20,
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    // Route based on path
    switch (path) {
      case "dispatch":
        return await handleDispatch(req, supabase);
      case "cancel":
        return await handleCancel(req, supabase);
      case "status":
        return await handleStatus(req, supabase, url);
      case "queue":
        return await handleQueue(req, supabase, url);
      case "acquire-lock":
        return await handleAcquireLock(req, supabase);
      case "release-lock":
        return await handleReleaseLock(req, supabase);
      case "rate-limit":
        return await handleRateLimitCheck(req, supabase);
      default:
        return jsonResponse({ error: "Unknown endpoint" }, 404);
    }
  } catch (error) {
    console.error("Lifecycle error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: errorMessage }, 500);
  }
});

/**
 * POST /dispatch - Create a new agent job
 */
async function handleDispatch(req: Request, supabase: any) {
  const body: DispatchRequest = await req.json();
  
  const {
    workspaceId,
    agentType,
    entityId,
    entityType,
    triggerType,
    priority,
    context = {},
    scheduledFor,
  } = body;

  // Validate required fields
  if (!workspaceId || !agentType || !entityId || !entityType || !triggerType) {
    return jsonResponse({ error: "Missing required fields" }, 400);
  }

  // Check if agent is registered and enabled
  const { data: registry, error: regError } = await supabase
    .from("ai_agent_registry")
    .select("*")
    .eq("agent_type", agentType)
    .single();

  if (regError || !registry) {
    return jsonResponse({ error: "Agent type not registered" }, 400);
  }

  if (!registry.is_enabled) {
    return jsonResponse({ error: "Agent is disabled" }, 400);
  }

  // Check rate limits
  const { data: rateLimitCheck } = await supabase.rpc("check_agent_rate_limit", {
    p_workspace_id: workspaceId,
    p_entity_id: entityId,
    p_agent_type: agentType,
  });

  if (rateLimitCheck && !rateLimitCheck.allowed) {
    return jsonResponse({
      error: "Rate limit exceeded",
      ...rateLimitCheck,
    }, 429);
  }

  // Calculate priority
  const jobPriority = priority ?? TRIGGER_PRIORITIES[triggerType] ?? 50;

  // Check for existing pending/running job
  const { data: existingJob } = await supabase
    .from("ai_agent_jobs")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("agent_type", agentType)
    .eq("entity_id", entityId)
    .in("status", ["pending", "running"])
    .maybeSingle();

  if (existingJob) {
    return jsonResponse({
      jobId: existingJob.id,
      status: existingJob.status,
      message: "Job already exists for this entity",
      alreadyExists: true,
    });
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from("ai_agent_jobs")
    .insert({
      workspace_id: workspaceId,
      agent_type: agentType,
      entity_id: entityId,
      entity_type: entityType,
      trigger_type: triggerType,
      priority: jobPriority,
      context,
      scheduled_for: scheduledFor || new Date().toISOString(),
    })
    .select()
    .single();

  if (jobError) {
    console.error("Job creation error:", jobError);
    return jsonResponse({ error: "Failed to create job" }, 500);
  }

  // Get queue position
  const { count } = await supabase
    .from("ai_agent_jobs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .gt("priority", jobPriority);

  return jsonResponse({
    jobId: job.id,
    agentType: job.agent_type,
    entityId: job.entity_id,
    status: job.status,
    scheduledFor: job.scheduled_for,
    attempts: job.attempts,
    queuePosition: (count || 0) + 1,
    estimatedWaitMs: ((count || 0) + 1) * 5000, // Rough estimate
  });
}

/**
 * POST /cancel - Cancel a pending job
 */
async function handleCancel(req: Request, supabase: any) {
  const { jobId } = await req.json();

  if (!jobId) {
    return jsonResponse({ error: "Job ID required" }, 400);
  }

  const { data: job, error } = await supabase
    .from("ai_agent_jobs")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !job) {
    return jsonResponse({ error: "Job not found or cannot be cancelled" }, 404);
  }

  return jsonResponse({
    jobId: job.id,
    status: "cancelled",
    message: "Job cancelled successfully",
  });
}

/**
 * GET /status?jobId=xxx - Get job status
 */
async function handleStatus(req: Request, supabase: any, url: URL) {
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return jsonResponse({ error: "Job ID required" }, 400);
  }

  const { data: job, error } = await supabase
    .from("ai_agent_jobs")
    .select("*, ai_agent_executions(*)")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return jsonResponse({ error: "Job not found" }, 404);
  }

  return jsonResponse({
    jobId: job.id,
    agentType: job.agent_type,
    entityId: job.entity_id,
    status: job.status,
    scheduledFor: job.scheduled_for,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    executionId: job.execution_id,
    errorMessage: job.error_message,
    attempts: job.attempts,
    execution: job.ai_agent_executions,
  });
}

/**
 * GET /queue?workspaceId=xxx - Get pending jobs queue
 */
async function handleQueue(req: Request, supabase: any, url: URL) {
  const workspaceId = url.searchParams.get("workspaceId");
  const entityId = url.searchParams.get("entityId");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  if (!workspaceId) {
    return jsonResponse({ error: "Workspace ID required" }, 400);
  }

  let query = supabase
    .from("ai_agent_jobs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["pending", "running"])
    .order("priority", { ascending: false })
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (entityId) {
    query = query.eq("entity_id", entityId);
  }

  const { data: jobs, error } = await query;

  if (error) {
    return jsonResponse({ error: "Failed to fetch queue" }, 500);
  }

  return jsonResponse({
    jobs: jobs || [],
    total: jobs?.length || 0,
  });
}

/**
 * POST /acquire-lock - Acquire a lock for an entity
 */
async function handleAcquireLock(req: Request, supabase: any) {
  const body: LockRequest = await req.json();
  
  const { workspaceId, entityId, agentType, jobId, ttlSeconds = 60 } = body;

  if (!workspaceId || !entityId || !agentType) {
    return jsonResponse({ error: "Missing required fields" }, 400);
  }

  const { data: result, error } = await supabase.rpc("acquire_agent_lock", {
    p_workspace_id: workspaceId,
    p_entity_id: entityId,
    p_agent_type: agentType,
    p_job_id: jobId || null,
    p_ttl_seconds: ttlSeconds,
  });

  if (error) {
    console.error("Lock acquisition error:", error);
    return jsonResponse({ error: "Failed to acquire lock" }, 500);
  }

  return jsonResponse(result);
}

/**
 * POST /release-lock - Release a lock
 */
async function handleReleaseLock(req: Request, supabase: any) {
  const { workspaceId, entityId, agentType } = await req.json();

  if (!workspaceId || !entityId || !agentType) {
    return jsonResponse({ error: "Missing required fields" }, 400);
  }

  const { data: released, error } = await supabase.rpc("release_agent_lock", {
    p_workspace_id: workspaceId,
    p_entity_id: entityId,
    p_agent_type: agentType,
  });

  if (error) {
    console.error("Lock release error:", error);
    return jsonResponse({ error: "Failed to release lock" }, 500);
  }

  return jsonResponse({
    released,
    message: released ? "Lock released" : "No lock found",
  });
}

/**
 * POST /rate-limit - Check rate limits
 */
async function handleRateLimitCheck(req: Request, supabase: any) {
  const { workspaceId, entityId, agentType } = await req.json();

  if (!workspaceId || !entityId || !agentType) {
    return jsonResponse({ error: "Missing required fields" }, 400);
  }

  const { data: result, error } = await supabase.rpc("check_agent_rate_limit", {
    p_workspace_id: workspaceId,
    p_entity_id: entityId,
    p_agent_type: agentType,
  });

  if (error) {
    console.error("Rate limit check error:", error);
    return jsonResponse({ error: "Failed to check rate limits" }, 500);
  }

  return jsonResponse(result);
}

// Helper function for JSON responses
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

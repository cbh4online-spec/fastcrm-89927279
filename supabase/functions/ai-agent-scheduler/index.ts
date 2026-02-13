/**
 * AI Agent Scheduler
 * 
 * Processes scheduled jobs (cron-based):
 * 1. Evaluates active schedules
 * 2. Identifies entities needing analysis
 * 3. Creates jobs in the queue
 * 4. Respects throttling limits
 */

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_JOBS_PER_WORKSPACE = 20;
const SCHEDULE_PRIORITY = 20;

interface ScheduleResult {
  schedulesProcessed: number;
  jobsCreated: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  
  const result: ScheduleResult = {
    schedulesProcessed: 0,
    jobsCreated: 0,
    errors: [],
  };

  try {
    // Fetch active schedules that are due
    const { data: schedules, error: scheduleError } = await supabase
      .from("ai_agent_schedules")
      .select("*")
      .eq("is_enabled", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`);

    if (scheduleError) {
      throw new Error("Failed to fetch schedules");
    }

    if (!schedules || schedules.length === 0) {
      return jsonResponse({
        message: "No schedules due",
        ...result,
      });
    }

    console.log(`Processing ${schedules.length} schedules`);

    for (const schedule of schedules) {
      try {
        const jobsCreated = await processSchedule(supabase, schedule);
        result.schedulesProcessed++;
        result.jobsCreated += jobsCreated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing schedule ${schedule.id}:`, err);
        result.errors.push(`Schedule ${schedule.name}: ${errorMessage}`);
      }
    }

    // Also trigger the processor to handle any pending jobs
    try {
      await fetch(`${supabaseUrl}/functions/v1/ai-agent-processor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.error("Failed to trigger processor:", e);
    }

    return jsonResponse({
      message: `Processed ${result.schedulesProcessed} schedules, created ${result.jobsCreated} jobs`,
      ...result,
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Scheduler error:", err);
    return jsonResponse({
      error: errorMessage,
      ...result,
    }, 500);
  }
});

async function processSchedule(supabase: any, schedule: any): Promise<number> {
  const {
    id,
    workspace_id,
    agent_type,
    entity_filter,
    max_entities_per_run,
    priority,
  } = schedule;

  console.log(`Processing schedule ${id} for agent ${agent_type}`);

  // Get agent registry to know entity types
  const { data: registry } = await supabase
    .from("ai_agent_registry")
    .select("entity_types")
    .eq("agent_type", agent_type)
    .single();

  if (!registry) {
    throw new Error(`Agent ${agent_type} not registered`);
  }

  let jobsCreated = 0;
  const entityTypes = registry.entity_types;

  for (const entityType of entityTypes) {
    const entities = await getEntitiesForSchedule(
      supabase,
      workspace_id,
      entityType,
      entity_filter,
      max_entities_per_run
    );

    for (const entity of entities) {
      // Check if job already exists
      const { data: existingJob } = await supabase
        .from("ai_agent_jobs")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("agent_type", agent_type)
        .eq("entity_id", entity.id)
        .in("status", ["pending", "running"])
        .maybeSingle();

      if (existingJob) {
        continue; // Skip if job already pending/running
      }

      // Create job
      const { error: insertError } = await supabase
        .from("ai_agent_jobs")
        .insert({
          workspace_id,
          agent_type,
          entity_id: entity.id,
          entity_type: entityType,
          trigger_type: "time_based",
          priority: priority || SCHEDULE_PRIORITY,
          context: { scheduleId: id, scheduleName: schedule.name },
        });

      if (!insertError) {
        jobsCreated++;
      }

      // Respect throttling
      if (jobsCreated >= MAX_JOBS_PER_WORKSPACE) {
        break;
      }
    }

    if (jobsCreated >= MAX_JOBS_PER_WORKSPACE) {
      break;
    }
  }

  // Update schedule next run time
  const nextRun = calculateNextRun(schedule.cron_expression, schedule.timezone);
  await supabase
    .from("ai_agent_schedules")
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRun.toISOString(),
    })
    .eq("id", id);

  console.log(`Schedule ${id} created ${jobsCreated} jobs, next run at ${nextRun}`);
  return jobsCreated;
}

async function getEntitiesForSchedule(
  supabase: any,
  workspaceId: string,
  entityType: string,
  filter: Record<string, any>,
  limit: number
): Promise<Array<{ id: string }>> {
  const tableName = getTableName(entityType);
  if (!tableName) return [];

  let query = supabase
    .from(tableName)
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(limit);

  // Apply common filters
  if (filter.inactiveDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filter.inactiveDays);
    query = query.or(`last_contact_at.is.null,last_contact_at.lt.${cutoff.toISOString()}`);
  }

  if (filter.status) {
    query = query.eq("status", filter.status);
  }

  if (filter.excludeStatuses && Array.isArray(filter.excludeStatuses)) {
    for (const status of filter.excludeStatuses) {
      query = query.neq("status", status);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Error fetching ${entityType}:`, error);
    return [];
  }

  return data || [];
}

function getTableName(entityType: string): string | null {
  const mapping: Record<string, string> = {
    lead: "leads",
    contact: "contacts",
    company: "companies",
    opportunity: "opportunities",
  };
  return mapping[entityType] || null;
}

function calculateNextRun(cronExpression: string, timezone: string): Date {
  // Simple cron parser for common patterns
  // In production, use a proper cron library
  const parts = cronExpression.split(" ");
  
  if (parts.length !== 5) {
    // Default to next day at 9am
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const next = new Date();

  // Handle simple cases
  if (minute !== "*" && hour !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    // Daily at specific time
    next.setHours(parseInt(hour), parseInt(minute), 0, 0);
    if (next <= new Date()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  if (dayOfWeek !== "*" && dayOfWeek !== "0-6") {
    // Weekly on specific day
    const targetDay = parseInt(dayOfWeek);
    const currentDay = next.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    next.setDate(next.getDate() + daysUntil);
    next.setHours(parseInt(hour) || 9, parseInt(minute) || 0, 0, 0);
    return next;
  }

  // Default: next day at configured time
  next.setDate(next.getDate() + 1);
  next.setHours(parseInt(hour) || 9, parseInt(minute) || 0, 0, 0);
  return next;
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

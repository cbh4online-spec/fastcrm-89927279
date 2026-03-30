import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, event_type_filter } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load settings
    const { data: settings } = await supabase
      .from("memory_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const decayDays = settings?.memory_decay_days ?? 90;
    const minConfidence = settings?.min_confidence_threshold ?? 0.3;

    // Get last learning cycle to determine time window
    const { data: lastCycle } = await supabase
      .from("workspace_learning_cycles")
      .select("completed_at")
      .eq("workspace_id", workspace_id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const since = lastCycle?.completed_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Create learning cycle record
    const { data: cycle } = await supabase
      .from("workspace_learning_cycles")
      .insert({
        workspace_id,
        cycle_type: "event_triggered",
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const cycleId = cycle?.id;

    // Collect kernel events since last cycle
    let eventsQuery = supabase
      .from("kernel_events")
      .select("id, type, entity_kind, entity_id, payload, source_module, created_at, event_name")
      .eq("workspace_id", workspace_id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (event_type_filter) {
      eventsQuery = eventsQuery.ilike("type", `${event_type_filter}%`);
    }

    const { data: events } = await eventsQuery;

    if (!events || events.length === 0) {
      // Complete cycle with no results
      if (cycleId) {
        await supabase.from("workspace_learning_cycles").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          summary: "No new events to process",
          memories_created: 0,
          memories_updated: 0,
        }).eq("id", cycleId);
      }
      return new Response(JSON.stringify({ success: true, memories_created: 0, memories_updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group events by type prefix
    const grouped: Record<string, any[]> = {};
    for (const e of events) {
      const prefix = (e.type || "").split(".")[0] || "OTHER";
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push(e);
    }

    // Build summary for AI extraction
    const eventsSummary = Object.entries(grouped).map(([prefix, evts]) => {
      const sample = evts.slice(0, 10).map(e => ({
        type: e.type,
        entity: `${e.entity_kind}:${e.entity_id}`,
        payload: e.payload,
        at: e.created_at,
      }));
      return `## ${prefix} (${evts.length} events)\n${JSON.stringify(sample, null, 1)}`;
    }).join("\n\n");

    // Use Lovable AI to extract patterns
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let extractedPatterns: any[] = [];

    if (LOVABLE_API_KEY) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are an operational intelligence analyst. Analyze workspace events and extract actionable patterns.
Return patterns using the suggest_patterns tool. Each pattern must have:
- memory_type: one of success_pattern, failure_pattern, execution_lesson, routing_lesson, conversion_pattern, recovery_pattern, context_gap_pattern, agent_performance_pattern
- title: short descriptive title (max 80 chars)
- summary: 1-2 sentence explanation of the pattern
- confidence: 0.0-1.0 based on evidence strength
- importance_score: 0-100 based on business impact
- entity_type: the primary entity type involved (task, action, agent, objective, etc.)
- entity_id: if a specific entity is central, otherwise null

Focus on actionable insights, not just event descriptions. Look for:
- Actions that succeeded vs failed and why
- Agent performance differences
- Timing patterns (response speed, delays)
- Conversion or recovery patterns
- Execution bottlenecks
- Context gaps that caused problems`
            },
            {
              role: "user",
              content: `Analyze these workspace events and extract operational patterns:\n\n${eventsSummary}`
            }
          ],
          tools: [{
            type: "function",
            function: {
              name: "suggest_patterns",
              description: "Return extracted operational patterns from workspace events",
              parameters: {
                type: "object",
                properties: {
                  patterns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        memory_type: { type: "string", enum: ["success_pattern", "failure_pattern", "execution_lesson", "routing_lesson", "conversion_pattern", "recovery_pattern", "context_gap_pattern", "agent_performance_pattern"] },
                        title: { type: "string" },
                        summary: { type: "string" },
                        confidence: { type: "number" },
                        importance_score: { type: "number" },
                        entity_type: { type: "string" },
                        entity_id: { type: "string" },
                      },
                      required: ["memory_type", "title", "summary", "confidence", "importance_score"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["patterns"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "suggest_patterns" } },
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            extractedPatterns = parsed.patterns || [];
          } catch { /* ignore parse errors */ }
        }
      }
    }

    // If no AI available, create basic patterns from event counts
    if (extractedPatterns.length === 0) {
      for (const [prefix, evts] of Object.entries(grouped)) {
        const failEvents = evts.filter(e => (e.type || "").includes("FAILED") || (e.type || "").includes("ERROR"));
        const successEvents = evts.filter(e => (e.type || "").includes("COMPLETED") || (e.type || "").includes("SUCCESS"));

        if (failEvents.length > 3) {
          extractedPatterns.push({
            memory_type: "failure_pattern",
            title: `Recurring ${prefix} failures detected`,
            summary: `${failEvents.length} failure events in ${prefix} module since last cycle.`,
            confidence: Math.min(0.9, 0.3 + failEvents.length * 0.05),
            importance_score: Math.min(90, 40 + failEvents.length * 5),
            entity_type: prefix.toLowerCase(),
          });
        }
        if (successEvents.length > 5) {
          extractedPatterns.push({
            memory_type: "success_pattern",
            title: `Strong ${prefix} execution rate`,
            summary: `${successEvents.length} successful completions in ${prefix} module.`,
            confidence: Math.min(0.9, 0.4 + successEvents.length * 0.03),
            importance_score: Math.min(80, 30 + successEvents.length * 3),
            entity_type: prefix.toLowerCase(),
          });
        }
      }
    }

    let memoriesCreated = 0;
    let memoriesUpdated = 0;

    for (const pattern of extractedPatterns) {
      if (pattern.confidence < minConfidence) continue;

      // Check for existing similar memory
      const { data: existing } = await supabase
        .from("workspace_memories")
        .select("id, confidence, reuse_count, importance_score")
        .eq("workspace_id", workspace_id)
        .eq("memory_type", pattern.memory_type)
        .eq("title", pattern.title)
        .in("validity_status", ["valid", "aging"])
        .maybeSingle();

      if (existing) {
        // Reinforce existing memory
        const newConfidence = Math.min(0.99, (existing.confidence || 0.5) + 0.05);
        const newImportance = Math.max(existing.importance_score || 50, pattern.importance_score);
        await supabase.from("workspace_memories").update({
          confidence: newConfidence,
          importance_score: newImportance,
          reuse_count: (existing.reuse_count || 0) + 1,
          freshness_score: 100,
          validity_status: "valid",
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        memoriesUpdated++;
      } else {
        // Create new memory
        const { data: newMem } = await supabase.from("workspace_memories").insert({
          workspace_id,
          memory_type: pattern.memory_type,
          title: pattern.title,
          summary: pattern.summary,
          confidence: pattern.confidence,
          importance_score: pattern.importance_score,
          entity_type: pattern.entity_type || null,
          entity_id: pattern.entity_id || null,
          source_type: "learning_cycle",
          source_id: cycleId,
          context_snapshot_json: { events_count: events.length, grouped_counts: Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])) },
          freshness_score: 100,
          validity_status: "valid",
        }).select("id").single();

        if (newMem) {
          memoriesCreated++;
          // Emit kernel event
          await supabase.from("kernel_events").insert({
            workspace_id,
            type: "MEMORY.CREATED",
            entity_kind: "workspace_memory",
            entity_id: newMem.id,
            actor_type: "system",
            payload: { memory_type: pattern.memory_type, title: pattern.title },
            source_module: "memory-engine",
            schema_version: 1,
          });
        }
      }
    }

    // Apply decay to old memories
    const decayDate = new Date(Date.now() - decayDays * 24 * 60 * 60 * 1000).toISOString();
    const halfDecay = new Date(Date.now() - (decayDays / 2) * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("workspace_memories")
      .update({ validity_status: "stale", freshness_score: 10, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id)
      .eq("validity_status", "aging")
      .lt("updated_at", decayDate);

    await supabase.from("workspace_memories")
      .update({ validity_status: "aging", freshness_score: 40, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id)
      .eq("validity_status", "valid")
      .lt("updated_at", halfDecay);

    // Complete cycle
    if (cycleId) {
      await supabase.from("workspace_learning_cycles").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary: `Processed ${events.length} events. Created ${memoriesCreated} memories, updated ${memoriesUpdated}.`,
        memories_created: memoriesCreated,
        memories_updated: memoriesUpdated,
      }).eq("id", cycleId);

      // Emit cycle completed event
      await supabase.from("kernel_events").insert({
        workspace_id,
        type: "LEARNING.CYCLE_COMPLETED",
        entity_kind: "learning_cycle",
        entity_id: cycleId,
        actor_type: "system",
        payload: { memories_created: memoriesCreated, memories_updated: memoriesUpdated, events_processed: events.length },
        source_module: "memory-engine",
        schema_version: 1,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      cycle_id: cycleId,
      events_processed: events.length,
      memories_created: memoriesCreated,
      memories_updated: memoriesUpdated,
      patterns_extracted: extractedPatterns.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-workspace-memory error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

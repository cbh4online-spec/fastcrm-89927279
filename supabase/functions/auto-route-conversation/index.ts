// Auto-route a conversation: classify (tags, intent, priority) and assign to the right agent
// based on conversation_routing_rules. Designed to be called when a new inbound message arrives.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  match_intents: string[];
  match_priorities: string[];
  match_sentiments: string[];
  match_tags: string[];
  match_channels: string[];
  min_value: number | null;
  assignment_strategy: "specific_user" | "round_robin" | "least_busy" | "commercial_profile";
  assign_to_user_id: string | null;
  assign_to_user_ids: string[];
  assign_to_profile: string | null;
  add_tags: string[];
  set_priority: string | null;
  notify_user: boolean;
}

function ruleMatches(rule: RoutingRule, ctx: {
  intent: string | null;
  priority: string | null;
  sentiment: string | null;
  tags: string[];
  channel: string;
  value: number;
}): { matched: boolean; conditions: Record<string, unknown> } {
  const conds: Record<string, unknown> = {};
  if (rule.match_intents?.length) {
    if (!ctx.intent || !rule.match_intents.includes(ctx.intent)) return { matched: false, conditions: conds };
    conds.intent = ctx.intent;
  }
  if (rule.match_priorities?.length) {
    if (!ctx.priority || !rule.match_priorities.includes(ctx.priority)) return { matched: false, conditions: conds };
    conds.priority = ctx.priority;
  }
  if (rule.match_sentiments?.length) {
    if (!ctx.sentiment || !rule.match_sentiments.includes(ctx.sentiment)) return { matched: false, conditions: conds };
    conds.sentiment = ctx.sentiment;
  }
  if (rule.match_tags?.length) {
    const hit = rule.match_tags.find((t) => ctx.tags.includes(t));
    if (!hit) return { matched: false, conditions: conds };
    conds.tag = hit;
  }
  if (rule.match_channels?.length) {
    if (!rule.match_channels.includes(ctx.channel)) return { matched: false, conditions: conds };
    conds.channel = ctx.channel;
  }
  if (rule.min_value != null && ctx.value < rule.min_value) {
    return { matched: false, conditions: conds };
  }
  if (rule.min_value != null) conds.min_value = rule.min_value;
  return { matched: true, conditions: conds };
}

async function pickAssignee(
  supabase: ReturnType<typeof createClient>,
  rule: RoutingRule,
  workspaceId: string,
): Promise<string | null> {
  if (rule.assignment_strategy === "specific_user") {
    return rule.assign_to_user_id;
  }

  // Build candidate pool
  let candidates: string[] = [];
  if (rule.assignment_strategy === "commercial_profile" && rule.assign_to_profile) {
    const { data } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("commercial_profile", rule.assign_to_profile);
    candidates = (data || []).map((m: any) => m.user_id);
  } else {
    candidates = rule.assign_to_user_ids || [];
  }
  if (!candidates.length) return null;

  if (rule.assignment_strategy === "round_robin") {
    // Pick the candidate with the oldest last assignment
    const { data: lastAssigns } = await supabase
      .from("conversation_routing_log")
      .select("assigned_to, created_at")
      .eq("workspace_id", workspaceId)
      .in("assigned_to", candidates)
      .order("created_at", { ascending: false })
      .limit(50);

    const lastSeen = new Map<string, string>();
    for (const row of (lastAssigns || []) as any[]) {
      if (!lastSeen.has(row.assigned_to)) lastSeen.set(row.assigned_to, row.created_at);
    }
    // Prefer never-assigned first, then oldest
    const never = candidates.filter((c) => !lastSeen.has(c));
    if (never.length) return never[0];
    return candidates.sort((a, b) => (lastSeen.get(a)! < lastSeen.get(b)! ? -1 : 1))[0];
  }

  if (rule.assignment_strategy === "least_busy") {
    const { data: counts } = await supabase
      .from("conversations")
      .select("assigned_to")
      .eq("workspace_id", workspaceId)
      .in("assigned_to", candidates)
      .in("status", ["open", "pending"]);
    const tally = new Map<string, number>();
    candidates.forEach((c) => tally.set(c, 0));
    for (const row of (counts || []) as any[]) {
      tally.set(row.assigned_to, (tally.get(row.assigned_to) || 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => a[1] - b[1])[0][0];
  }

  return candidates[0] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, workspace_id } = await req.json();
    if (!conversation_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "conversation_id and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Load conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, workspace_id, channel, ai_intent, ai_priority, ai_sentiment, ai_tags, user_tags, assigned_to, potential_value_estimate, requires_human")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: "conversation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (conv.assigned_to) {
      return new Response(JSON.stringify({ skipped: "already_assigned", assigned_to: conv.assigned_to }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load active rules ordered by priority
    const { data: rules } = await supabase
      .from("conversation_routing_rules")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (!rules || !rules.length) {
      return new Response(JSON.stringify({ skipped: "no_rules" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allTags = [...(conv.ai_tags || []), ...(conv.user_tags || [])];
    const ctx = {
      intent: conv.ai_intent,
      priority: conv.ai_priority,
      sentiment: conv.ai_sentiment,
      tags: allTags,
      channel: conv.channel,
      value: Number(conv.potential_value_estimate || 0),
    };

    // 3. Find first matching rule
    let matchedRule: RoutingRule | null = null;
    let matchedConditions: Record<string, unknown> = {};
    for (const rule of rules as unknown as RoutingRule[]) {
      const { matched, conditions } = ruleMatches(rule, ctx);
      if (matched) {
        matchedRule = rule;
        matchedConditions = conditions;
        break;
      }
    }

    if (!matchedRule) {
      return new Response(JSON.stringify({ skipped: "no_matching_rule" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Pick assignee
    const assignee = await pickAssignee(supabase, matchedRule, workspace_id);

    // 5. Apply updates
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (assignee) updates.assigned_to = assignee;
    if (matchedRule.set_priority) updates.ai_priority = matchedRule.set_priority;
    if (matchedRule.add_tags?.length) {
      const merged = [...new Set([...(conv.ai_tags || []), ...matchedRule.add_tags])];
      updates.ai_tags = merged;
      updates.tags_auto_assigned = true;
      updates.tags_assigned_at = new Date().toISOString();
    }

    if (Object.keys(updates).length > 1) {
      await supabase.from("conversations").update(updates).eq("id", conversation_id);
    }

    // 6. Audit log
    await supabase.from("conversation_routing_log").insert({
      workspace_id,
      conversation_id,
      rule_id: matchedRule.id,
      rule_name: matchedRule.name,
      assigned_to: assignee,
      previous_assigned_to: conv.assigned_to,
      strategy: matchedRule.assignment_strategy,
      reason: `matched rule "${matchedRule.name}"`,
      matched_conditions: matchedConditions,
      added_tags: matchedRule.add_tags || [],
    });

    return new Response(JSON.stringify({
      success: true,
      rule_id: matchedRule.id,
      rule_name: matchedRule.name,
      assigned_to: assignee,
      strategy: matchedRule.assignment_strategy,
      added_tags: matchedRule.add_tags,
      matched_conditions: matchedConditions,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("auto-route-conversation error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "internal_error",
      fallback: true,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ghl-cleanup-routing
// Audits existing GHL conversations in shared-location workspaces and re-attributes
// them (conversation + messages + auto-created lead) to the workspace that actually
// owns the social account. Dry-run by default.
//
// POST body: { source_workspace_id: uuid, dry_run?: boolean, limit?: number }

import { createClient } from "@supabase/supabase-js";
import {
  toSocialType,
  matchAccountId,
  extractAccountIdsFromConversation,
  fetchGHLConversationDetail,
  logRoutingDecision,
} from "../_shared/ghlRouting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRow {
  conversation_id: string;
  ghl_conversation_id: string;
  channel: string;
  current_workspace: string;
  detected_account_id: string | null;
  correct_workspace: string | null;
  action: "kept" | "moved" | "no_owner" | "no_account_id" | "error";
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Auth: super-admin only ---
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_super_admin", { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — super admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { source_workspace_id, dry_run = true, limit = 500 } = await req.json();
    if (!source_workspace_id) {
      return new Response(JSON.stringify({ error: "source_workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Source workspace + GHL config
    const { data: srcConfig } = await supabase
      .from("workspace_ghl_config")
      .select("ghl_location_id, api_key")
      .eq("workspace_id", source_workspace_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!srcConfig?.api_key || !srcConfig?.ghl_location_id) {
      return new Response(JSON.stringify({ error: "Workspace has no active GHL config" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const locationId = srcConfig.ghl_location_id;
    const apiKey = srcConfig.api_key;

    // 2) Sibling workspaces sharing this location
    const { data: siblings } = await supabase
      .from("workspace_ghl_config")
      .select("workspace_id")
      .eq("ghl_location_id", locationId)
      .eq("is_active", true)
      .neq("workspace_id", source_workspace_id);

    const allWorkspaceIds = [source_workspace_id, ...(siblings || []).map((s: any) => s.workspace_id)];

    // 3) Load social channels for ALL workspaces sharing this location
    const { data: allChannels } = await supabase
      .from("workspace_ghl_social_channels")
      .select("workspace_id, channel_type, ghl_account_id, is_active")
      .in("workspace_id", allWorkspaceIds)
      .eq("is_active", true);

    const channelsByType = new Map<string, Array<{ workspace_id: string; ghl_account_id: string }>>();
    for (const ch of (allChannels || []) as any[]) {
      const arr = channelsByType.get(ch.channel_type) || [];
      arr.push({ workspace_id: ch.workspace_id, ghl_account_id: ch.ghl_account_id });
      channelsByType.set(ch.channel_type, arr);
    }

    // 4) Pull conversations from source workspace (only social channels)
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, channel, external_thread_id, lead_id, contact_id, channel_metadata")
      .eq("workspace_id", source_workspace_id)
      .in("channel", ["instagram", "facebook", "messenger", "whatsapp"])
      .not("external_thread_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    const report: ReportRow[] = [];
    let moved = 0;
    let kept = 0;
    let skipped = 0;

    for (const conv of (convs || []) as any[]) {
      const ghlConvId =
        (conv.channel_metadata?.ghl_conversation_id as string) ||
        (conv.external_thread_id?.startsWith("ghl_") ? conv.external_thread_id.slice(4) : conv.external_thread_id);

      const socialType = toSocialType(conv.channel);
      if (!socialType) { kept++; continue; }

      const candidates = channelsByType.get(socialType) || [];
      if (candidates.length === 0) {
        report.push({
          conversation_id: conv.id, ghl_conversation_id: ghlConvId,
          channel: conv.channel, current_workspace: source_workspace_id,
          detected_account_id: null, correct_workspace: null,
          action: "no_owner", reason: "no_active_channel_in_any_workspace",
        });
        skipped++;
        continue;
      }

      // Fetch detail from GHL to know which page it really belongs to
      const detail = await fetchGHLConversationDetail(apiKey, ghlConvId);
      const accountIds = extractAccountIdsFromConversation(detail);

      if (accountIds.length === 0) {
        report.push({
          conversation_id: conv.id, ghl_conversation_id: ghlConvId,
          channel: conv.channel, current_workspace: source_workspace_id,
          detected_account_id: null, correct_workspace: null,
          action: "no_account_id", reason: "ghl_detail_missing_meta",
        });
        skipped++;
        continue;
      }

      const owner = candidates.find(c =>
        accountIds.some(cand => matchAccountId(String(c.ghl_account_id), String(cand)))
      );

      const detectedId = accountIds[0];

      if (!owner) {
        report.push({
          conversation_id: conv.id, ghl_conversation_id: ghlConvId,
          channel: conv.channel, current_workspace: source_workspace_id,
          detected_account_id: detectedId, correct_workspace: null,
          action: "no_owner", reason: "account_id_not_claimed_by_any_sibling",
        });
        skipped++;
        continue;
      }

      if (owner.workspace_id === source_workspace_id) {
        kept++;
        continue; // already correct, don't even report
      }

      // Needs to move
      report.push({
        conversation_id: conv.id, ghl_conversation_id: ghlConvId,
        channel: conv.channel, current_workspace: source_workspace_id,
        detected_account_id: detectedId, correct_workspace: owner.workspace_id,
        action: "moved",
      });

      if (!dry_run) {
        try {
          // Move messages
          await supabase
            .from("messages")
            .update({ workspace_id: owner.workspace_id })
            .eq("conversation_id", conv.id);

          // Move conversation
          await supabase
            .from("conversations")
            .update({ workspace_id: owner.workspace_id })
            .eq("id", conv.id);

          // Move lead (only if it was created from GHL — has ghl_contact_id)
          if (conv.lead_id) {
            const { data: lead } = await supabase
              .from("leads")
              .select("id, ghl_contact_id, workspace_id")
              .eq("id", conv.lead_id)
              .maybeSingle();

            if (lead?.ghl_contact_id && lead.workspace_id === source_workspace_id) {
              // Check if a lead with same ghl_contact_id already exists in target workspace
              const { data: existingLead } = await supabase
                .from("leads")
                .select("id")
                .eq("workspace_id", owner.workspace_id)
                .eq("ghl_contact_id", lead.ghl_contact_id)
                .maybeSingle();

              if (existingLead) {
                // Re-point conversation to the existing lead in the target workspace
                await supabase.from("conversations")
                  .update({ lead_id: existingLead.id })
                  .eq("id", conv.id);
              } else {
                // Move the lead itself
                await supabase.from("leads")
                  .update({ workspace_id: owner.workspace_id })
                  .eq("id", lead.id);
              }
            }
          }

          await logRoutingDecision(supabase, {
            source: "cleanup",
            source_workspace_id,
            resolved_workspace_id: owner.workspace_id,
            ghl_location_id: locationId,
            ghl_conversation_id: ghlConvId,
            ghl_account_id: detectedId,
            channel_type: socialType,
            action: "moved",
          });

          moved++;
        } catch (err) {
          console.error("[GHL-CLEANUP] Move failed", { conv: conv.id, err });
          report[report.length - 1].action = "error";
          report[report.length - 1].reason = String(err);
        }
      }
    }

    const summary = {
      dry_run,
      source_workspace_id,
      location_id: locationId,
      total_inspected: (convs || []).length,
      moved: dry_run ? report.filter(r => r.action === "moved").length : moved,
      kept,
      skipped,
      report,
    };

    return new Response(JSON.stringify(summary), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[GHL-CLEANUP] Fatal", err);
    return new Response(JSON.stringify({ ok: true, fallback: true, error: String(err) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

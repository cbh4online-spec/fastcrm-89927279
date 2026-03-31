import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Compute Campaign Attribution
 * 
 * Calculates revenue attribution for campaigns based on contact interactions
 * and closed opportunities within a configurable window.
 * 
 * Attribution models:
 * - first_touch: first campaign interaction before opp creation
 * - last_touch: last campaign interaction before opp won
 * - equal_share: equal distribution across all touching campaigns
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const workspaceId = body.workspace_id;
    const attributionWindowDays = body.window_days || 30;
    const model = body.model || "equal_share";

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get won opportunities
    const { data: opportunities, error: oppError } = await supabase
      .from("opportunities")
      .select("id, value, contact_id, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("stage", "won");

    if (oppError) throw oppError;
    if (!opportunities?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processedCount = 0;

    for (const opp of opportunities) {
      if (!opp.contact_id || !opp.value) continue;

      const windowStart = new Date(opp.created_at);
      windowStart.setDate(windowStart.getDate() - attributionWindowDays);

      // Find campaign interactions within the attribution window
      const { data: events } = await supabase
        .from("marketing_events")
        .select("campaign_id, event_type, occurred_at")
        .eq("contact_id", opp.contact_id)
        .in("event_type", ["opened", "clicked"])
        .gte("occurred_at", windowStart.toISOString())
        .lte("occurred_at", opp.updated_at || opp.created_at)
        .order("occurred_at", { ascending: true });

      // Also check link clicks
      const { data: clicks } = await supabase
        .from("campaign_link_clicks")
        .select("campaign_id, clicked_at")
        .eq("contact_id", opp.contact_id)
        .gte("clicked_at", windowStart.toISOString())
        .lte("clicked_at", opp.updated_at || opp.created_at);

      // Merge campaigns
      const campaignInteractions = new Map<string, { firstAt: string; lastAt: string; eventType: string }>();

      (events || []).forEach(e => {
        const existing = campaignInteractions.get(e.campaign_id);
        if (!existing) {
          campaignInteractions.set(e.campaign_id, {
            firstAt: e.occurred_at,
            lastAt: e.occurred_at,
            eventType: e.event_type,
          });
        } else {
          if (e.occurred_at < existing.firstAt) existing.firstAt = e.occurred_at;
          if (e.occurred_at > existing.lastAt) existing.lastAt = e.occurred_at;
        }
      });

      (clicks || []).forEach(c => {
        const existing = campaignInteractions.get(c.campaign_id);
        if (!existing) {
          campaignInteractions.set(c.campaign_id, {
            firstAt: c.clicked_at,
            lastAt: c.clicked_at,
            eventType: "clicked",
          });
        } else {
          if (c.clicked_at < existing.firstAt) existing.firstAt = c.clicked_at;
          if (c.clicked_at > existing.lastAt) existing.lastAt = c.clicked_at;
        }
      });

      if (campaignInteractions.size === 0) continue;

      const campaignIds = Array.from(campaignInteractions.keys());
      const oppValue = opp.value || 0;

      // Delete existing attributions for this opp
      await supabase
        .from("campaign_attribution")
        .delete()
        .eq("opportunity_id", opp.id)
        .eq("workspace_id", workspaceId);

      // Apply attribution model
      if (model === "first_touch") {
        let earliest = { campaignId: "", at: "" };
        campaignInteractions.forEach((v, k) => {
          if (!earliest.at || v.firstAt < earliest.at) {
            earliest = { campaignId: k, at: v.firstAt };
          }
        });

        await supabase.from("campaign_attribution").insert({
          workspace_id: workspaceId,
          campaign_id: earliest.campaignId,
          contact_id: opp.contact_id,
          opportunity_id: opp.id,
          attribution_model: "first_touch",
          attribution_type: "originated",
          revenue_attributed: oppValue,
          revenue_influenced: 0,
          event_type: "clicked",
          attribution_window_days: attributionWindowDays,
        });

        // Others get influenced
        for (const cId of campaignIds) {
          if (cId !== earliest.campaignId) {
            await supabase.from("campaign_attribution").insert({
              workspace_id: workspaceId,
              campaign_id: cId,
              contact_id: opp.contact_id,
              opportunity_id: opp.id,
              attribution_model: "first_touch",
              attribution_type: "influenced",
              revenue_attributed: 0,
              revenue_influenced: oppValue,
              event_type: "clicked",
              attribution_window_days: attributionWindowDays,
            });
          }
        }
      } else if (model === "last_touch") {
        let latest = { campaignId: "", at: "" };
        campaignInteractions.forEach((v, k) => {
          if (!latest.at || v.lastAt > latest.at) {
            latest = { campaignId: k, at: v.lastAt };
          }
        });

        await supabase.from("campaign_attribution").insert({
          workspace_id: workspaceId,
          campaign_id: latest.campaignId,
          contact_id: opp.contact_id,
          opportunity_id: opp.id,
          attribution_model: "last_touch",
          attribution_type: "originated",
          revenue_attributed: oppValue,
          revenue_influenced: 0,
          event_type: "clicked",
          attribution_window_days: attributionWindowDays,
        });

        for (const cId of campaignIds) {
          if (cId !== latest.campaignId) {
            await supabase.from("campaign_attribution").insert({
              workspace_id: workspaceId,
              campaign_id: cId,
              contact_id: opp.contact_id,
              opportunity_id: opp.id,
              attribution_model: "last_touch",
              attribution_type: "influenced",
              revenue_attributed: 0,
              revenue_influenced: oppValue,
              event_type: "clicked",
              attribution_window_days: attributionWindowDays,
            });
          }
        }
      } else {
        // equal_share
        const share = oppValue / campaignIds.length;

        for (const cId of campaignIds) {
          await supabase.from("campaign_attribution").insert({
            workspace_id: workspaceId,
            campaign_id: cId,
            contact_id: opp.contact_id,
            opportunity_id: opp.id,
            attribution_model: "equal_share",
            attribution_type: "influenced",
            revenue_attributed: share,
            revenue_influenced: oppValue,
            event_type: "clicked",
            attribution_window_days: attributionWindowDays,
          });
        }
      }

      processedCount++;
    }

    return new Response(JSON.stringify({ processed: processedCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ATTRIBUTION] Error:", error);
    return new Response(JSON.stringify({ error: "Attribution computation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

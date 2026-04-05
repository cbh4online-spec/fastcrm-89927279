import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "@supabase/supabase-js/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SDRRequest {
  action: "enroll_prospect" | "enroll_in_sequence" | "process_reply" | "check_campaign" | "auto_enroll_scan" | "update_status" | "pause_sequence" | "resume_sequence";
  workspace_id: string;
  campaign_id?: string;
  prospect_data?: {
    prospect_id?: string;
    lead_id?: string;
    contact_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    channel?: string;
  };
  enrollment_id?: string;
  new_status?: string;
  reply_data?: {
    enrollment_id: string;
    is_positive?: boolean;
    message_text?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SDRRequest = await req.json();
    const { action, workspace_id } = body;

    if (!workspace_id || !action) {
      return new Response(JSON.stringify({ error: "workspace_id and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: unknown;

    switch (action) {
      case "enroll_prospect":
        result = await enrollProspect(supabase, body);
        break;
      case "process_reply":
        result = await processReply(supabase, body);
        break;
      case "check_campaign":
        result = await checkCampaign(supabase, body);
        break;
      case "auto_enroll_scan":
        result = await autoEnrollScan(supabase, body);
        break;
      case "update_status":
        result = await updateEnrollmentStatus(supabase, body);
        break;
      case "enroll_in_sequence":
        result = await enrollInSequence(supabase, body);
        break;
      case "pause_sequence":
        result = await pauseResumeSequence(supabase, body, "paused");
        break;
      case "resume_sequence":
        result = await pauseResumeSequence(supabase, body, "sequenced");
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sdr-orchestrator] Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── ENROLL PROSPECT ──────────────────────────────────────────
async function enrollProspect(supabase: any, body: SDRRequest) {
  const { campaign_id, workspace_id, prospect_data } = body;
  if (!campaign_id || !prospect_data) throw new Error("campaign_id and prospect_data required");

  // Check campaign exists and is active
  const { data: campaign } = await supabase
    .from("sdr_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "active" && campaign.status !== "draft") {
    throw new Error("Campaign is not active");
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from("sdr_enrollments")
    .select("id")
    .eq("campaign_id", campaign_id)
    .eq("prospect_email", prospect_data.email)
    .maybeSingle();

  if (existing) {
    return { already_enrolled: true, enrollment_id: existing.id };
  }

  // Create enrollment
  const { data: enrollment, error } = await supabase
    .from("sdr_enrollments")
    .insert({
      campaign_id,
      workspace_id,
      prospect_id: prospect_data.prospect_id || null,
      lead_id: prospect_data.lead_id || null,
      contact_id: prospect_data.contact_id || null,
      prospect_name: prospect_data.name || null,
      prospect_email: prospect_data.email || null,
      prospect_phone: prospect_data.phone || null,
      channel: prospect_data.channel || "email",
      status: "enrolled",
      message_variant: Math.random() > 0.5 ? "A" : "B",
    })
    .select()
    .single();

  if (error) throw error;

  // Update campaign counter
  await supabase
    .from("sdr_campaigns")
    .update({ total_enrolled: campaign.total_enrolled + 1 })
    .eq("id", campaign_id);

  // If campaign has a sequence, enroll in sequence automatically
  if (campaign.sequence_id) {
    await enrollInSequence(supabase, {
      ...body,
      enrollment_id: enrollment.id,
      action: "enroll_in_sequence",
    });
  }

  return { enrolled: true, enrollment_id: enrollment.id };
}

// ─── PROCESS REPLY ───────────────────────────────────────────
async function processReply(supabase: any, body: SDRRequest) {
  const { reply_data, workspace_id } = body;
  if (!reply_data?.enrollment_id) throw new Error("reply_data.enrollment_id required");

  const newStatus = reply_data.is_positive ? "positive_reply" : "replied";

  const { data: enrollment } = await supabase
    .from("sdr_enrollments")
    .update({
      status: newStatus,
      reply_detected_at: new Date().toISOString(),
    })
    .eq("id", reply_data.enrollment_id)
    .eq("workspace_id", workspace_id)
    .select("campaign_id")
    .single();

  if (enrollment) {
    // Update campaign reply counter
    await supabase.rpc("increment_field", {
      table_name: "sdr_campaigns",
      field_name: "total_replied",
      row_id: enrollment.campaign_id,
    }).catch(() => {
      // Fallback: direct update
      supabase
        .from("sdr_campaigns")
        .select("total_replied")
        .eq("id", enrollment.campaign_id)
        .single()
        .then(({ data }: any) => {
          if (data) {
            supabase
              .from("sdr_campaigns")
              .update({ total_replied: (data.total_replied || 0) + 1 })
              .eq("id", enrollment.campaign_id);
          }
        });
    });
  }

  return { processed: true, status: newStatus };
}

// ─── CHECK CAMPAIGN ──────────────────────────────────────────
async function checkCampaign(supabase: any, body: SDRRequest) {
  const { campaign_id, workspace_id } = body;
  if (!campaign_id) throw new Error("campaign_id required");

  const { data: enrollments } = await supabase
    .from("sdr_enrollments")
    .select("status")
    .eq("campaign_id", campaign_id)
    .eq("workspace_id", workspace_id);

  const counts: Record<string, number> = {};
  (enrollments || []).forEach((e: any) => {
    counts[e.status] = (counts[e.status] || 0) + 1;
  });

  // Update campaign with accurate counts
  await supabase
    .from("sdr_campaigns")
    .update({
      total_enrolled: enrollments?.length || 0,
      total_replied: (counts.replied || 0) + (counts.positive_reply || 0),
      total_meetings: counts.meeting_set || 0,
      total_converted: counts.converted || 0,
    })
    .eq("id", campaign_id);

  return { campaign_id, counts, total: enrollments?.length || 0 };
}

// ─── AUTO ENROLL SCAN ────────────────────────────────────────
async function autoEnrollScan(supabase: any, body: SDRRequest) {
  const { workspace_id } = body;

  // Find campaigns with auto-enroll enabled
  const { data: campaigns } = await supabase
    .from("sdr_campaigns")
    .select("*")
    .eq("workspace_id", workspace_id)
    .eq("status", "active")
    .eq("auto_enroll_enabled", true);

  if (!campaigns?.length) return { scanned: 0, enrolled: 0 };

  let totalEnrolled = 0;

  for (const campaign of campaigns) {
    const minScore = campaign.auto_enroll_min_score || 70;

    // Find prospects with high ICP fit not yet enrolled
    const { data: prospects } = await supabase
      .from("prospecting_profiles")
      .select("id, full_name, email, phone")
      .eq("workspace_id", workspace_id)
      .gte("relevance_score", minScore)
      .limit(50);

    if (!prospects?.length) continue;

    for (const prospect of prospects) {
      // Check if already enrolled in this campaign
      const { data: existing } = await supabase
        .from("sdr_enrollments")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("prospect_id", prospect.id)
        .maybeSingle();

      if (existing) continue;

      await supabase.from("sdr_enrollments").insert({
        campaign_id: campaign.id,
        workspace_id,
        prospect_id: prospect.id,
        prospect_name: prospect.full_name,
        prospect_email: prospect.email,
        prospect_phone: prospect.phone,
        status: "enrolled",
        channel: "email",
        message_variant: Math.random() > 0.5 ? "A" : "B",
      });

      totalEnrolled++;
    }
  }

  return { scanned: campaigns.length, enrolled: totalEnrolled };
}

// ─── UPDATE ENROLLMENT STATUS ────────────────────────────────
async function updateEnrollmentStatus(supabase: any, body: SDRRequest) {
  const { enrollment_id, new_status, workspace_id } = body;
  if (!enrollment_id || !new_status) throw new Error("enrollment_id and new_status required");

  const updateData: Record<string, unknown> = { status: new_status };

  if (new_status === "meeting_set") updateData.meeting_set_at = new Date().toISOString();
  if (new_status === "converted") updateData.converted_at = new Date().toISOString();
  if (new_status === "opted_out") updateData.opted_out_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("sdr_enrollments")
    .update(updateData)
    .eq("id", enrollment_id)
    .eq("workspace_id", workspace_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

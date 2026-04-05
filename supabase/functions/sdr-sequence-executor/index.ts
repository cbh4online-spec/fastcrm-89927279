import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "batch";

    if (mode === "single_step") {
      const result = await executeSingleStep(supabase, body);
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch mode: find all enrollments with next_send_at <= now()
    const { data: dueEnrollments, error: fetchErr } = await supabase
      .from("sdr_enrollments")
      .select(`
        id, campaign_id, workspace_id, prospect_name, prospect_email,
        prospect_phone, channel, current_step, next_send_at, sequence_enrollment_id,
        message_variant, metadata
      `)
      .eq("status", "sequenced")
      .lte("next_send_at", new Date().toISOString())
      .not("next_send_at", "is", null)
      .limit(100);

    if (fetchErr) throw fetchErr;
    if (!dueEnrollments?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[sdr-sequence-executor] Processing ${dueEnrollments.length} due enrollments`);

    let processed = 0;
    let failed = 0;

    for (const enrollment of dueEnrollments) {
      try {
        await processEnrollmentStep(supabase, enrollment);
        processed++;
      } catch (err) {
        console.error(`[sdr-sequence-executor] Error processing enrollment ${enrollment.id}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sdr-sequence-executor] Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processEnrollmentStep(supabase: any, enrollment: any) {
  // Get campaign to find sequence_id
  const { data: campaign } = await supabase
    .from("sdr_campaigns")
    .select("sequence_id, workspace_id")
    .eq("id", enrollment.campaign_id)
    .single();

  if (!campaign?.sequence_id) {
    console.warn(`[sdr-sequence-executor] No sequence for campaign ${enrollment.campaign_id}`);
    return;
  }

  // Get all steps for the sequence ordered by step_order
  const { data: steps } = await supabase
    .from("multichannel_sequence_steps")
    .select("*")
    .eq("sequence_id", campaign.sequence_id)
    .eq("is_active", true)
    .order("step_order");

  if (!steps?.length) {
    console.warn(`[sdr-sequence-executor] No active steps for sequence ${campaign.sequence_id}`);
    return;
  }

  const currentStepIndex = enrollment.current_step || 0;
  const step = steps[currentStepIndex];

  if (!step) {
    // All steps completed
    await supabase
      .from("sdr_enrollments")
      .update({ status: "completed", next_send_at: null })
      .eq("id", enrollment.id);
    return;
  }

  // Execute the step based on channel
  let sendStatus = "sent";
  let errorMessage: string | null = null;

  try {
    if (step.channel === "email") {
      await executeEmailStep(supabase, enrollment, step);
    } else if (step.channel === "whatsapp") {
      await executeWhatsAppStep(supabase, enrollment, step);
    } else {
      // Other channels: log as sent (placeholder)
      console.log(`[sdr-sequence-executor] Channel ${step.channel} step executed (placeholder)`);
    }
  } catch (err) {
    sendStatus = "failed";
    errorMessage = err.message || "Unknown error";
  }

  // Log the step execution
  await supabase.from("sdr_sequence_step_logs").insert({
    sdr_enrollment_id: enrollment.id,
    sequence_step_id: step.id,
    channel: step.channel,
    status: sendStatus,
    sent_at: sendStatus === "sent" ? new Date().toISOString() : null,
    error_message: errorMessage,
    workspace_id: enrollment.workspace_id,
  });

  // Advance to next step
  const nextStepIndex = currentStepIndex + 1;
  const nextStep = steps[nextStepIndex];

  if (nextStep) {
    const delayMs = ((nextStep.delay_days || 0) * 86400 + (nextStep.delay_hours || 0) * 3600) * 1000;
    const nextSendAt = new Date(Date.now() + delayMs).toISOString();

    await supabase
      .from("sdr_enrollments")
      .update({ current_step: nextStepIndex, next_send_at: nextSendAt })
      .eq("id", enrollment.id);
  } else {
    // Last step done
    await supabase
      .from("sdr_enrollments")
      .update({ status: "completed", next_send_at: null, current_step: nextStepIndex })
      .eq("id", enrollment.id);
  }
}

async function executeEmailStep(supabase: any, enrollment: any, step: any) {
  if (!enrollment.prospect_email) throw new Error("No email for prospect");

  const subject = step.subject || "Follow-up";
  const bodyHtml = step.body_html || step.content || "";

  // Invoke email-send edge function
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/email-send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      to: enrollment.prospect_email,
      subject,
      html: bodyHtml,
      workspace_id: enrollment.workspace_id,
      metadata: {
        sdr_enrollment_id: enrollment.id,
        sequence_step_id: step.id,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`email-send failed: ${response.status} — ${err}`);
  }
}

async function executeWhatsAppStep(supabase: any, enrollment: any, step: any) {
  if (!enrollment.prospect_phone) throw new Error("No phone for prospect");

  const message = step.whatsapp_template || step.content || "";

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ghl-send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      phone: enrollment.prospect_phone,
      message,
      workspace_id: enrollment.workspace_id,
      metadata: {
        sdr_enrollment_id: enrollment.id,
        sequence_step_id: step.id,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ghl-send-message failed: ${response.status} — ${err}`);
  }
}

async function executeSingleStep(supabase: any, body: any) {
  const { enrollment_id, step_id, workspace_id } = body;
  if (!enrollment_id) throw new Error("enrollment_id required");

  const { data: enrollment } = await supabase
    .from("sdr_enrollments")
    .select("*")
    .eq("id", enrollment_id)
    .eq("workspace_id", workspace_id)
    .single();

  if (!enrollment) throw new Error("Enrollment not found");

  await processEnrollmentStep(supabase, enrollment);
  return { processed: true, enrollment_id };
}

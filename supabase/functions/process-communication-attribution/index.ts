import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) =>
  console.log(
    `[ATTRIBUTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`
  );

// ── Normalize conversion ──

interface NormalizedConversion {
  conversionType: string;
  conversionId: string;
  workspaceId: string;
  contactId: string | null;
  amount: number;
  currency: string;
  occurredAt: string;
}

async function normalizeConversion(
  supabase: any,
  workspaceId: string,
  conversionType: string,
  conversionId: string,
  allowEmailFallback: boolean
): Promise<NormalizedConversion | null> {
  switch (conversionType) {
    case "store_order": {
      const { data } = await supabase
        .from("store_orders")
        .select("id, workspace_id, contact_id, customer_email, total, currency, status, paid_at, created_at")
        .eq("id", conversionId)
        .maybeSingle();
      if (!data || data.status !== "paid") return null;

      let contactId = data.contact_id;
      if (!contactId && allowEmailFallback && data.customer_email) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("email", data.customer_email)
          .maybeSingle();
        contactId = contact?.id || null;
      }

      return {
        conversionType: "store_order",
        conversionId: data.id,
        workspaceId: data.workspace_id || workspaceId,
        contactId,
        amount: Number(data.total) || 0,
        currency: data.currency || "EUR",
        occurredAt: data.paid_at || data.created_at,
      };
    }
    case "opportunity_won": {
      const { data } = await supabase
        .from("opportunities")
        .select("id, workspace_id, contact_id, value, status, updated_at")
        .eq("id", conversionId)
        .maybeSingle();
      if (!data || data.status !== "won") return null;
      return {
        conversionType: "opportunity_won",
        conversionId: data.id,
        workspaceId: data.workspace_id || workspaceId,
        contactId: data.contact_id,
        amount: Number(data.value) || 0,
        currency: "EUR",
        occurredAt: data.updated_at,
      };
    }
    case "proposal_paid": {
      const { data } = await supabase
        .from("proposals")
        .select("id, workspace_id, opportunity_id, total, accepted_at")
        .eq("id", conversionId)
        .maybeSingle();
      if (!data || !data.accepted_at) return null;

      let contactId: string | null = null;
      if (data.opportunity_id) {
        const { data: opp } = await supabase
          .from("opportunities")
          .select("contact_id, workspace_id")
          .eq("id", data.opportunity_id)
          .maybeSingle();
        contactId = opp?.contact_id || null;
      }

      return {
        conversionType: "proposal_paid",
        conversionId: data.id,
        workspaceId: data.workspace_id || workspaceId,
        contactId,
        amount: Number(data.total) || 0,
        currency: "EUR",
        occurredAt: data.accepted_at,
      };
    }
    case "payment_completed": {
      const { data } = await supabase
        .from("payments")
        .select("id, workspace_id, opportunity_id, amount, currency, created_at")
        .eq("id", conversionId)
        .maybeSingle();
      if (!data) return null;

      let contactId: string | null = null;
      if (data.opportunity_id) {
        const { data: opp } = await supabase
          .from("opportunities")
          .select("contact_id")
          .eq("id", data.opportunity_id)
          .maybeSingle();
        contactId = opp?.contact_id || null;
      }

      return {
        conversionType: "payment_completed",
        conversionId: data.id,
        workspaceId: data.workspace_id || workspaceId,
        contactId,
        amount: Number(data.amount) || 0,
        currency: data.currency || "EUR",
        occurredAt: data.created_at,
      };
    }
    default:
      return null;
  }
}

// ── Find touchpoints ──

interface Touchpoint {
  templateId: string | null;
  sequenceStepId: string | null;
  sequenceId: string | null;
  enrollmentId: string | null;
  channel: string | null;
  provider: string | null;
  sentAt: string;
  contextType: string | null;
  contextId: string | null;
}

async function findTouchpoints(
  supabase: any,
  workspaceId: string,
  contactId: string,
  conversionAt: string,
  windowDays: number
): Promise<Touchpoint[]> {
  const windowStart = new Date(
    new Date(conversionAt).getTime() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: events } = await supabase
    .from("template_log_events")
    .select("template_id, sequence_step_id, channel, created_at, metadata")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .in("event_type", ["sent", "delivered"])
    .gte("created_at", windowStart)
    .lte("created_at", conversionAt)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!events || events.length === 0) return [];

  // Deduplicate by template+step combo, keep most recent
  const seen = new Set<string>();
  const touches: Touchpoint[] = [];

  for (const ev of events) {
    const key = `${ev.template_id || ""}__${ev.sequence_step_id || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const meta = ev.metadata || {};
    touches.push({
      templateId: ev.template_id,
      sequenceStepId: ev.sequence_step_id || null,
      sequenceId: meta.sequence_id || null,
      enrollmentId: meta.enrollment_id || null,
      channel: ev.channel || meta.channel || null,
      provider: meta.provider || null,
      sentAt: ev.created_at,
      contextType: meta.context_type || null,
      contextId: meta.context_id || null,
    });
  }

  return touches;
}

// ── Apply attribution model ──

interface WeightedTouch extends Touchpoint {
  weight: number;
  touchType: string;
}

function applyModel(
  touches: Touchpoint[],
  model: string,
  includeAssists: boolean
): WeightedTouch[] {
  if (touches.length === 0) return [];

  // touches are ordered most-recent first
  switch (model) {
    case "first_touch":
      return [{ ...touches[touches.length - 1], weight: 1.0, touchType: "direct" }];

    case "assisted_touch": {
      if (!includeAssists || touches.length === 1) {
        return [{ ...touches[0], weight: 1.0, touchType: "direct" }];
      }
      const lastWeight = 0.7;
      const assistWeight = 0.3 / (touches.length - 1);
      return touches.map((t, i) => ({
        ...t,
        weight: i === 0 ? lastWeight : assistWeight,
        touchType: i === 0 ? "direct" : "assist",
      }));
    }

    case "last_touch":
    default:
      return [{ ...touches[0], weight: 1.0, touchType: "direct" }];
  }
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json();
    const { workspace_id, conversion_type, conversion_id } = body;

    if (!workspace_id || !conversion_type || !conversion_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Processing", { workspace_id, conversion_type, conversion_id });

    // 1. Load settings
    const { data: settings } = await supabase
      .from("communication_attribution_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const model = settings?.default_model || "last_touch";
    const windowDays = settings?.attribution_window_days || 7;
    const allowEmailFallback = settings?.allow_email_fallback ?? true;
    const includeAssists = settings?.include_assists ?? true;

    // 2. Normalize conversion
    const conversion = await normalizeConversion(
      supabase,
      workspace_id,
      conversion_type,
      conversion_id,
      allowEmailFallback
    );

    if (!conversion) {
      log("Conversion not found or not eligible", { conversion_type, conversion_id });
      return new Response(
        JSON.stringify({ success: true, attributed: false, reason: "conversion_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!conversion.contactId) {
      log("No contact_id resolved for conversion", { conversion_id });
      return new Response(
        JSON.stringify({ success: true, attributed: false, reason: "no_contact" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Find touchpoints
    const touches = await findTouchpoints(
      supabase,
      workspace_id,
      conversion.contactId,
      conversion.occurredAt,
      windowDays
    );

    if (touches.length === 0) {
      log("No touchpoints found within window", { contact_id: conversion.contactId, windowDays });
      return new Response(
        JSON.stringify({ success: true, attributed: false, reason: "no_touchpoints" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Apply model
    const weighted = applyModel(touches, model, includeAssists);
    log("Weighted touches", { count: weighted.length, model });

    // 5. Insert attributions (idempotent via ON CONFLICT DO NOTHING)
    const records = weighted.map((t) => ({
      workspace_id,
      contact_id: conversion.contactId,
      template_id: t.templateId,
      sequence_id: t.sequenceId,
      sequence_step_id: t.sequenceStepId,
      enrollment_id: t.enrollmentId,
      channel: t.channel,
      provider: t.provider,
      context_type: t.contextType,
      context_id: t.contextId,
      conversion_type: conversion.conversionType,
      conversion_id: conversion.conversionId,
      conversion_value: conversion.amount * t.weight,
      currency: conversion.currency,
      attribution_model: model,
      attribution_weight: t.weight,
      touch_type: t.touchType,
      sent_at: t.sentAt,
      conversion_at: conversion.occurredAt,
    }));

    const { error: insertError } = await supabase
      .from("communication_attributions")
      .upsert(records, {
        onConflict: "conversion_id,conversion_type,attribution_model,template_id,sequence_step_id",
        ignoreDuplicates: true,
      });

    if (insertError) {
      log("Insert error", { error: insertError.message });
    }

    // 6. Record automation event
    await supabase
      .from("store_automation_events")
      .insert({
        workspace_id,
        event_type: "attribution_record_created",
        entity_type: conversion.conversionType,
        entity_id: conversion.conversionId,
        payload: {
          model,
          touches_count: weighted.length,
          total_value: conversion.amount,
          contact_id: conversion.contactId,
        },
      })
      .catch(() => {});

    log("Attribution complete", {
      conversion_id,
      touches: weighted.length,
      total_value: conversion.amount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        attributed: true,
        touches: weighted.length,
        model,
        total_value: conversion.amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("Error", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

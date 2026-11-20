import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readScopedMetaLead } from "../_shared/metaLeadFormScope.ts";

class RetryLeadDelivery extends Error {}

/**
 * Meta Webhook Hub — unified endpoint for all Meta webhook events:
 * - leadgen (Lead Ads)
 * - messaging (Messenger + Instagram DM)
 * - page events
 *
 * Validates X-Hub-Signature-256 and persists raw events before processing.
 */

async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  if (!META_APP_SECRET) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expected = `sha256=${hex}`;
  return signature === expected;
}

Deno.serve(async (req) => {
  // GET = webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN") || "fastcrm_meta_verify";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[meta-webhook-hub] Webhook verified");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const signatureValid = await verifySignature(bodyText, signature);

    if (!signatureValid) {
      console.warn("[meta-webhook-hub] Invalid signature — rejecting request");
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);
    const objectType = body.object; // "page", "instagram", etc.

    for (const entry of body.entry || []) {
      const externalId = entry.id;

      // Resolve workspace from asset
      const { data: asset } = await supabase
        .from("meta_assets")
        .select("workspace_id, connection_id, asset_type, page_access_token, restrict_lead_forms")
        .eq("asset_id_external", externalId)
        .eq("selected_for_use", true)
        .maybeSingle();

      const workspaceId = asset?.workspace_id || null;

      // Process changes (leadgen, messaging, etc.)
      for (const change of entry.changes || []) {
        const eventType = change.field; // "leadgen", "feed", etc.

        // Reject non-selected forms before saving the notification or queuing a CRM lead.
        let scopedLead: ReturnType<typeof readScopedMetaLead> = null;
        if (eventType === "leadgen" && asset?.asset_type === "page" && asset.restrict_lead_forms) {
          scopedLead = readScopedMetaLead(change.value, externalId);
          if (!scopedLead) continue;

          const { data: selectedForm, error: formError } = await supabase
            .from("meta_assets")
            .select("id")
            .eq("workspace_id", asset.workspace_id)
            .eq("connection_id", asset.connection_id)
            .eq("asset_type", "lead_form")
            .eq("asset_id_external", scopedLead.formId)
            .eq("metadata_json->>linked_page_id", scopedLead.pageId)
            .eq("selected_for_use", true)
            .maybeSingle();

          if (formError) throw new RetryLeadDelivery("Could not verify the selected form");
          if (!selectedForm) continue;

          await queueScopedLead(supabase, asset.workspace_id, scopedLead, change.value);
        }

        // Persist raw event
        const { data: webhookEvent } = await supabase
          .from("meta_webhook_events")
          .insert({
            workspace_id: workspaceId,
            object_type: objectType,
            event_type: eventType,
            signature_valid: signatureValid,
            payload_json: { entry_id: externalId, change },
            processing_status: workspaceId ? "received" : "skipped",
          })
          .select("id")
          .single();

        if (!workspaceId || !asset) continue;

        // Route by event type
        if (eventType === "leadgen") {
          if (!scopedLead) await handleLeadgen(supabase, workspaceId, change.value);
          if (webhookEvent) {
            await supabase.from("meta_webhook_events")
              .update({ processing_status: "processed", processed_at: new Date().toISOString() })
              .eq("id", webhookEvent.id);
          }
        }
      }

      // Process messaging events (Messenger / IG DM)
      for (const messagingEvent of entry.messaging || []) {
        // Persist raw
        await supabase.from("meta_webhook_events").insert({
          workspace_id: workspaceId,
          object_type: objectType,
          event_type: "messaging",
          signature_valid: signatureValid,
          payload_json: { entry_id: externalId, messaging: messagingEvent },
          processing_status: workspaceId ? "received" : "skipped",
        });

        if (!workspaceId || !asset) continue;

        await handleMessaging(supabase, workspaceId, asset, messagingEvent, objectType);
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("[meta-webhook-hub] Error:", error);
    if (error instanceof RetryLeadDelivery) {
      return new Response("LEAD_DELIVERY_RETRY", { status: 503 });
    }
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
});

async function queueScopedLead(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  lead: NonNullable<ReturnType<typeof readScopedMetaLead>>,
  value: any,
) {
  // A notification may already have been handled while this Page used legacy routing.
  const { data: existing, error: lookupError } = await supabase
    .from("meta_leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("lead_id_external", lead.leadId)
    .limit(1);
  if (lookupError) throw new RetryLeadDelivery("Could not check for an existing lead");
  if (existing?.length) return;

  // The unique key closes the race between simultaneous deliveries of the same lead.
  const { error: insertError } = await supabase.from("meta_leads").upsert({
    workspace_id: workspaceId,
    page_id: lead.pageId,
    form_id: lead.formId,
    lead_id_external: lead.leadId,
    scoped_submission_id: lead.leadId,
    ad_id: value.ad_id,
    adset_id: value.adgroup_id,
    platform: "facebook",
    raw_payload_json: value,
    processing_status: "pending",
  }, { onConflict: "workspace_id,scoped_submission_id", ignoreDuplicates: true });
  if (insertError) throw new RetryLeadDelivery("Could not save the selected form lead");
}

async function handleLeadgen(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  value: any
) {
  try {
    const leadgenId = value.leadgen_id;
    const formId = value.form_id;
    const pageId = value.page_id;
    const adId = value.ad_id;
    const adgroupId = value.adgroup_id;

    // Insert into meta_leads for async processing
    await supabase.from("meta_leads").insert({
      workspace_id: workspaceId,
      page_id: pageId,
      form_id: formId,
      lead_id_external: leadgenId,
      ad_id: adId,
      adset_id: adgroupId,
      platform: "facebook",
      raw_payload_json: value,
      processing_status: "pending",
      received_at: new Date().toISOString(),
    });

    console.log("[meta-webhook-hub] Lead queued:", leadgenId);
  } catch (err) {
    console.error("[meta-webhook-hub] handleLeadgen error:", err);
  }
}

async function handleMessaging(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  asset: { page_access_token?: string; asset_type?: string },
  messagingEvent: any,
  objectType: string
) {
  try {
    const senderId = messagingEvent.sender?.id;
    const message = messagingEvent.message;
    const timestamp = messagingEvent.timestamp;

    if (!message || !senderId) return;
    if (message.is_echo) return;

    const channel = objectType === "instagram" ? "instagram" : "messenger";
    const recipientId = messagingEvent.recipient?.id;
    const externalThreadId = `${channel}_${senderId}_${recipientId}`;

    // Import normalize layer dynamically
    const { normalizeIncomingMessage } = await import("../_shared/normalize-message.ts");

    const attachments: any[] = [];
    if (message.attachments) {
      for (const att of message.attachments) {
        attachments.push({ type: att.type, url: att.payload?.url });
      }
    }

    const result = await normalizeIncomingMessage(supabase, {
      workspace_id: workspaceId,
      channel,
      sender_id: senderId,
      content: message.text || "",
      attachments,
      external_thread_id: externalThreadId,
      external_message_id: message.mid || undefined,
      timestamp: new Date(timestamp).toISOString(),
      channel_metadata: {
        [`${channel}_sender_id`]: senderId,
        [`${channel}_recipient_id`]: recipientId,
      },
    });

    console.log(`[meta-webhook-hub] ${channel} message processed:`, result);

    // Fire-and-forget: conversation signals
    if (result?.contact_id || result?.lead_id) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-conversation-signals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          contact_id: result.contact_id || null,
          lead_id: result.lead_id || null,
        }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error("[meta-webhook-hub] handleMessaging error:", err);
  }
}

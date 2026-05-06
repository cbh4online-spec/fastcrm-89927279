// supabase/functions/voice-log-call/index.ts
// Regista uma chamada manual / completada e espelha no canal omnicanal.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhonePT(input: string): string {
  if (!input) return "";
  const trimmed = input.trim().replace(/[\s().-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
  if (trimmed.startsWith("351")) return `+${trimmed}`;
  return `+351${trimmed}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return jsonResp({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const {
      workspace_id,
      contact_id,
      phone,
      from_number,
      call_direction = "outbound",
      call_type = "phone_call",
      status = "completed",
      started_at,
      duration_seconds,
      outcome,
      notes,
      subject,
      ticket_id,
      deal_id,
      appointment_id,
      product_id,
      assigned_to,
      provider_instance_id,
      voice_number_id,
      provider_call_id,
      country = "PT",
    } = body ?? {};

    if (!workspace_id) return jsonResp({ error: "workspace_id obrigatório" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Membership
    const { data: membership } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return jsonResp({ error: "Forbidden" }, 403);

    const normalizedPhone = phone ? normalizePhonePT(phone) : null;
    const normalizedFrom = from_number ? normalizePhonePT(from_number) : null;
    const isInbound = call_direction === "inbound";

    // Tenta resolver contacto por telefone se não fornecido
    let resolvedContactId: string | null = contact_id ?? null;
    if (!resolvedContactId && normalizedPhone) {
      const { data: contact } = await admin
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspace_id)
        .or(`phone.eq.${normalizedPhone},mobile_phone.eq.${normalizedPhone}`)
        .limit(1)
        .maybeSingle();
      if (contact) resolvedContactId = contact.id;
    }

    // Garante uma conversation 'phone' agrupada por contacto
    let conversationId: string | null = null;
    if (resolvedContactId) {
      const externalThreadId = `phone:${resolvedContactId}`;
      const { data: existing } = await admin
        .from("conversations")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("channel", "phone")
        .eq("external_thread_id", externalThreadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        conversationId = existing.id;
      } else {
        const { data: created } = await admin
          .from("conversations")
          .insert({
            workspace_id,
            channel: "phone",
            external_thread_id: externalThreadId,
            contact_id: resolvedContactId,
            status: "open",
            channel_metadata: { country, source: "voicehub" },
            last_message_at: started_at ?? new Date().toISOString(),
          })
          .select("id")
          .single();
        conversationId = created?.id ?? null;
      }
    }

    // Insert call log
    const { data: callLog, error: callErr } = await admin
      .from("voice_call_logs")
      .insert({
        workspace_id,
        provider_instance_id: provider_instance_id ?? null,
        voice_number_id: voice_number_id ?? null,
        communication_conversation_id: conversationId,
        contact_id: resolvedContactId,
        ticket_id: ticket_id ?? null,
        deal_id: deal_id ?? null,
        appointment_id: appointment_id ?? null,
        product_id: product_id ?? null,
        assigned_to: assigned_to ?? userId,
        created_by: userId,
        call_direction,
        call_type,
        status,
        from_number: from_number ?? null,
        to_number: phone ?? null,
        normalized_from_number: normalizedFrom,
        normalized_to_number: normalizedPhone,
        country,
        started_at: started_at ?? new Date().toISOString(),
        ended_at:
          duration_seconds && started_at
            ? new Date(new Date(started_at).getTime() + duration_seconds * 1000).toISOString()
            : null,
        duration_seconds: duration_seconds ?? null,
        subject: subject ?? null,
        notes: notes ?? null,
        outcome: outcome ?? null,
        provider_call_id: provider_call_id ?? null,
      })
      .select()
      .single();

    if (callErr) {
      console.error("voice-log-call insert error", callErr);
      return jsonResp({ error: "internal_error", details: callErr.message }, 200);
    }

    // Espelho no omnicanal
    if (conversationId) {
      const preview = subject || notes || `Chamada ${callDirectionLabel(call_direction)} (${duration_seconds ?? 0}s)`;
      await admin.from("messages").insert({
        conversation_id: conversationId,
        workspace_id,
        direction: isInbound ? "inbound" : "outbound",
        content: preview,
        sender_id: userId,
        sent_at: started_at ?? new Date().toISOString(),
        message_type: "call_log",
      });
      await admin
        .from("conversations")
        .update({
          last_message_at: started_at ?? new Date().toISOString(),
          last_message_preview: preview,
        })
        .eq("id", conversationId);
    }

    return jsonResp({ call_log: callLog, conversation_id: conversationId }, 200);
  } catch (e) {
    console.error("voice-log-call fatal", e);
    return jsonResp({ error: "internal_error", message: String(e) }, 200);
  }
});

function jsonResp(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function callDirectionLabel(d: string): string {
  switch (d) {
    case "inbound":
      return "recebida";
    case "outbound":
      return "efetuada";
    case "missed":
      return "perdida";
    case "scheduled":
      return "agendada";
    default:
      return d;
  }
}

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  workspace_id?: string;
  message_id: string;
  conversation_id?: string;
  media_url?: string;
  language?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startedAt = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp({ error: "missing_authorization" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return jsonResp({ error: "invalid_auth" }, 401);

    const body = (await req.json()) as Body;
    if (!body.message_id) return jsonResp({ error: "message_id_required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load message
    const { data: msg, error: msgErr } = await admin
      .from("messages")
      .select("id, workspace_id, conversation_id, message_type, media_url, media_mime_type, channel_metadata:metadata")
      .eq("id", body.message_id)
      .maybeSingle();
    if (msgErr || !msg) return jsonResp({ error: "message_not_found" }, 404);
    if (msg.message_type !== "audio") return jsonResp({ error: "not_audio_message" }, 400);

    const workspaceId = msg.workspace_id as string;

    // Verify membership
    const { data: membership } = await userClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return jsonResp({ error: "access_denied" }, 403);

    const mediaUrl = body.media_url || (msg.media_url as string | null) || extractMediaUrl(msg.channel_metadata);
    if (!mediaUrl) return jsonResp({ error: "no_media_url" }, 400);

    const language = body.language || "pt-PT";

    // Upsert insight row → status processing
    const { data: existing } = await admin
      .from("whatsapp_audio_insights")
      .select("id")
      .eq("message_id", body.message_id)
      .maybeSingle();

    let insightId = existing?.id as string | undefined;
    if (!insightId) {
      const { data: ins, error: insErr } = await admin
        .from("whatsapp_audio_insights")
        .insert({
          workspace_id: workspaceId,
          message_id: body.message_id,
          conversation_id: msg.conversation_id,
          media_url: mediaUrl,
          language,
          transcription_status: "processing",
        })
        .select("id")
        .single();
      if (insErr) return jsonResp({ error: insErr.message }, 500);
      insightId = ins.id;
    } else {
      await admin.from("whatsapp_audio_insights").update({
        transcription_status: "processing",
        transcription_error: null,
        media_url: mediaUrl,
        language,
      }).eq("id", insightId);
    }

    await emitEvent(admin, workspaceId, msg.conversation_id, "whatsapp.audio.transcription.started", {
      message_id: body.message_id, insight_id: insightId,
    });

    // ============ Transcription via ElevenLabs Scribe ============
    if (!ELEVENLABS_API_KEY) {
      await markFailed(admin, insightId, "ELEVENLABS_API_KEY_not_configured");
      await logProcessing(admin, workspaceId, body.message_id, "elevenlabs", "transcription", null, null, false, "ELEVENLABS_API_KEY_not_configured", Date.now() - startedAt);
      return jsonResp({ error: "transcription_provider_not_configured" }, 500);
    }

    let audioBlob: Blob;
    try {
      const audioResp = await fetch(mediaUrl);
      if (!audioResp.ok) throw new Error(`download_failed_${audioResp.status}`);
      audioBlob = await audioResp.blob();
    } catch (e) {
      const err = e instanceof Error ? e.message : "download_failed";
      await markFailed(admin, insightId, err);
      await logProcessing(admin, workspaceId, body.message_id, "elevenlabs", "transcription", { media_url: mediaUrl }, null, false, err, Date.now() - startedAt);
      return jsonResp({ error: err }, 500);
    }

    const fd = new FormData();
    fd.append("file", audioBlob, "audio");
    fd.append("model_id", "scribe_v2");
    fd.append("language_code", mapLang(language));

    const scribeResp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: fd,
    });

    if (!scribeResp.ok) {
      const errText = await scribeResp.text();
      await markFailed(admin, insightId, `scribe_${scribeResp.status}`);
      await logProcessing(admin, workspaceId, body.message_id, "elevenlabs", "transcription", { language }, { status: scribeResp.status, body: errText.slice(0, 500) }, false, errText.slice(0, 500), Date.now() - startedAt);
      return jsonResp({ error: "transcription_failed", details: errText.slice(0, 200) }, 500);
    }

    const transcription = await scribeResp.json();
    const text = (transcription.text as string) || "";
    const words = transcription.words as Array<{ end?: number }> | undefined;
    const durationSec = words && words.length > 0 ? Math.round(words[words.length - 1].end ?? 0) : null;

    const nowIso = new Date().toISOString();
    await admin.from("whatsapp_audio_insights").update({
      transcription_status: "completed",
      transcription_text: text,
      transcription_provider: "elevenlabs:scribe_v2",
      duration_seconds: durationSec,
      transcription_completed_at: nowIso,
      processing_seconds: Math.round((Date.now() - startedAt) / 1000),
    }).eq("id", insightId);

    await logProcessing(admin, workspaceId, body.message_id, "elevenlabs", "transcription", { language, media_url: mediaUrl }, { length: text.length, duration: durationSec }, true, null, Date.now() - startedAt);
    await emitEvent(admin, workspaceId, msg.conversation_id, "whatsapp.audio.transcribed", {
      message_id: body.message_id, insight_id: insightId, length: text.length,
    });

    return jsonResp({
      ok: true,
      insight_id: insightId,
      transcription_text: text,
      duration_seconds: durationSec,
    });
  } catch (e) {
    console.error("[whatsapp-transcribe-audio] error", e);
    return jsonResp({ error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapLang(lang: string): string {
  // ElevenLabs uses ISO 639-3
  const lower = lang.toLowerCase();
  if (lower.startsWith("pt")) return "por";
  if (lower.startsWith("en")) return "eng";
  if (lower.startsWith("es")) return "spa";
  if (lower.startsWith("fr")) return "fra";
  return "por";
}

function extractMediaUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  if (typeof m.media_url === "string") return m.media_url;
  const atts = m.attachments as Array<{ url?: string; type?: string }> | undefined;
  const audio = atts?.find((a) => a.type?.includes("audio"));
  return audio?.url ?? null;
}

async function markFailed(admin: ReturnType<typeof createClient>, id: string | undefined, error: string) {
  if (!id) return;
  await admin.from("whatsapp_audio_insights").update({
    transcription_status: "failed",
    transcription_error: error,
  }).eq("id", id);
}

async function emitEvent(admin: ReturnType<typeof createClient>, workspaceId: string, conversationId: string | null, eventType: string, payload: Record<string, unknown>) {
  try {
    await admin.from("whatsapp_communication_events").insert({
      workspace_id: workspaceId,
      event_type: eventType,
      entity_type: "message",
      entity_id: payload.message_id ?? null,
      conversation_id: conversationId,
      payload,
    });
  } catch (e) {
    console.error("[emitEvent] error", e);
  }
}

async function logProcessing(
  admin: ReturnType<typeof createClient>,
  workspaceId: string,
  sourceId: string,
  provider: string,
  operation: string,
  request: unknown,
  response: unknown,
  success: boolean,
  error: string | null,
  durationMs: number,
) {
  try {
    await admin.from("ai_processing_logs").insert({
      workspace_id: workspaceId,
      source_type: "whatsapp_audio",
      source_id: sourceId,
      provider,
      operation,
      request_payload: request as never,
      response_payload: response as never,
      success,
      error,
      duration_ms: durationMs,
    });
  } catch (e) {
    console.error("[logProcessing] error", e);
  }
}

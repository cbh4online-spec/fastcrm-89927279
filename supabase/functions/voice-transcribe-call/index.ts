// Fase 1Q.2 — Voice Transcription
// Transcreve a gravação de uma chamada usando Lovable AI (Gemini 2.5 Flash multimodal).
// Input: { call_log_id }
// Reads recording_storage_path from voice_call_logs, downloads from voice-recordings bucket,
// envia áudio em base64 para o gateway, guarda transcription_text e segmentos em voice_call_intelligence.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const TRANSCRIBE_MODEL = "google/gemini-2.5-flash";

interface Segment {
  speaker?: string;
  start_seconds?: number;
  end_seconds?: number;
  text: string;
}

async function downloadRecording(supabase: any, path: string) {
  const { data, error } = await supabase.storage.from("voice-recordings").download(path);
  if (error) throw new Error(`download_failed: ${error.message}`);
  const buffer = await data.arrayBuffer();
  // base64 encode
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return {
    base64: btoa(binary),
    mimeType: data.type || "audio/mpeg",
    size: bytes.length,
  };
}

async function callLovableAI(audioBase64: string, mimeType: string) {
  const systemPrompt = `És um sistema de transcrição de chamadas telefónicas em português de Portugal.
Devolve a transcrição completa com diarização (speaker_agent / speaker_customer) e timestamps aproximados em segundos.
Responde EXCLUSIVAMENTE através da function call "return_transcription".`;

  const body = {
    model: TRANSCRIBE_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcreve esta chamada com diarização e timestamps." },
          {
            type: "input_audio",
            input_audio: { data: audioBase64, format: mimeType.includes("wav") ? "wav" : "mp3" },
          },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "return_transcription",
          description: "Devolve a transcrição estruturada da chamada",
          parameters: {
            type: "object",
            properties: {
              language: { type: "string", description: "ex: pt-PT" },
              full_text: { type: "string" },
              segments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    speaker: { type: "string", enum: ["agent", "customer", "unknown"] },
                    start_seconds: { type: "number" },
                    end_seconds: { type: "number" },
                    text: { type: "string" },
                  },
                  required: ["text"],
                },
              },
            },
            required: ["full_text", "segments"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "return_transcription" } },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ai_gateway_${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("ai_no_tool_call");
  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY_missing");
    const { call_log_id } = await req.json();
    if (!call_log_id) throw new Error("call_log_id_required");

    const { data: call, error: callErr } = await supabase
      .from("voice_call_logs")
      .select("id, workspace_id, recording_storage_path, recording_url, transcription_status")
      .eq("id", call_log_id)
      .maybeSingle();

    if (callErr || !call) throw new Error("call_not_found");
    if (!call.recording_storage_path) throw new Error("no_recording_path");

    await supabase
      .from("voice_call_logs")
      .update({ transcription_status: "processing", transcription_error: null })
      .eq("id", call_log_id);

    const audio = await downloadRecording(supabase, call.recording_storage_path);
    const result = await callLovableAI(audio.base64, audio.mimeType);

    const segments: Segment[] = Array.isArray(result.segments) ? result.segments : [];
    const fullText: string = result.full_text || segments.map((s) => s.text).join(" ");
    const language: string = result.language || "pt-PT";

    // Substitui segmentos antigos
    await supabase.from("voice_call_intelligence").delete().eq("call_log_id", call_log_id);
    if (segments.length > 0) {
      const rows = segments.map((s, i) => ({
        workspace_id: call.workspace_id,
        call_log_id,
        segment_index: i,
        speaker: s.speaker ?? null,
        start_seconds: s.start_seconds ?? null,
        end_seconds: s.end_seconds ?? null,
        text: s.text,
      }));
      const { error: insErr } = await supabase.from("voice_call_intelligence").insert(rows);
      if (insErr) console.error("intelligence insert error", insErr);
    }

    await supabase
      .from("voice_call_logs")
      .update({
        transcription_status: "completed",
        transcription_text: fullText,
        transcription_language: language,
        transcription_model: TRANSCRIBE_MODEL,
        transcription_completed_at: new Date().toISOString(),
        recording_size_bytes: audio.size,
        recording_mime_type: audio.mimeType,
      })
      .eq("id", call_log_id);

    // Fire-and-forget: chama analyze
    fetch(`${SUPABASE_URL}/functions/v1/voice-analyze-call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ call_log_id }),
    }).catch((e) => console.error("analyze trigger failed", e));

    return new Response(
      JSON.stringify({ success: true, segments_count: segments.length, language }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("voice-transcribe-call error:", msg);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.call_log_id) {
        await supabase
          .from("voice_call_logs")
          .update({ transcription_status: "failed", transcription_error: msg })
          .eq("id", body.call_log_id);
      }
    } catch (_) { /* ignore */ }
    return new Response(
      JSON.stringify({ success: false, fallback: true, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

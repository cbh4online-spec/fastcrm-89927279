// Fase 1Q.2 — Voice Recording Upload helper
// Devolve signed URL para upload directo ao bucket privado voice-recordings,
// ou aceita upload via multipart/form-data e fá-lo do lado do servidor.
// Após upload, marca call.recording_storage_path e dispara transcrição.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Auth: pega user via JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ct = req.headers.get("content-type") || "";

    // ---- Modo 1: multipart upload directo (file + call_log_id) ----
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const callLogId = form.get("call_log_id") as string | null;
      if (!file || !callLogId) throw new Error("file_and_call_log_id_required");

      const { data: call } = await supabase
        .from("voice_call_logs")
        .select("id, workspace_id")
        .eq("id", callLogId)
        .maybeSingle();
      if (!call) throw new Error("call_not_found");

      // Verificar membership
      const { data: member } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userData.user.id)
        .eq("workspace_id", call.workspace_id)
        .maybeSingle();
      if (!member) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
      const path = `${call.workspace_id}/${callLogId}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("voice-recordings")
        .upload(path, file, { upsert: true, contentType: file.type || "audio/mpeg" });
      if (upErr) throw new Error(`upload_failed: ${upErr.message}`);

      await supabase
        .from("voice_call_logs")
        .update({
          recording_storage_path: path,
          recording_status: "completed",
          recording_mime_type: file.type || "audio/mpeg",
          recording_size_bytes: file.size,
        })
        .eq("id", callLogId);

      // Dispara transcrição
      fetch(`${SUPABASE_URL}/functions/v1/voice-transcribe-call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ call_log_id: callLogId }),
      }).catch((e) => console.error("transcribe trigger failed", e));

      return new Response(
        JSON.stringify({ success: true, path }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Modo 2: signed URL (upload ou playback) ----
    const body = await req.json();
    const { call_log_id, mode = "upload", filename } = body || {};
    if (!call_log_id) throw new Error("call_log_id_required");

    const { data: call } = await supabase
      .from("voice_call_logs")
      .select("id, workspace_id, recording_storage_path")
      .eq("id", call_log_id)
      .maybeSingle();
    if (!call) throw new Error("call_not_found");

    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userData.user.id)
      .eq("workspace_id", call.workspace_id)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "playback") {
      if (!call.recording_storage_path) throw new Error("no_recording");
      const { data: signed, error } = await supabase.storage
        .from("voice-recordings")
        .createSignedUrl(call.recording_storage_path, 60 * 10);
      if (error) throw new Error(`sign_failed: ${error.message}`);
      return new Response(JSON.stringify({ signed_url: signed.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = (filename?.split(".").pop() || "mp3").toLowerCase();
    const path = `${call.workspace_id}/${call_log_id}.${ext}`;
    const { data: signed, error } = await supabase.storage
      .from("voice-recordings")
      .createSignedUploadUrl(path);
    if (error) throw new Error(`sign_failed: ${error.message}`);

    return new Response(
      JSON.stringify({ path, signed_url: signed.signedUrl, token: signed.token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("voice-recording-upload error:", msg);
    return new Response(
      JSON.stringify({ success: false, fallback: true, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recording_id } = await req.json();
    if (!recording_id) {
      return new Response(JSON.stringify({ error: "recording_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording details
    const { data: recording, error: recErr } = await supabase
      .from("meeting_recordings")
      .select("*")
      .eq("id", recording_id)
      .single();

    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status
    await supabase
      .from("meeting_recordings")
      .update({ transcription_status: "processing", updated_at: new Date().toISOString() })
      .eq("id", recording_id);

    // Download audio from storage
    const filePath = recording.file_url || recording.storage_path;
    if (!filePath) {
      return new Response(JSON.stringify({ error: "No audio file found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract bucket and path from storage URL or path
    let audioBlob: Blob;
    if (filePath.startsWith("http")) {
      const audioResp = await fetch(filePath);
      if (!audioResp.ok) throw new Error("Failed to download audio file");
      audioBlob = await audioResp.blob();
    } else {
      // Assume it's a storage path like "bucket/path"
      const parts = filePath.split("/");
      const bucket = parts[0];
      const path = parts.slice(1).join("/");
      const { data: fileData, error: fileErr } = await supabase.storage
        .from(bucket)
        .download(path);
      if (fileErr || !fileData) throw new Error("Failed to download from storage");
      audioBlob = fileData;
    }

    // Call ElevenLabs Scribe API
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model_id", "scribe_v2");
    formData.append("tag_audio_events", "true");
    formData.append("diarize", "true");

    const scribeResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!scribeResponse.ok) {
      const errorText = await scribeResponse.text();
      console.error("[meeting-transcribe] ElevenLabs error:", scribeResponse.status, errorText);
      await supabase
        .from("meeting_recordings")
        .update({ transcription_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", recording_id);
      return new Response(JSON.stringify({ error: "Transcription failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcription = await scribeResponse.json();

    // Process words into segments grouped by speaker
    const words = transcription.words || [];
    if (words.length === 0) {
      await supabase
        .from("meeting_recordings")
        .update({ transcription_status: "completed", updated_at: new Date().toISOString() })
        .eq("id", recording_id);
      return new Response(JSON.stringify({ success: true, segments: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group words into segments by speaker
    const segments: Array<{
      recording_id: string;
      speaker_label: string;
      content: string;
      start_time_ms: number;
      end_time_ms: number;
      confidence: number;
    }> = [];

    let currentSpeaker = words[0].speaker || "Speaker 1";
    let currentWords: string[] = [];
    let segStartMs = Math.round((words[0].start || 0) * 1000);
    let segEndMs = 0;
    let confidenceSum = 0;
    let wordCount = 0;

    for (const word of words) {
      const speaker = word.speaker || "Speaker 1";
      const startMs = Math.round((word.start || 0) * 1000);
      const endMs = Math.round((word.end || 0) * 1000);

      if (speaker !== currentSpeaker) {
        // Save current segment
        if (currentWords.length > 0) {
          segments.push({
            recording_id,
            speaker_label: currentSpeaker,
            content: currentWords.join(" "),
            start_time_ms: segStartMs,
            end_time_ms: segEndMs,
            confidence: wordCount > 0 ? confidenceSum / wordCount : 0.9,
          });
        }
        // Start new segment
        currentSpeaker = speaker;
        currentWords = [];
        segStartMs = startMs;
        confidenceSum = 0;
        wordCount = 0;
      }

      currentWords.push(word.text || "");
      segEndMs = endMs;
      confidenceSum += word.confidence || 0.9;
      wordCount++;
    }

    // Save last segment
    if (currentWords.length > 0) {
      segments.push({
        recording_id,
        speaker_label: currentSpeaker,
        content: currentWords.join(" "),
        start_time_ms: segStartMs,
        end_time_ms: segEndMs,
        confidence: wordCount > 0 ? confidenceSum / wordCount : 0.9,
      });
    }

    // Insert segments
    if (segments.length > 0) {
      const { error: segErr } = await supabase
        .from("meeting_transcript_segments")
        .insert(segments);
      if (segErr) {
        console.error("[meeting-transcribe] Error inserting segments:", segErr);
      }
    }

    // Count unique speakers
    const uniqueSpeakers = new Set(segments.map(s => s.speaker_label));
    const totalDurationMs = segments.length > 0 ? segments[segments.length - 1].end_time_ms : 0;

    // Update recording
    await supabase
      .from("meeting_recordings")
      .update({
        transcription_status: "transcribed",
        speaker_count: uniqueSpeakers.size,
        duration_seconds: Math.round(totalDurationMs / 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", recording_id);

    // Auto-trigger AI analysis
    try {
      await supabase.functions.invoke("ai-transcript-analyze", {
        body: { recording_id },
      });
    } catch (e) {
      console.error("[meeting-transcribe] Auto-analyze trigger failed:", e);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      segments: segments.length,
      speakers: uniqueSpeakers.size,
      duration_seconds: Math.round(totalDurationMs / 1000),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[meeting-transcribe] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

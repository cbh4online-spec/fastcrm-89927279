const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TTSRequest {
  text: string;
  voice_id?: string;
  source_type: "proposal" | "summary" | "copilot" | "custom";
  source_id?: string;
  workspace_id: string;
  use_cache?: boolean;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      text,
      voice_id: requestedVoiceId,
      source_type,
      source_id,
      workspace_id,
      use_cache = true,
      voice_settings: overrideSettings,
    }: TTSRequest = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error("text is required and cannot be empty");
    }

    const truncatedText = text.slice(0, 5000);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get workspace voice settings
    const { data: settings } = await supabase
      .from("voice_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .single();

    const voiceId =
      requestedVoiceId ?? settings?.default_voice_id ?? "pNInz6obpgDQGcFmaJgB";
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsApiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    // 2. Check cache
    const cacheKeyData = new TextEncoder().encode(
      `${truncatedText}::${voiceId}`
    );
    const hashBuffer = await crypto.subtle.digest("SHA-256", cacheKeyData);
    const cacheKey = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (use_cache) {
      const { data: cached } = await supabase
        .from("voice_audio_cache")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("cache_key", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (cached) {
        const { data: signedUrlData } = await supabase.storage
          .from("voice-audio")
          .createSignedUrl(cached.storage_path, 3600);

        await supabase
          .from("voice_audio_cache")
          .update({
            play_count: cached.play_count + 1,
            last_played_at: new Date().toISOString(),
          })
          .eq("id", cached.id);

        return new Response(
          JSON.stringify({
            audio_url: signedUrlData?.signedUrl,
            cached: true,
            cache_id: cached.id,
            duration_seconds: cached.duration_seconds,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 3. Generate TTS
    const effectiveSettings = {
      stability:
        overrideSettings?.stability ?? settings?.voice_stability ?? 0.5,
      similarity_boost:
        overrideSettings?.similarity_boost ??
        settings?.voice_similarity_boost ??
        0.75,
      style: overrideSettings?.style ?? settings?.voice_style ?? 0.0,
      use_speaker_boost:
        overrideSettings?.use_speaker_boost ??
        settings?.voice_use_speaker_boost ??
        true,
    };

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: "eleven_multilingual_v2",
          voice_settings: effectiveSettings,
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      throw new Error(
        `ElevenLabs TTS error: ${ttsResponse.status} — ${errorText}`
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // 4. Upload to Storage
    const fileName = `${workspace_id}/${source_type}/${source_id ?? "misc"}/${cacheKey.slice(0, 16)}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("voice-audio")
      .upload(fileName, audioBytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: signedUrlData } = await supabase.storage
      .from("voice-audio")
      .createSignedUrl(fileName, 3600);

    const estimatedDurationSeconds = (truncatedText.length / 5 / 150) * 60;

    if (use_cache) {
      await supabase.from("voice_audio_cache").insert({
        workspace_id,
        cache_key: cacheKey,
        storage_path: fileName,
        source_type,
        source_id: source_id ?? null,
        text_length: truncatedText.length,
        voice_id: voiceId,
        duration_seconds: estimatedDurationSeconds,
        file_size_bytes: audioBytes.byteLength,
        play_count: 1,
        last_played_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        audio_url: signedUrlData?.signedUrl,
        cached: false,
        duration_seconds: estimatedDurationSeconds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

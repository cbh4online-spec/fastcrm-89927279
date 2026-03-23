const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ProposalTokenRequest {
  proposal_id: string;
  workspace_id: string;
  force_regenerate?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      proposal_id,
      workspace_id,
      force_regenerate = false,
    }: ProposalTokenRequest = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch proposal and voice settings
    const [proposalResult, settingsResult] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, title, content, items:proposal_items(description, value)")
        .eq("id", proposal_id)
        .eq("workspace_id", workspace_id)
        .single(),
      supabase
        .from("voice_settings")
        .select("*")
        .eq("workspace_id", workspace_id)
        .single(),
    ]);

    const proposal = proposalResult.data;
    const settings = settingsResult.data;

    if (!proposal) throw new Error("Proposal not found");
    if (!settings?.proposal_narration_enabled) {
      throw new Error("Proposal narration is disabled for this workspace");
    }

    // 2. Build narration text
    const narrationText = buildProposalNarration(proposal);
    const cacheKey = await computeCacheKey(
      narrationText,
      settings.default_voice_id
    );

    // 3. Check cache
    if (!force_regenerate) {
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

    // 4. Generate TTS via ElevenLabs API
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsApiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    const voiceId = settings.default_voice_id;
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
          text: narrationText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: settings.voice_stability,
            similarity_boost: settings.voice_similarity_boost,
            style: settings.voice_style,
            use_speaker_boost: settings.voice_use_speaker_boost,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      throw new Error(
        `ElevenLabs API error: ${ttsResponse.status} — ${errorText}`
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // 5. Upload to Supabase Storage
    const fileName = `${workspace_id}/proposals/${proposal_id}/${cacheKey.slice(0, 16)}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("voice-audio")
      .upload(fileName, audioBytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    // 6. Create signed URL
    const { data: signedUrlData } = await supabase.storage
      .from("voice-audio")
      .createSignedUrl(fileName, 3600);

    // 7. Cache the result
    const fileSizeBytes = audioBytes.byteLength;
    const estimatedDurationSeconds = (narrationText.length / 5 / 150) * 60;

    // Delete any existing stale cache entries for this proposal
    await supabase
      .from("voice_audio_cache")
      .delete()
      .eq("workspace_id", workspace_id)
      .eq("source_type", "proposal")
      .eq("source_id", proposal_id);

    const { data: cacheEntry } = await supabase
      .from("voice_audio_cache")
      .insert({
        workspace_id,
        cache_key: cacheKey,
        storage_path: fileName,
        public_url: signedUrlData?.signedUrl,
        source_type: "proposal",
        source_id: proposal_id,
        text_length: narrationText.length,
        voice_id: voiceId,
        voice_name: settings.default_voice_name,
        duration_seconds: estimatedDurationSeconds,
        file_size_bytes: fileSizeBytes,
        play_count: 1,
        last_played_at: new Date().toISOString(),
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        audio_url: signedUrlData?.signedUrl,
        cached: false,
        cache_id: cacheEntry?.id,
        duration_seconds: estimatedDurationSeconds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Proposal narration error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildProposalNarration(proposal: {
  title: string;
  content?: string;
  items?: Array<{ description: string; value: number }>;
}): string {
  const parts: string[] = [];

  parts.push(`Proposta comercial: ${proposal.title}.`);

  if (proposal.content) {
    const plainText = proposal.content
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (plainText.length > 0) {
      parts.push(plainText);
    }
  }

  if (proposal.items && proposal.items.length > 0) {
    parts.push("Esta proposta inclui os seguintes itens:");
    proposal.items.forEach((item, i) => {
      const valueStr = item.value
        ? `, no valor de ${item.value.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}`
        : "";
      parts.push(`${i + 1}. ${item.description}${valueStr}.`);
    });
  }

  return parts.join(" ");
}

async function computeCacheKey(
  text: string,
  voiceId: string
): Promise<string> {
  const data = new TextEncoder().encode(`${text}::${voiceId}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

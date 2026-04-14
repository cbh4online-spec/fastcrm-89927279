import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MUX_API_BASE = "https://api.mux.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID");
  const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    return new Response(
      JSON.stringify({ error: "Mux credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const userId = user.id;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ──────────── CREATE LIVE STREAM ────────────
    if (action === "create" && req.method === "POST") {
      const body = await req.json();
      const livestreamId = body.livestream_id;

      if (!livestreamId) {
        return new Response(
          JSON.stringify({ error: "livestream_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify ownership
      const { data: live, error: liveErr } = await supabase
        .from("c2c_livestreams")
        .select("id, seller_id")
        .eq("id", livestreamId)
        .maybeSingle();

      if (liveErr || !live) {
        return new Response(
          JSON.stringify({ error: "Livestream not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (live.seller_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Only the owner can create a stream" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create Mux live stream
      const muxRes = await fetch(`${MUX_API_BASE}/video/v1/live-streams`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${muxAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playback_policy: ["public"],
          new_asset_settings: { playback_policy: ["public"] },
          latency_mode: "low",
          max_continuous_duration: 43200, // 12h max
        }),
      });

      if (!muxRes.ok) {
        const errBody = await muxRes.text();
        console.error("Mux create error:", muxRes.status, errBody);
        return new Response(
          JSON.stringify({ error: `Mux API error: ${muxRes.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const muxData = await muxRes.json();
      const muxStream = muxData.data;

      // Save Mux IDs in our DB
      const { error: updateErr } = await supabase
        .from("c2c_livestreams")
        .update({
          mux_stream_id: muxStream.id,
          mux_playback_id: muxStream.playback_ids?.[0]?.id || null,
          mux_stream_key: muxStream.stream_key,
        })
        .eq("id", livestreamId)
        .eq("seller_id", userId);

      if (updateErr) {
        console.error("DB update error:", updateErr);
        return new Response(
          JSON.stringify({ error: "Failed to save stream info" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          stream_key: muxStream.stream_key,
          playback_id: muxStream.playback_ids?.[0]?.id,
          rtmp_url: "rtmps://global-live.mux.com:443/app",
          srt_url: `srt://global-live.mux.com:5000?streamid=${muxStream.stream_key}`,
          whip_url: `https://global-live.mux.com/api/v1/whip?token=${muxStream.stream_key}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──────────── GET PLAYBACK INFO ────────────
    if (action === "playback" && req.method === "GET") {
      const livestreamId = url.searchParams.get("livestream_id");
      if (!livestreamId) {
        return new Response(
          JSON.stringify({ error: "livestream_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: live } = await supabase
        .from("c2c_livestreams")
        .select("mux_playback_id, status")
        .eq("id", livestreamId)
        .maybeSingle();

      if (!live?.mux_playback_id) {
        return new Response(
          JSON.stringify({ error: "No playback available" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          playback_id: live.mux_playback_id,
          playback_url: `https://stream.mux.com/${live.mux_playback_id}.m3u8`,
          thumbnail_url: `https://image.mux.com/${live.mux_playback_id}/thumbnail.webp`,
          status: live.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──────────── DELETE/DISABLE STREAM ────────────
    if (action === "end" && req.method === "POST") {
      const body = await req.json();
      const livestreamId = body.livestream_id;

      if (!livestreamId) {
        return new Response(
          JSON.stringify({ error: "livestream_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: live } = await supabase
        .from("c2c_livestreams")
        .select("mux_stream_id, seller_id")
        .eq("id", livestreamId)
        .maybeSingle();

      if (!live || live.seller_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Disable the Mux live stream (keeps the asset for replay)
      if (live.mux_stream_id) {
        const disableRes = await fetch(
          `${MUX_API_BASE}/video/v1/live-streams/${live.mux_stream_id}/disable`,
          {
            method: "PUT",
            headers: { Authorization: `Basic ${muxAuth}` },
          }
        );
        if (!disableRes.ok) {
          console.error("Mux disable error:", disableRes.status);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use ?action=create|playback|end" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mux-livestream error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

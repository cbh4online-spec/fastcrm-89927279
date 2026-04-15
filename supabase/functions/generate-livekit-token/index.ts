import { corsHeaders } from "@supabase/supabase-js/cors";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "LiveKit credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { room_name, participant_identity, participant_name, is_publisher } = body;

    if (!room_name || !participant_identity) {
      return new Response(
        JSON.stringify({ error: "room_name and participant_identity are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participant_identity,
      name: participant_name || participant_identity,
      ttl: "4h",
    });

    token.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: is_publisher === true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    return new Response(
      JSON.stringify({ token: jwt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate token" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

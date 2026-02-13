import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Token refresh helpers ──

async function refreshZoomToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token refresh failed: ${err}`);
  }

  return res.json();
}

async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }

  return res.json();
}

// ── Get valid access token (refresh if expired) ──

async function getValidZoomToken(
  config: any,
  adminClient: any
): Promise<string> {
  const now = new Date();
  const expiresAt = config.zoom_token_expires_at ? new Date(config.zoom_token_expires_at) : null;

  // If token exists and not expired (with 5 min buffer), use it
  if (config.zoom_access_token && expiresAt && expiresAt.getTime() - 300000 > now.getTime()) {
    return config.zoom_access_token;
  }

  // Need to refresh
  if (!config.zoom_refresh_token) {
    throw new Error("Zoom não está conectado. Faça a ligação nas configurações.");
  }

  const tokenData = await refreshZoomToken(
    config.zoom_refresh_token,
    config.zoom_client_id,
    config.zoom_client_secret_encrypted
  );

  // Update stored tokens
  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
  await adminClient
    .from("workspace_video_config")
    .update({
      zoom_access_token: tokenData.access_token,
      zoom_refresh_token: tokenData.refresh_token || config.zoom_refresh_token,
      zoom_token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.id);

  return tokenData.access_token;
}

async function getValidGoogleToken(
  config: any,
  adminClient: any
): Promise<string> {
  const now = new Date();
  const expiresAt = config.google_token_expires_at ? new Date(config.google_token_expires_at) : null;

  // If token exists and not expired (with 5 min buffer), use it
  if (config.google_access_token && expiresAt && expiresAt.getTime() - 300000 > now.getTime()) {
    return config.google_access_token;
  }

  // Need to refresh
  if (!config.google_refresh_token) {
    throw new Error("Google Meet não está conectado. Faça a ligação nas configurações.");
  }

  // Use platform-level OAuth credentials for token refresh
  const platformClientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const platformClientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

  if (!platformClientId || !platformClientSecret) {
    throw new Error("Credenciais OAuth do Google não configuradas na plataforma");
  }

  const tokenData = await refreshGoogleToken(
    config.google_refresh_token,
    platformClientId,
    platformClientSecret
  );

  // Update stored tokens
  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
  await adminClient
    .from("workspace_video_config")
    .update({
      google_access_token: tokenData.access_token,
      google_token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.id);

  return tokenData.access_token;
}

// ── Zoom meeting creation ──

async function createZoomMeeting(
  accessToken: string,
  topic: string,
  startTime: string,
  duration: number
): Promise<{ join_url: string; id: number }> {
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startTime,
      duration,
      timezone: "UTC",
      settings: {
        join_before_host: true,
        waiting_room: false,
        auto_recording: "none",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom create meeting failed: ${err}`);
  }

  return res.json();
}

// ── Google Meet event creation ──

async function createGoogleMeetEvent(
  accessToken: string,
  calendarEmail: string,
  summary: string,
  startTime: string,
  endTime: string
): Promise<{ meetLink: string; eventId: string }> {
  const calendarId = calendarEmail || "primary";
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        start: { dateTime: startTime, timeZone: "UTC" },
        end: { dateTime: endTime, timeZone: "UTC" },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar create event failed: ${err}`);
  }

  const event = await res.json();
  const meetLink =
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find(
      (e: any) => e.entryPointType === "video"
    )?.uri;

  if (!meetLink) {
    throw new Error("Google Meet link não gerado. Verifique que o calendário suporta conferências.");
  }

  return { meetLink, eventId: event.id };
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, provider, workspace_id, meeting, test_credentials } = body;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── TEST ACTION ──
    if (action === "test") {
      if (!workspace_id) {
        return new Response(
          JSON.stringify({ error: "workspace_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: videoConfig } = await adminClient
        .from("workspace_video_config")
        .select("*")
        .eq("workspace_id", workspace_id)
        .single();

      if (!videoConfig) {
        return new Response(
          JSON.stringify({ error: "Configuração não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (provider === "zoom") {
        // Test by getting a valid token (will refresh if needed)
        await getValidZoomToken(videoConfig, adminClient);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (provider === "google_meet") {
        await getValidGoogleToken(videoConfig, adminClient);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Provider inválido para teste" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CREATE MEETING ACTION ──
    if (!workspace_id || !provider || !meeting) {
      return new Response(
        JSON.stringify({ error: "workspace_id, provider e meeting são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: videoConfig, error: configError } = await adminClient
      .from("workspace_video_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .single();

    if (configError || !videoConfig) {
      return new Response(
        JSON.stringify({ error: "Configuração de videoconferência não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ZOOM ──
    if (provider === "zoom") {
      if (!videoConfig.zoom_enabled) {
        return new Response(
          JSON.stringify({ error: "Zoom não está ativo neste workspace" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accessToken = await getValidZoomToken(videoConfig, adminClient);

      const zoomMeeting = await createZoomMeeting(
        accessToken,
        meeting.title,
        meeting.start_time,
        meeting.duration || 60
      );

      return new Response(
        JSON.stringify({
          meeting_url: zoomMeeting.join_url,
          meeting_provider: "zoom",
          external_id: String(zoomMeeting.id),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GOOGLE MEET ──
    if (provider === "google_meet") {
      if (!videoConfig.google_meet_enabled) {
        return new Response(
          JSON.stringify({ error: "Google Meet não está ativo neste workspace" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accessToken = await getValidGoogleToken(videoConfig, adminClient);

      const result = await createGoogleMeetEvent(
        accessToken,
        videoConfig.google_calendar_email || "primary",
        meeting.title,
        meeting.start_time,
        meeting.end_time
      );

      return new Response(
        JSON.stringify({
          meeting_url: result.meetLink,
          meeting_provider: "google_meet",
          external_id: result.eventId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Provider '${provider}' não suportado` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-video-meeting error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

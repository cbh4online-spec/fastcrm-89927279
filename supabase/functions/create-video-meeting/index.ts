import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Zoom helpers ──

async function getZoomAccessToken(
  accountId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom OAuth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

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
      type: 2, // Scheduled
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

// ── Google Meet helpers ──

function base64url(input: string): string {
  return btoa(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGoogleAccessToken(
  serviceAccountJson: string
): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const textEncoder = new TextEncoder();
  const signingInput = textEncoder.encode(`${header}.${payload}`);

  // Import private key
  const pemContent = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signingInput
  );

  const signatureB64 = base64url(
    String.fromCharCode(...new Uint8Array(signature))
  );
  const jwt = `${header}.${payload}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google OAuth failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function createGoogleMeetEvent(
  accessToken: string,
  calendarEmail: string,
  summary: string,
  startTime: string,
  endTime: string
): Promise<{ meetLink: string; eventId: string }> {
  const calendarId = calendarEmail || "primary";
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?conferenceDataVersion=1`,
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
    throw new Error("Google Meet link not generated. Verifique que o calendário suporta conferências.");
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

    // ── TEST ACTION ──
    if (action === "test") {
      if (provider === "zoom" && test_credentials) {
        const creds = test_credentials;
        const accountId = creds.zoom_account_id;
        const clientId = creds.zoom_client_id;
        let clientSecret = creds.zoom_client_secret;

        // If using stored credentials, fetch from DB
        if (clientSecret === "__use_stored__") {
          const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const { data: cfg } = await adminClient
            .from("workspace_video_config")
            .select("zoom_client_secret_encrypted")
            .eq("workspace_id", workspace_id)
            .single();
          clientSecret = cfg?.zoom_client_secret_encrypted;
        }

        if (!clientSecret) {
          return new Response(
            JSON.stringify({ error: "Client Secret não encontrado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await getZoomAccessToken(accountId, clientId, clientSecret);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (provider === "google_meet" && test_credentials) {
        let saJson = test_credentials.google_service_account_json;

        if (saJson === "__use_stored__") {
          const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const { data: cfg } = await adminClient
            .from("workspace_video_config")
            .select("google_service_account_json")
            .eq("workspace_id", workspace_id)
            .single();
          saJson = cfg?.google_service_account_json;
        }

        if (!saJson) {
          return new Response(
            JSON.stringify({ error: "Service Account JSON não encontrado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await getGoogleAccessToken(saJson);
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

    // Fetch credentials from DB using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

      const accessToken = await getZoomAccessToken(
        videoConfig.zoom_account_id,
        videoConfig.zoom_client_id,
        videoConfig.zoom_client_secret_encrypted
      );

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

      const accessToken = await getGoogleAccessToken(
        videoConfig.google_service_account_json
      );

      const result = await createGoogleMeetEvent(
        accessToken,
        videoConfig.google_calendar_email,
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

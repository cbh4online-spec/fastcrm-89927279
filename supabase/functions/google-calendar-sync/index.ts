import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Token helpers ──

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

async function getValidGoogleToken(
  config: any,
  adminClient: any
): Promise<string> {
  const now = new Date();
  const expiresAt = config.google_token_expires_at ? new Date(config.google_token_expires_at) : null;

  if (config.google_access_token && expiresAt && expiresAt.getTime() - 300000 > now.getTime()) {
    return config.google_access_token;
  }

  if (!config.google_refresh_token) {
    throw new Error("Google Calendar não está conectado. Faça a ligação nas configurações de vídeo.");
  }

  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Credenciais OAuth do Google não configuradas");
  }

  const tokenData = await refreshGoogleToken(config.google_refresh_token, clientId, clientSecret);
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

// ── Google Calendar API helpers ──

async function listGoogleCalendars(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`List calendars failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return data.items || [];
}

async function pushEventToGoogle(
  accessToken: string,
  googleCalendarId: string,
  event: any,
  googleEventId?: string
): Promise<string> {
  const body: any = {
    summary: event.title,
    description: event.description || "",
    start: event.all_day
      ? { date: event.start_time.split("T")[0] }
      : { dateTime: event.start_time, timeZone: "UTC" },
    end: event.all_day
      ? { date: event.end_time.split("T")[0] }
      : { dateTime: event.end_time, timeZone: "UTC" },
    location: event.location || undefined,
    status: event.status === "cancelled" ? "cancelled" : "confirmed",
  };

  if (event.meeting_url) {
    body.description = `${body.description}\n\nLink: ${event.meeting_url}`.trim();
  }

  const url = googleEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${encodeURIComponent(googleEventId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`;

  const res = await fetch(url, {
    method: googleEventId ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Push event failed [${res.status}]: ${await res.text()}`);
  const result = await res.json();
  return result.id;
}

async function deleteGoogleEvent(
  accessToken: string,
  googleCalendarId: string,
  googleEventId: string
) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok && res.status !== 410) {
    throw new Error(`Delete Google event failed [${res.status}]: ${await res.text()}`);
  }
}

async function pullEventsFromGoogle(
  accessToken: string,
  googleCalendarId: string,
  syncToken?: string
): Promise<{ events: any[]; nextSyncToken: string }> {
  let allEvents: any[] = [];
  let pageToken: string | undefined;
  let nextSyncToken = "";

  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`;

  do {
    const params = new URLSearchParams({ maxResults: "250", singleEvents: "true" });
    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      // Initial sync: last 30 days + next 365 days
      const now = new Date();
      params.set("timeMin", new Date(now.getTime() - 30 * 86400000).toISOString());
      params.set("timeMax", new Date(now.getTime() + 365 * 86400000).toISOString());
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 410) {
      // Sync token expired — do full sync
      return pullEventsFromGoogle(accessToken, googleCalendarId);
    }
    if (!res.ok) throw new Error(`Pull events failed [${res.status}]: ${await res.text()}`);

    const data = await res.json();
    allEvents = allEvents.concat(data.items || []);
    pageToken = data.nextPageToken;
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
  } while (pageToken);

  return { events: allEvents, nextSyncToken };
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { action, workspace_id, calendar_id, event_id, event_data, google_calendar_id } =
      await req.json();

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: member } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Google tokens from workspace_video_config
    const { data: videoConfig } = await adminClient
      .from("workspace_video_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!videoConfig?.google_refresh_token) {
      return new Response(
        JSON.stringify({ error: "Google Calendar não está conectado. Configure o Google Meet primeiro." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getValidGoogleToken(videoConfig, adminClient);

    // ── LIST CALENDARS ──
    if (action === "list_calendars") {
      const calendars = await listGoogleCalendars(accessToken);
      return new Response(
        JSON.stringify({
          calendars: calendars.map((c: any) => ({
            id: c.id,
            summary: c.summary,
            primary: c.primary || false,
            backgroundColor: c.backgroundColor,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CONNECT calendar ──
    if (action === "connect") {
      if (!calendar_id || !google_calendar_id) {
        return new Response(JSON.stringify({ error: "calendar_id and google_calendar_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: sync, error: syncError } = await adminClient
        .from("google_calendar_sync")
        .upsert(
          {
            workspace_id,
            calendar_id,
            google_calendar_id,
            is_active: true,
            created_by: userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,calendar_id" }
        )
        .select()
        .single();

      if (syncError) throw syncError;

      return new Response(JSON.stringify({ success: true, sync }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DISCONNECT calendar ──
    if (action === "disconnect") {
      if (!calendar_id) {
        return new Response(JSON.stringify({ error: "calendar_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient
        .from("google_calendar_sync")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspace_id)
        .eq("calendar_id", calendar_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PUSH single event ──
    if (action === "push") {
      if (!calendar_id || !event_id) {
        return new Response(JSON.stringify({ error: "calendar_id and event_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: syncConfig } = await adminClient
        .from("google_calendar_sync")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("calendar_id", calendar_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!syncConfig) {
        return new Response(JSON.stringify({ skipped: true, reason: "No sync configured" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: event } = await adminClient
        .from("calendar_events")
        .select("*")
        .eq("id", event_id)
        .single();

      if (!event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingGoogleId = (event.metadata as any)?.google_event_id;
      const googleEventId = await pushEventToGoogle(
        accessToken,
        syncConfig.google_calendar_id,
        event,
        existingGoogleId
      );

      // Store google_event_id in metadata
      const metadata = { ...(event.metadata as any || {}), google_event_id: googleEventId };
      await adminClient
        .from("calendar_events")
        .update({ metadata })
        .eq("id", event_id);

      return new Response(JSON.stringify({ success: true, google_event_id: googleEventId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE from Google ──
    if (action === "delete_remote") {
      if (!calendar_id || !event_data?.google_event_id) {
        return new Response(JSON.stringify({ error: "calendar_id and google_event_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: syncConfig } = await adminClient
        .from("google_calendar_sync")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("calendar_id", calendar_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!syncConfig) {
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await deleteGoogleEvent(accessToken, syncConfig.google_calendar_id, event_data.google_event_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PULL events from Google ──
    if (action === "pull") {
      if (!calendar_id) {
        return new Response(JSON.stringify({ error: "calendar_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: syncConfig } = await adminClient
        .from("google_calendar_sync")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("calendar_id", calendar_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!syncConfig) {
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { events: googleEvents, nextSyncToken } = await pullEventsFromGoogle(
        accessToken,
        syncConfig.google_calendar_id,
        syncConfig.sync_token || undefined
      );

      let created = 0, updated = 0, deleted = 0;

      for (const ge of googleEvents) {
        // Check if event already exists locally
        const { data: existing } = await adminClient
          .from("calendar_events")
          .select("id, metadata")
          .eq("workspace_id", workspace_id)
          .eq("calendar_id", calendar_id)
          .filter("metadata->>google_event_id", "eq", ge.id)
          .maybeSingle();

        if (ge.status === "cancelled") {
          if (existing) {
            await adminClient.from("calendar_events").delete().eq("id", existing.id);
            deleted++;
          }
          continue;
        }

        const isAllDay = !!ge.start?.date;
        const startTime = isAllDay ? `${ge.start.date}T00:00:00Z` : ge.start?.dateTime;
        const endTime = isAllDay ? `${ge.end.date}T00:00:00Z` : ge.end?.dateTime;

        const eventData = {
          title: ge.summary || "(Sem título)",
          description: ge.description || null,
          start_time: startTime,
          end_time: endTime,
          all_day: isAllDay,
          location: ge.location || null,
          status: "confirmed" as const,
          metadata: { google_event_id: ge.id, google_updated: ge.updated },
        };

        if (existing) {
          await adminClient.from("calendar_events").update(eventData).eq("id", existing.id);
          updated++;
        } else {
          await adminClient.from("calendar_events").insert({
            ...eventData,
            calendar_id,
            workspace_id,
            created_by: userId,
          });
          created++;
        }
      }

      // Update sync token
      await adminClient
        .from("google_calendar_sync")
        .update({
          sync_token: nextSyncToken || syncConfig.sync_token,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", syncConfig.id);

      return new Response(
        JSON.stringify({ success: true, created, updated, deleted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("google-calendar-sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function businessRuleResponse(message: string, error_code: string) {
  return new Response(JSON.stringify({
    success: false,
    fallback: true,
    error: message,
    error_code,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Get the current business date in Europe/Lisbon timezone (YYYY-MM-DD) */
function getBusinessDate(date: Date, tz = "Europe/Lisbon"): string {
  return date.toLocaleDateString("sv-SE", { timeZone: tz }); // sv-SE gives YYYY-MM-DD
}

/** Haversine distance in meters between two lat/lng points */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── JWT validation ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Não autenticado", 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return errorResponse("Token inválido ou expirado", 401);
    }
    const authenticatedUserId = claimsData.claims.sub;

    // ── Service role client for DB operations ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { employee_id, workspace_id, entry_type, method, location_lat, location_lng, location_name, notes } = await req.json();

    if (!employee_id || !workspace_id || !entry_type) {
      return errorResponse("Missing required fields");
    }

    // ── Workspace membership check ──
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", authenticatedUserId)
      .limit(1);

    if (!membership || membership.length === 0) {
      return errorResponse("Não pertence a este workspace", 403);
    }

    const now = new Date();
    const today = getBusinessDate(now);

    // Find active session globally (no date filter) to handle cross-midnight
    const { data: activeSessionArr } = await supabase
      .from("hr_work_sessions")
      .select("id, clock_in_at, clock_out_at, break_minutes, break_start_at, break_end_at, session_type, status, session_date")
      .eq("employee_id", employee_id)
      .not("clock_in_at", "is", null)
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1);

    const activeSession = activeSessionArr && activeSessionArr.length > 0 ? activeSessionArr[0] : null;
    const onBreak = activeSession?.break_start_at && !activeSession?.break_end_at;

    // Fetch today's completed sessions for session_type determination
    const { data: todaySessions } = await supabase
      .from("hr_work_sessions")
      .select("id, clock_in_at, clock_out_at, break_minutes, break_start_at, break_end_at, session_type, status")
      .eq("employee_id", employee_id)
      .eq("session_date", today)
      .order("clock_in_at", { ascending: true });

    const sessions = todaySessions || [];

    // State validations
    if (entry_type === "clock_in") {
      if (activeSession) {
        return businessRuleResponse("Já existe uma sessão aberta. Faça clock-out primeiro.", "OPEN_SESSION_EXISTS");
      }
    } else if (entry_type === "clock_out") {
      if (!activeSession) {
        return businessRuleResponse("Nenhuma sessão aberta para terminar.", "NO_OPEN_SESSION");
      }
      if (onBreak) {
        return businessRuleResponse("Termine a pausa antes de fazer clock-out.", "BREAK_ACTIVE");
      }
    } else if (entry_type === "break_start") {
      if (!activeSession) {
        return businessRuleResponse("Nenhuma sessão aberta para registar pausa.", "NO_OPEN_SESSION");
      }
      if (onBreak) {
        return businessRuleResponse("Já está em pausa.", "BREAK_ALREADY_STARTED");
      }
    } else if (entry_type === "break_end") {
      if (!activeSession || !onBreak) {
        return businessRuleResponse("Não existe pausa activa para terminar.", "NO_ACTIVE_BREAK");
      }
    }

    // Insert time entry
    const { error: entryError } = await supabase.from("hr_time_entries").insert({
      workspace_id, employee_id, entry_type, recorded_at: now.toISOString(),
      method: method || "manual", location_lat, location_lng, notes
    });
    if (entryError) throw entryError;

    let overtime_alert: { exceeded: boolean; overtime_minutes: number; max_daily_minutes: number; worked_minutes: number } | null = null;
    let employee_name: string | null = null;
    let session_action: string | null = null;
    let geofence_alert: { outside: boolean; distance_meters?: number; nearest_zone?: string } | null = null;

    if (entry_type === "clock_in") {
      // Determine session type
      const completedTypes = sessions.filter(s => s.clock_out_at).map(s => s.session_type);
      let sessionType = "morning";
      if (completedTypes.includes("morning")) {
        sessionType = completedTypes.includes("afternoon") ? "extra" : "afternoon";
      }

      const { data: insertedSession } = await supabase.from("hr_work_sessions").insert({
        workspace_id, employee_id, session_date: today,
        clock_in_at: now.toISOString(), status: "incomplete",
        session_type: sessionType,
        clock_in_lat: location_lat || null,
        clock_in_lng: location_lng || null,
        clock_in_location_name: location_name || null,
      }).select("id").single();

      session_action = `clock_in_${sessionType}`;

      // ── Geofencing check ──
      if (location_lat && location_lng) {
        const { data: zones } = await supabase
          .from("hr_geofence_zones")
          .select("id, name, latitude, longitude, radius_meters")
          .eq("workspace_id", workspace_id)
          .eq("is_active", true);

        if (zones && zones.length > 0) {
          let insideAny = false;
          let minDistance = Infinity;
          let nearestName = "";

          for (const zone of zones) {
            const dist = haversineMeters(location_lat, location_lng, zone.latitude, zone.longitude);
            if (dist <= zone.radius_meters) {
              insideAny = true;
              break;
            }
            if (dist < minDistance) {
              minDistance = dist;
              nearestName = zone.name;
            }
          }

          if (!insideAny) {
            geofence_alert = {
              outside: true,
              distance_meters: Math.round(minDistance),
              nearest_zone: nearestName,
            };

            await supabase.from("hr_attendance_anomalies").insert({
              workspace_id,
              employee_id,
              anomaly_date: today,
              anomaly_type: "outside_geofence",
              severity: "warning",
              description: `Pica ponto fora de zona autorizada. Distância à zona mais próxima (${nearestName}): ${Math.round(minDistance)}m`,
              session_id: insertedSession?.id || null,
              resolved: false,
            });
          }
        }
      }

    } else if (entry_type === "break_start" && activeSession) {
      await supabase.from("hr_work_sessions").update({
        break_start_at: now.toISOString(),
        updated_at: now.toISOString()
      }).eq("id", activeSession.id);
      session_action = "break_start";

    } else if (entry_type === "break_end" && activeSession) {
      const breakStartTime = new Date(activeSession.break_start_at).getTime();
      const breakDurationMin = Math.max(1, Math.ceil((now.getTime() - breakStartTime) / 60000));
      const totalBreakMin = (activeSession.break_minutes || 0) + breakDurationMin;

      await supabase.from("hr_work_sessions").update({
        break_end_at: now.toISOString(),
        break_minutes: totalBreakMin,
        updated_at: now.toISOString()
      }).eq("id", activeSession.id);
      session_action = "break_end";

    } else if (entry_type === "clock_out" && activeSession) {
      let breakMin = activeSession.break_minutes || 0;
      if (activeSession.break_start_at && !activeSession.break_end_at) {
        const breakStartTime = new Date(activeSession.break_start_at).getTime();
        const pendingBreakMin = Math.max(1, Math.ceil((now.getTime() - breakStartTime) / 60000));
        breakMin += pendingBreakMin;
      }

      const clockInTime = new Date(activeSession.clock_in_at).getTime();
      const totalMin = Math.round((now.getTime() - clockInTime) / 60000);
      const workedMin = Math.max(0, totalMin - breakMin);

      await supabase.from("hr_work_sessions").update({
        clock_out_at: now.toISOString(),
        break_end_at: activeSession.break_start_at && !activeSession.break_end_at ? now.toISOString() : activeSession.break_end_at,
        break_minutes: breakMin,
        total_minutes: totalMin,
        worked_minutes: workedMin,
        status: "complete",
        updated_at: now.toISOString()
      }).eq("id", activeSession.id);

      // Calculate total worked today across all sessions
      const previousWorked = sessions
        .filter(s => s.clock_out_at && s.id !== activeSession.id)
        .reduce((sum, s) => sum + ((s as any).worked_minutes || 0), 0);
      const totalWorkedToday = previousWorked + workedMin;

      const { data: laborRule } = await supabase
        .from("hr_country_labor_rules")
        .select("rules")
        .eq("workspace_id", workspace_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      const rule = laborRule && laborRule.length > 0 ? laborRule[0] : null;
      const maxDailyHours = (rule?.rules as any)?.max_daily_hours || 8;
      const maxDailyMin = maxDailyHours * 60;
      const overtimeMin = Math.max(0, totalWorkedToday - maxDailyMin);

      if (overtimeMin > 0) {
        const { data: empArr } = await supabase
          .from("hr_employees")
          .select("full_name")
          .eq("id", employee_id)
          .limit(1);
        employee_name = empArr && empArr.length > 0 ? empArr[0].full_name : null;
      }

      overtime_alert = {
        exceeded: overtimeMin > 0,
        overtime_minutes: overtimeMin,
        max_daily_minutes: maxDailyMin,
        worked_minutes: totalWorkedToday,
      };
      session_action = "clock_out";
    }

    return jsonResponse({
      success: true,
      recorded_at: now.toISOString(),
      overtime_alert,
      employee_name,
      session_action,
      geofence_alert,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

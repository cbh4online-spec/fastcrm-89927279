import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/** Haversine distance in meters between two lat/lng points */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { employee_id, workspace_id, entry_type, method, location_lat, location_lng, location_name, notes } = await req.json();

    if (!employee_id || !workspace_id || !entry_type) {
      return errorResponse("Missing required fields");
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Fetch all sessions for today
    const { data: todaySessions } = await supabase
      .from("hr_work_sessions")
      .select("id, clock_in_at, clock_out_at, break_minutes, break_start_at, break_end_at, session_type, status")
      .eq("employee_id", employee_id)
      .eq("session_date", today)
      .order("clock_in_at", { ascending: true });

    const sessions = todaySessions || [];
    const activeSession = sessions.find(s => s.clock_in_at && !s.clock_out_at);
    const onBreak = activeSession?.break_start_at && !activeSession?.break_end_at;

    // State validations
    if (entry_type === "clock_in") {
      if (activeSession) {
        return errorResponse("Já existe uma sessão aberta. Faça clock-out primeiro.");
      }
    } else if (entry_type === "clock_out") {
      if (!activeSession) {
        return errorResponse("Nenhuma sessão aberta para terminar.");
      }
      if (onBreak) {
        return errorResponse("Termine a pausa antes de fazer clock-out.");
      }
    } else if (entry_type === "break_start") {
      if (!activeSession) {
        return errorResponse("Nenhuma sessão aberta para registar pausa.");
      }
      if (onBreak) {
        return errorResponse("Já está em pausa.");
      }
    } else if (entry_type === "break_end") {
      if (!activeSession || !onBreak) {
        return errorResponse("Não existe pausa activa para terminar.");
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

            // Create anomaly
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
      const breakDurationMin = Math.round((now.getTime() - breakStartTime) / 60000);
      const totalBreakMin = (activeSession.break_minutes || 0) + breakDurationMin;

      await supabase.from("hr_work_sessions").update({
        break_end_at: now.toISOString(),
        break_minutes: totalBreakMin,
        updated_at: now.toISOString()
      }).eq("id", activeSession.id);
      session_action = "break_end";

    } else if (entry_type === "clock_out" && activeSession) {
      const clockInTime = new Date(activeSession.clock_in_at).getTime();
      const totalMin = Math.round((now.getTime() - clockInTime) / 60000);
      const breakMin = activeSession.break_minutes || 0;
      const workedMin = Math.max(0, totalMin - breakMin);

      await supabase.from("hr_work_sessions").update({
        clock_out_at: now.toISOString(),
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

      // Fetch labor rules for overtime check
      const { data: laborRule } = await supabase
        .from("hr_country_labor_rules")
        .select("rules")
        .eq("workspace_id", workspace_id)
        .eq("is_active", true)
        .maybeSingle();

      const maxDailyHours = (laborRule?.rules as any)?.max_daily_hours || 8;
      const maxDailyMin = maxDailyHours * 60;
      const overtimeMin = Math.max(0, totalWorkedToday - maxDailyMin);

      if (overtimeMin > 0) {
        const { data: emp } = await supabase
          .from("hr_employees")
          .select("full_name")
          .eq("id", employee_id)
          .maybeSingle();
        employee_name = emp?.full_name || null;
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

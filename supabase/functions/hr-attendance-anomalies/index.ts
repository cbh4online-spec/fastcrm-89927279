import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 3600000).toISOString();

    // Get all active workspaces that have HR employees
    const { data: workspaces } = await supabase
      .from("hr_employees")
      .select("workspace_id")
      .eq("status", "active");

    const wsIds = [...new Set((workspaces || []).map((w: any) => w.workspace_id))];

    let totalAnomalies = 0;

    for (const wsId of wsIds) {
      const anomalies: any[] = [];

      // 1. OPEN SESSIONS (>12h without clock_out)
      const { data: openSessions } = await supabase
        .from("hr_work_sessions")
        .select("id, employee_id, session_date, clock_in_at")
        .eq("workspace_id", wsId)
        .eq("status", "incomplete")
        .lt("clock_in_at", twelveHoursAgo);

      for (const s of openSessions || []) {
        const hours = Math.round((now.getTime() - new Date(s.clock_in_at).getTime()) / 3600000);
        anomalies.push({
          workspace_id: wsId,
          employee_id: s.employee_id,
          anomaly_date: s.session_date,
          anomaly_type: "open_session",
          severity: "critical",
          description: `Sessão aberta há ${hours}h sem registo de saída`,
          session_id: s.id,
        });
      }

      // 2. LATE ARRIVALS (today and yesterday)
      for (const checkDate of [todayStr, yesterdayStr]) {
        const { data: schedules } = await supabase
          .from("hr_schedules")
          .select("id, employee_id, shift_id, hr_shifts(start_time)")
          .eq("workspace_id", wsId)
          .eq("schedule_date", checkDate);

        for (const sched of schedules || []) {
          const shiftStart = (sched as any).hr_shifts?.start_time;
          if (!shiftStart) continue;

          // Find the work session for this employee on this date
          const { data: session } = await supabase
            .from("hr_work_sessions")
            .select("id, clock_in_at")
            .eq("workspace_id", wsId)
            .eq("employee_id", sched.employee_id)
            .eq("session_date", checkDate)
            .maybeSingle();

          if (!session?.clock_in_at) continue;

          // Compare times: extract HH:MM from clock_in and shift start
          const clockInTime = new Date(session.clock_in_at);
          const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();

          const [sh, sm] = shiftStart.split(":").map(Number);
          const shiftMinutes = sh * 60 + sm;

          const lateMinutes = clockInMinutes - shiftMinutes;
          if (lateMinutes > 15) {
            anomalies.push({
              workspace_id: wsId,
              employee_id: sched.employee_id,
              anomaly_date: checkDate,
              anomaly_type: "late_arrival",
              severity: "warning",
              description: `Atraso de ${lateMinutes} minutos face ao turno (${shiftStart})`,
              session_id: session.id,
              schedule_id: sched.id,
            });
          }
        }
      }

      // 3. UNJUSTIFIED ABSENCES (yesterday only)
      {
        const { data: scheduledEmployees } = await supabase
          .from("hr_schedules")
          .select("id, employee_id")
          .eq("workspace_id", wsId)
          .eq("schedule_date", yesterdayStr);

        for (const sched of scheduledEmployees || []) {
          // Check if there's a work session
          const { data: session } = await supabase
            .from("hr_work_sessions")
            .select("id")
            .eq("workspace_id", wsId)
            .eq("employee_id", sched.employee_id)
            .eq("session_date", yesterdayStr)
            .maybeSingle();

          if (session) continue;

          // Check if there's an approved absence
          const { data: absence } = await supabase
            .from("hr_absences")
            .select("id")
            .eq("workspace_id", wsId)
            .eq("employee_id", sched.employee_id)
            .eq("status", "approved")
            .lte("start_date", yesterdayStr)
            .gte("end_date", yesterdayStr)
            .maybeSingle();

          if (absence) continue;

          anomalies.push({
            workspace_id: wsId,
            employee_id: sched.employee_id,
            anomaly_date: yesterdayStr,
            anomaly_type: "unjustified_absence",
            severity: "critical",
            description: "Turno atribuído sem registo de ponto e sem ausência justificada",
            schedule_id: sched.id,
          });
        }
      }

      // Upsert anomalies (deduplicate by unique constraint)
      for (const anomaly of anomalies) {
        const { data: existing } = await supabase
          .from("hr_attendance_anomalies")
          .select("id, resolved")
          .eq("employee_id", anomaly.employee_id)
          .eq("anomaly_date", anomaly.anomaly_date)
          .eq("anomaly_type", anomaly.anomaly_type)
          .maybeSingle();

        if (existing) {
          // Update description if not resolved
          if (!existing.resolved) {
            await supabase
              .from("hr_attendance_anomalies")
              .update({ description: anomaly.description, severity: anomaly.severity })
              .eq("id", existing.id);
          }
          continue;
        }

        // Insert new anomaly
        const { data: inserted } = await supabase
          .from("hr_attendance_anomalies")
          .insert(anomaly)
          .select("id")
          .single();

        if (inserted) {
          totalAnomalies++;

          // Get employee name for notification
          const { data: emp } = await supabase
            .from("hr_employees")
            .select("full_name")
            .eq("id", anomaly.employee_id)
            .single();

          const typeLabels: Record<string, string> = {
            open_session: "Sessão aberta",
            late_arrival: "Atraso",
            unjustified_absence: "Falta não justificada",
          };

          await supabase.from("admin_notifications").insert({
            workspace_id: wsId,
            title: `${typeLabels[anomaly.anomaly_type]}: ${emp?.full_name || "Colaborador"}`,
            message: anomaly.description,
            type: "warning",
            category: "hr",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, anomalies_created: totalAnomalies }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error detecting anomalies:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

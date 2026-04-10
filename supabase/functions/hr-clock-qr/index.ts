import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Get the current business date in Europe/Lisbon timezone (YYYY-MM-DD) */
function getBusinessDate(date: Date, tz = "Europe/Lisbon"): string {
  return date.toLocaleDateString("sv-SE", { timeZone: tz });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { qr_token } = await req.json();

    if (!qr_token) {
      return new Response(JSON.stringify({ error: "Token em falta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: employee, error } = await supabase
      .from("hr_employees")
      .select("id, workspace_id, status, full_name, user_id")
      .eq("qr_code_token", qr_token)
      .eq("status", "active")
      .limit(1);

    const emp = employee && employee.length > 0 ? employee[0] : null;

    if (error || !emp) {
      return new Response(JSON.stringify({ error: "Funcionário não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const employeeName = emp.full_name || "Funcionário";
    const now = new Date();
    const today = getBusinessDate(now);

    // Check for any active session (no date filter) to handle cross-midnight
    const { data: activeSessionArr } = await supabase
      .from("hr_work_sessions")
      .select("id, clock_in_at, break_minutes")
      .eq("employee_id", emp.id)
      .not("clock_in_at", "is", null)
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1);

    const activeSession = activeSessionArr && activeSessionArr.length > 0 ? activeSessionArr[0] : null;
    const entry_type = activeSession ? "clock_out" : "clock_in";

    await supabase.from("hr_time_entries").insert({
      workspace_id: emp.workspace_id,
      employee_id: emp.id,
      member_id: emp.id,
      entry_type,
      method: "qr",
      recorded_at: now.toISOString()
    });

    if (entry_type === "clock_in") {
      await supabase.from("hr_work_sessions").insert({
        workspace_id: emp.workspace_id,
        employee_id: emp.id,
        member_id: emp.id,
        session_date: today,
        clock_in_at: now.toISOString(),
        status: "incomplete"
      });
    } else if (activeSession) {
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
    }

    return new Response(JSON.stringify({
      success: true,
      employee_name: employeeName,
      action: entry_type,
      recorded_at: now.toISOString()
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

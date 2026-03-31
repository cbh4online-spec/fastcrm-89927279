import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Look up the employee by QR token directly from hr_employees
    const { data: employee, error } = await supabase
      .from("hr_employees")
      .select("id, workspace_id, status, full_name, user_id")
      .eq("qr_code_token", qr_token)
      .eq("status", "active")
      .maybeSingle();

    if (error || !employee) {
      return new Response(JSON.stringify({ error: "Funcionário não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const employeeName = employee.full_name || "Funcionário";
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00.000Z`;

    // Determine entry_type based on last time entry today
    const { data: lastEntry } = await supabase
      .from("hr_time_entries")
      .select("entry_type")
      .eq("employee_id", employee.id)
      .gte("recorded_at", todayStart)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastType = lastEntry?.entry_type;
    const entry_type = (!lastType || lastType === "clock_out" || lastType === "break_end")
      ? "clock_in"
      : "clock_out";

    await supabase.from("hr_time_entries").insert({
      workspace_id: employee.workspace_id,
      employee_id: employee.id,
      member_id: employee.id,
      entry_type,
      method: "qr",
      recorded_at: now.toISOString()
    });

    // Manage work session for the day
    const { data: session } = await supabase
      .from("hr_work_sessions")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("session_date", today)
      .maybeSingle();

    if (entry_type === "clock_in" && !session) {
      await supabase.from("hr_work_sessions").insert({
        workspace_id: employee.workspace_id,
        employee_id: employee.id,
        member_id: employee.id,
        session_date: today,
        clock_in_at: now.toISOString(),
        status: "incomplete"
      });
    } else if (entry_type === "clock_out" && session) {
      await supabase.from("hr_work_sessions").update({
        clock_out_at: now.toISOString(),
        status: "complete",
        updated_at: now.toISOString()
      }).eq("id", session.id);
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

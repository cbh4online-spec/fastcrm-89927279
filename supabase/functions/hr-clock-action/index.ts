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

    const { employee_id, workspace_id, entry_type, method, location_lat, location_lng, notes } = await req.json();

    if (!employee_id || !workspace_id || !entry_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // 1. Insert time entry
    const { error: entryError } = await supabase.from("hr_time_entries").insert({
      workspace_id, employee_id, entry_type, recorded_at: now.toISOString(),
      method: method || "manual", location_lat, location_lng, notes
    });
    if (entryError) throw entryError;

    // 2. Upsert work session
    const { data: existing } = await supabase
      .from("hr_work_sessions")
      .select("id, clock_in_at, break_minutes")
      .eq("employee_id", employee_id)
      .eq("session_date", today)
      .single();

    let overtime_alert: { exceeded: boolean; overtime_minutes: number; max_daily_minutes: number; worked_minutes: number } | null = null;
    let employee_name: string | null = null;

    if (entry_type === "clock_in") {
      if (!existing) {
        await supabase.from("hr_work_sessions").insert({
          workspace_id, employee_id, session_date: today,
          clock_in_at: now.toISOString(), status: "incomplete"
        });
      }
    } else if (entry_type === "clock_out") {
      if (existing) {
        const clockInTime = new Date(existing.clock_in_at).getTime();
        const totalMin = Math.round((now.getTime() - clockInTime) / 60000);
        const breakMin = existing.break_minutes || 0;
        const workedMin = Math.max(0, totalMin - breakMin);

        await supabase.from("hr_work_sessions").update({
          clock_out_at: now.toISOString(),
          total_minutes: totalMin,
          worked_minutes: workedMin,
          status: "complete",
          updated_at: now.toISOString()
        }).eq("id", existing.id);

        // Fetch active labor rules to check daily limit
        const { data: laborRule } = await supabase
          .from("hr_country_labor_rules")
          .select("rules")
          .eq("workspace_id", workspace_id)
          .eq("is_active", true)
          .maybeSingle();

        const maxDailyHours = (laborRule?.rules as any)?.max_daily_hours || 8;
        const maxDailyMin = maxDailyHours * 60;
        const overtimeMin = Math.max(0, workedMin - maxDailyMin);

        if (overtimeMin > 0) {
          // Get employee name for the alert
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
          worked_minutes: workedMin,
        };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      recorded_at: now.toISOString(),
      overtime_alert,
      employee_name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

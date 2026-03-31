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
      }
    }

    return new Response(JSON.stringify({ success: true, recorded_at: now.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

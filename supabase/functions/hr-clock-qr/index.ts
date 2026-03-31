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

    // Look up the HR profile by QR token
    const { data: hrProfile, error } = await supabase
      .from("hr_employee_profiles")
      .select("id, member_id, workspace_id, status")
      .eq("qr_code_token", qr_token)
      .eq("status", "active")
      .single();

    if (error || !hrProfile) {
      return new Response(JSON.stringify({ error: "Funcionário não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get member info for the name
    const { data: member } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("id", hrProfile.member_id)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", member?.user_id)
      .single();

    const employeeName = profile?.full_name || "Funcionário";

    const today = new Date().toISOString().split("T")[0];
    const { data: session } = await supabase
      .from("hr_work_sessions")
      .select("clock_in_at, clock_out_at")
      .eq("member_id", hrProfile.member_id)
      .eq("session_date", today)
      .single();

    let entry_type = "clock_in";
    if (session?.clock_in_at && !session?.clock_out_at) entry_type = "clock_out";

    const now = new Date();

    await supabase.from("hr_time_entries").insert({
      workspace_id: hrProfile.workspace_id,
      employee_id: hrProfile.member_id, // legacy column
      member_id: hrProfile.member_id,
      entry_type,
      method: "qr",
      recorded_at: now.toISOString()
    });

    if (entry_type === "clock_in") {
      await supabase.from("hr_work_sessions").upsert({
        workspace_id: hrProfile.workspace_id,
        employee_id: hrProfile.member_id,
        member_id: hrProfile.member_id,
        session_date: today,
        clock_in_at: now.toISOString(),
        status: "incomplete"
      }, { onConflict: "employee_id,session_date" });
    } else {
      await supabase.from("hr_work_sessions").update({
        clock_out_at: now.toISOString(),
        status: "complete",
        updated_at: now.toISOString()
      }).eq("member_id", hrProfile.member_id).eq("session_date", today);
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { workspace_id, employee_id, absence_type_id, start_date, end_date, reason } = body;

    if (!workspace_id || !employee_id || !absence_type_id || !start_date || !end_date) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), { status: 400, headers: corsHeaders });
    }

    // Verify workspace membership
    const { data: member } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return new Response(JSON.stringify({ error: "Sem acesso ao workspace" }), { status: 403, headers: corsHeaders });
    }

    // Get public holidays for the period
    const { data: holidays = [] } = await adminClient
      .from("hr_public_holidays")
      .select("date")
      .eq("workspace_id", workspace_id)
      .gte("date", start_date)
      .lte("date", end_date);

    const holidaySet = new Set((holidays || []).map((h: any) => h.date));

    // Calculate business days excluding weekends and holidays
    let businessDays = 0;
    const start = new Date(start_date);
    const end = new Date(end_date);
    const current = new Date(start);

    while (current <= end) {
      const dow = current.getDay();
      const dateStr = current.toISOString().split("T")[0];
      if (dow !== 0 && dow !== 6 && !holidaySet.has(dateStr)) {
        businessDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    if (businessDays <= 0) {
      return new Response(JSON.stringify({ error: "O período seleccionado não tem dias úteis" }), { status: 400, headers: corsHeaders });
    }

    // Check leave balance
    const year = new Date(start_date).getFullYear();
    const { data: balance } = await adminClient
      .from("hr_leave_balances")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("employee_id", employee_id)
      .eq("leave_type_id", absence_type_id)
      .eq("year", year)
      .maybeSingle();

    if (balance) {
      const available = Number(balance.total_days) + Number(balance.carried_over_days) - Number(balance.used_days) - Number(balance.pending_days);
      if (businessDays > available) {
        return new Response(JSON.stringify({
          error: "Saldo insuficiente",
          details: { requested: businessDays, available: Math.max(0, available) },
        }), { status: 400, headers: corsHeaders });
      }
    }

    // Detect conflicts (overlapping approved/pending absences for same employee)
    const { data: overlapping = [] } = await adminClient
      .from("hr_absences")
      .select("id, start_date, end_date, status")
      .eq("workspace_id", workspace_id)
      .eq("employee_id", employee_id)
      .in("status", ["pending", "approved"])
      .lte("start_date", end_date)
      .gte("end_date", start_date);

    const conflictDetected = (overlapping || []).length > 0;
    const conflictDetails = conflictDetected
      ? { overlapping_ids: (overlapping || []).map((o: any) => o.id), count: overlapping!.length }
      : null;

    // Create the absence request
    const { data: absence, error: insertErr } = await adminClient
      .from("hr_absences")
      .insert({
        workspace_id,
        employee_id,
        absence_type_id,
        start_date,
        end_date,
        total_days: businessDays,
        reason: reason || null,
        requested_by: user.id,
        status: "pending",
        conflict_detected: conflictDetected,
        conflict_details: conflictDetails,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Update pending_days in balance (create if not exists)
    if (balance) {
      await adminClient
        .from("hr_leave_balances")
        .update({ pending_days: Number(balance.pending_days) + businessDays })
        .eq("id", balance.id);
    } else {
      await adminClient.from("hr_leave_balances").insert({
        workspace_id,
        employee_id,
        leave_type_id: absence_type_id,
        year,
        total_days: 0,
        used_days: 0,
        pending_days: businessDays,
        carried_over_days: 0,
      });
    }

    return new Response(JSON.stringify({ data: absence, business_days: businessDays, conflict_detected: conflictDetected }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("hr-leave-request-create error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: corsHeaders });
  }
});

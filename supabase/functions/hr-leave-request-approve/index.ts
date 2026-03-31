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

    const { absence_id, action, rejection_reason } = await req.json();

    if (!absence_id || !["approved", "rejected"].includes(action)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), { status: 400, headers: corsHeaders });
    }

    // Get the absence
    const { data: absence, error: fetchErr } = await adminClient
      .from("hr_absences")
      .select("*")
      .eq("id", absence_id)
      .single();

    if (fetchErr || !absence) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), { status: 404, headers: corsHeaders });
    }

    if (absence.status !== "pending") {
      return new Response(JSON.stringify({ error: "Pedido já processado" }), { status: 400, headers: corsHeaders });
    }

    // Verify user has admin/owner role in workspace
    const { data: member } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", absence.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!member || !["admin", "owner"].includes(member.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão para aprovar/rejeitar" }), { status: 403, headers: corsHeaders });
    }

    // Update the absence
    const updateData: any = {
      status: action,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };
    if (action === "rejected" && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    const { error: updateErr } = await adminClient
      .from("hr_absences")
      .update(updateData)
      .eq("id", absence_id);

    if (updateErr) throw updateErr;

    // Update leave balance atomically
    const year = new Date(absence.start_date).getFullYear();
    const totalDays = Number(absence.total_days) || 0;

    const { data: balance } = await adminClient
      .from("hr_leave_balances")
      .select("*")
      .eq("workspace_id", absence.workspace_id)
      .eq("employee_id", absence.employee_id)
      .eq("leave_type_id", absence.absence_type_id)
      .eq("year", year)
      .maybeSingle();

    if (balance) {
      if (action === "approved") {
        // Move from pending to used
        await adminClient
          .from("hr_leave_balances")
          .update({
            pending_days: Math.max(0, Number(balance.pending_days) - totalDays),
            used_days: Number(balance.used_days) + totalDays,
          })
          .eq("id", balance.id);
      } else {
        // Remove from pending
        await adminClient
          .from("hr_leave_balances")
          .update({
            pending_days: Math.max(0, Number(balance.pending_days) - totalDays),
          })
          .eq("id", balance.id);
      }
    }

    return new Response(JSON.stringify({ success: true, status: action }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("hr-leave-request-approve error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: corsHeaders });
  }
});

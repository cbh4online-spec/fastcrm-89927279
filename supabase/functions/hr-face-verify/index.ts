import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, verified: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { employee_id, workspace_id, photo_base64 } = await req.json();

    if (!employee_id || !workspace_id || !photo_base64) {
      return errorResponse("Campos obrigatórios em falta (employee_id, workspace_id, photo_base64).");
    }

    // 1. Fetch employee with avatar
    const { data: employee, error: empError } = await supabase
      .from("hr_employees")
      .select("id, full_name, avatar_url")
      .eq("id", employee_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (empError) throw empError;
    if (!employee) return errorResponse("Colaborador não encontrado.");
    if (!employee.avatar_url) {
      return errorResponse("Colaborador sem foto de perfil. Adicione uma foto antes de usar a verificação facial.");
    }

    // 2. Call Lovable AI (Gemini 2.5 Flash) for face comparison
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY não configurada.", 500);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a facial verification system. Compare the two face images provided. " +
              "If they show the same person, reply ONLY with the word 'match'. " +
              "If they do NOT show the same person, reply ONLY with the word 'no_match'. " +
              "If you cannot detect a face in either image, reply ONLY with 'no_face'. " +
              "Do not add any other text.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Compare these two face images. Image 1 is the reference photo. Image 2 is the live capture. Are they the same person?",
              },
              {
                type: "image_url",
                image_url: { url: employee.avatar_url },
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${photo_base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return errorResponse("Limite de pedidos excedido. Tente novamente em breve.", 429);
      if (status === 402) return errorResponse("Créditos AI esgotados. Contacte o administrador.", 402);
      console.error("AI gateway error:", status, await aiResponse.text());
      return errorResponse("Erro no serviço de verificação facial.", 500);
    }

    const aiData = await aiResponse.json();
    const verdict = (aiData.choices?.[0]?.message?.content || "").trim().toLowerCase();

    if (verdict === "no_face") {
      return errorResponse("Não foi possível detectar um rosto na imagem. Tente novamente com melhor iluminação.");
    }

    if (verdict !== "match") {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          employee_name: employee.full_name,
          error: "Verificação facial falhou — o rosto não corresponde ao colaborador.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Face matched — determine entry_type and register attendance
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: openSession } = await supabase
      .from("hr_work_sessions")
      .select("id, clock_in_at, break_minutes")
      .eq("employee_id", employee_id)
      .eq("session_date", today)
      .is("clock_out_at", null)
      .maybeSingle();

    const entry_type = openSession ? "clock_out" : "clock_in";

    // Insert time entry
    const { error: entryError } = await supabase.from("hr_time_entries").insert({
      workspace_id,
      employee_id,
      entry_type,
      recorded_at: now.toISOString(),
      method: "face",
      notes: "Registo por verificação facial",
    });
    if (entryError) throw entryError;

    // Upsert work session
    let overtime_alert = null;

    if (entry_type === "clock_in") {
      await supabase.from("hr_work_sessions").insert({
        workspace_id,
        employee_id,
        session_date: today,
        clock_in_at: now.toISOString(),
        status: "incomplete",
      });
    } else if (openSession) {
      const clockInTime = new Date(openSession.clock_in_at).getTime();
      const totalMin = Math.round((now.getTime() - clockInTime) / 60000);
      const breakMin = openSession.break_minutes || 0;
      const workedMin = Math.max(0, totalMin - breakMin);

      await supabase
        .from("hr_work_sessions")
        .update({
          clock_out_at: now.toISOString(),
          total_minutes: totalMin,
          worked_minutes: workedMin,
          status: "complete",
          updated_at: now.toISOString(),
        })
        .eq("id", openSession.id);

      const { data: laborRule } = await supabase
        .from("hr_country_labor_rules")
        .select("rules")
        .eq("workspace_id", workspace_id)
        .eq("is_active", true)
        .maybeSingle();

      const maxDailyHours = (laborRule?.rules as any)?.max_daily_hours || 8;
      const maxDailyMin = maxDailyHours * 60;
      const overtimeMin = Math.max(0, workedMin - maxDailyMin);

      overtime_alert = {
        exceeded: overtimeMin > 0,
        overtime_minutes: overtimeMin,
        max_daily_minutes: maxDailyMin,
        worked_minutes: workedMin,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        employee_name: employee.full_name,
        action: entry_type,
        recorded_at: now.toISOString(),
        overtime_alert,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("hr-face-verify error:", err);
    return new Response(
      JSON.stringify({ success: false, verified: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

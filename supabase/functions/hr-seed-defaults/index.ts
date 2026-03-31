import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ABSENCE_TYPES = [
  { name: "Férias", color: "#10b981", paid: true, requires_approval: true, max_days_per_year: 22 },
  { name: "Falta Justificada", color: "#f59e0b", paid: true, requires_approval: true, max_days_per_year: null },
  { name: "Falta Injustificada", color: "#ef4444", paid: false, requires_approval: false, max_days_per_year: null },
  { name: "Baixa Médica", color: "#8b5cf6", paid: true, requires_approval: false, max_days_per_year: null },
  { name: "Licença de Maternidade/Paternidade", color: "#06b6d4", paid: true, requires_approval: true, max_days_per_year: null },
  { name: "Formação", color: "#6366f1", paid: true, requires_approval: true, max_days_per_year: null },
];

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

    const { workspace_id } = await req.json();

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if already seeded
    const { count } = await supabase
      .from("hr_absence_types")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id);

    if (count && count > 0) {
      return new Response(JSON.stringify({ success: true, message: "Already seeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const rows = DEFAULT_ABSENCE_TYPES.map(t => ({ ...t, workspace_id }));
    const { error } = await supabase.from("hr_absence_types").insert(rows);

    return new Response(JSON.stringify({ success: !error, error: error?.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

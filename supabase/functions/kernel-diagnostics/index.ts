// FastCRM Kernel — Diagnostics
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id } = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) eventos sem registry
    const evtsQ = supabase
      .from("kernel_events")
      .select("event_name", { count: "exact" })
      .not("event_name", "is", null)
      .limit(2000);
    const regQ = supabase.from("kernel_event_registry").select("event_type");

    const [{ data: evts }, { data: regs }, { data: failed }, { data: criticalImpacts }, { data: orphanEdges }] =
      await Promise.all([
        workspace_id ? evtsQ.eq("workspace_id", workspace_id) : evtsQ,
        regQ,
        supabase.from("kernel_events").select("id,event_name,created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(20),
        supabase.from("kernel_change_impacts").select("id,title,severity,status").in("severity", ["high", "critical"]).eq("status", "open").limit(20),
        supabase.from("kernel_context_edges").select("id,from_entity_id,to_entity_id").limit(5),
      ]);

    const regSet = new Set((regs ?? []).map((r) => r.event_type));
    const unregistered = Array.from(new Set((evts ?? []).map((e: any) => e.event_name).filter((n) => n && !regSet.has(n))));

    const recommendations: string[] = [];
    if (unregistered.length) recommendations.push(`Registar ${unregistered.length} event_type não declarados.`);
    if ((failed ?? []).length) recommendations.push(`Investigar ${failed!.length} eventos com status=failed.`);
    if ((criticalImpacts ?? []).length) recommendations.push(`Resolver ${criticalImpacts!.length} impactos críticos abertos.`);

    return json({
      ok: true,
      unregistered_events: unregistered.slice(0, 50),
      failed_events: failed,
      orphan_edges: orphanEdges,
      open_critical_impacts: criticalImpacts,
      recommendations,
    });
  } catch (err) {
    console.error("[kernel-diagnostics]", err);
    return json({ ok: false, fallback: true, error: (err as Error).message }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

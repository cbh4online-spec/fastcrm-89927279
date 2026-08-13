// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const correlationId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Sweep broken promises first (idempotent)
    const { data: brokenCount, error: promErr } = await supabase.rpc(
      "collections_check_payment_promises",
    );
    if (promErr) console.error("[collections-auto-executor] promises sweep error", promErr);

    // 2. Fetch due cases
    const nowIso = new Date().toISOString();
    const { data: dueCases, error: fetchErr } = await supabase
      .from("collection_cases")
      .select("id, workspace_id, status, sequence_id, next_action_at")
      .lte("next_action_at", nowIso)
      .not("sequence_id", "is", null)
      .in("status", ["new", "in_progress", "promise"])
      .is("deleted_at", null)
      .order("next_action_at", { ascending: true })
      .limit(100);

    if (fetchErr) throw fetchErr;

    const results: any[] = [];
    for (const c of dueCases ?? []) {
      try {
        const { data: r, error: advErr } = await supabase.rpc("collections_advance_step", {
          p_case_id: c.id,
        });
        if (advErr) {
          results.push({ case_id: c.id, ok: false, error: advErr.message });
          continue;
        }

        const advanced = r as any;
        let delivery: any = null;

        // 3. Despachar efectivamente a comunicação da acção criada
        if (advanced?.ok && advanced?.action_id) {
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/collections-dispatch-action`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_ROLE}`,
              },
              body: JSON.stringify({ actionId: advanced.action_id }),
            });
            const out = await res.json().catch(() => null);
            delivery = out?.delivery ?? { status: "failed", error: `HTTP ${res.status}` };
          } catch (e: any) {
            delivery = { status: "failed", error: e?.message ?? "dispatch_error" };
          }
        }

        results.push({ case_id: c.id, ...advanced, delivery });
      } catch (e: any) {
        results.push({ case_id: c.id, ok: false, error: e?.message ?? "unknown" });
      }
    }


    const summary = {
      ok: true,
      correlation_id: correlationId,
      duration_ms: Date.now() - startedAt,
      promises_broken: brokenCount ?? 0,
      cases_processed: results.length,
      cases_advanced: results.filter((r) => r.ok && !r.escalated).length,
      cases_escalated: results.filter((r) => r.escalated).length,
      cases_skipped: results.filter((r) => !r.ok && r.reason === "pending_promise").length,
      results,
    };

    console.log("[collections-auto-executor]", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[collections-auto-executor] fatal", e);
    return new Response(
      JSON.stringify({
        ok: false,
        fallback: true,
        internal_error: e?.message ?? "unknown",
        correlation_id: correlationId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

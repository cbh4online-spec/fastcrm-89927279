// portals-smoke-test — Sprint 1
// Verifica saúde dos 3 portais públicos (Customer/Proposal/Onboarding):
// - Customer Portal: presença de stripe customer + sessões recentes
// - Proposal Portal: existe proposta com public_token; tenta carregar via portal-load-proposal
// - Onboarding Portal: existe checklist/projeto; tenta carregar via portal-load-onboarding
// Persiste resultado em sprint_smoke_runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
type Suite = "customer_portal" | "proposal_portal" | "onboarding_portal";
interface Step { name: string; status: "pass" | "fail" | "warn"; detail?: unknown; duration_ms?: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const t0 = Date.now();
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claimsData } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claimsData?.claims?.sub;
    if (!userId) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: superCheck } = await admin.rpc("is_super_admin", { _user_id: userId });
    if (!superCheck) return j({ error: "Forbidden" }, 403);

    const { workspace_id, suites } = await req.json().catch(() => ({}));
    if (!workspace_id) return j({ error: "workspace_id obrigatório" }, 400);
    const targets: Suite[] = (suites && Array.isArray(suites) && suites.length > 0)
      ? suites
      : ["customer_portal", "proposal_portal", "onboarding_portal"];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const results: Record<Suite, { status: string; steps: Step[]; duration_ms: number }> = {} as never;

    for (const suite of targets) {
      const ts = Date.now();
      const steps: Step[] = [];

      if (suite === "customer_portal") {
        // Stripe key configured?
        const sk = Deno.env.get("STRIPE_SECRET_KEY");
        steps.push({ name: "stripe_key_configured", status: sk ? "pass" : "warn", detail: sk ? "present" : "missing" });
        // Sessões registadas
        const { count } = await admin.from("customer_portal_sessions")
          .select("id", { count: "exact", head: true });
        steps.push({ name: "portal_sessions_table", status: count !== null ? "pass" : "fail", detail: { count: count ?? 0 } });
      }

      if (suite === "proposal_portal") {
        // Encontrar proposta com public_token deste workspace
        const sa = Date.now();
        const { data: proposal } = await admin.from("proposals")
          .select("id, public_token, title")
          .eq("workspace_id", workspace_id)
          .not("public_token", "is", null)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!proposal?.public_token) {
          steps.push({ name: "find_proposal_token", status: "warn", detail: "no_proposal_with_public_token", duration_ms: Date.now() - sa });
        } else {
          steps.push({ name: "find_proposal_token", status: "pass", detail: { proposal_id: proposal.id }, duration_ms: Date.now() - sa });
          // Chamar portal-load-proposal
          const sl = Date.now();
          try {
            const r = await fetch(`${supabaseUrl}/functions/v1/portal-load-proposal?token=${encodeURIComponent(proposal.public_token)}`);
            const ok = r.ok;
            const txt = await r.text();
            steps.push({
              name: "load_proposal_endpoint",
              status: ok ? "pass" : "fail",
              detail: { status: r.status, body_preview: txt.slice(0, 120) },
              duration_ms: Date.now() - sl,
            });
          } catch (e) {
            steps.push({ name: "load_proposal_endpoint", status: "fail", detail: String(e), duration_ms: Date.now() - sl });
          }
        }
      }

      if (suite === "onboarding_portal") {
        const sa = Date.now();
        const { data: project } = await admin.from("customer_onboarding_projects")
          .select("id, public_token")
          .eq("workspace_id", workspace_id)
          .not("public_token", "is", null)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!project?.public_token) {
          steps.push({ name: "find_onboarding_token", status: "warn", detail: "no_project_with_public_token", duration_ms: Date.now() - sa });
        } else {
          steps.push({ name: "find_onboarding_token", status: "pass", detail: { project_id: project.id }, duration_ms: Date.now() - sa });
          const sl = Date.now();
          try {
            const r = await fetch(`${supabaseUrl}/functions/v1/portal-load-onboarding?token=${encodeURIComponent(project.public_token)}`);
            const ok = r.ok;
            const txt = await r.text();
            steps.push({
              name: "load_onboarding_endpoint",
              status: ok ? "pass" : "fail",
              detail: { status: r.status, body_preview: txt.slice(0, 120) },
              duration_ms: Date.now() - sl,
            });
          } catch (e) {
            steps.push({ name: "load_onboarding_endpoint", status: "fail", detail: String(e), duration_ms: Date.now() - sl });
          }
        }
      }

      const fails = steps.filter((s) => s.status === "fail").length;
      const warns = steps.filter((s) => s.status === "warn").length;
      const status = fails > 0 ? "fail" : warns > 0 ? "warn" : "pass";
      const duration = Date.now() - ts;

      await admin.from("sprint_smoke_runs").insert({
        suite, workspace_id, triggered_by: userId,
        status, steps: steps as never,
        summary: `${suite}: ${steps.length} passos, ${fails} fail, ${warns} warn`,
        duration_ms: duration,
      });

      results[suite] = { status, steps, duration_ms: duration };
    }

    return j({ ok: true, results, duration_ms: Date.now() - t0 });
  } catch (e) {
    return j({ ok: false, error: e instanceof Error ? e.message : String(e) }, 200);
  }
});

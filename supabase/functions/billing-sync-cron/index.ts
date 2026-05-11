// Cron entrypoint — fans out sync to all active billing integrations
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const cronSecret = req.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== Deno.env.get("CRON_SECRET")) {
      return json({ ok: false, error: "Unauthorized" }, 200);
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: integrations, error } = await admin
      .from("workspace_billing_integrations")
      .select("id, provider")
      .eq("is_active", true)
      .eq("provider", "invoicexpress");
    if (error) throw error;

    const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/invoicexpress-sync-invoices`;
    const results: any[] = [];
    for (const i of integrations || []) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": cronSecret,
          },
          body: JSON.stringify({ integration_id: i.id, since, trigger: "cron" }),
        });
        const data = await r.json().catch(() => ({}));
        results.push({ id: i.id, ok: data?.ok, run_id: data?.run_id, error: data?.error });
      } catch (e: any) {
        results.push({ id: i.id, ok: false, error: e?.message });
      }
    }
    return json({ ok: true, count: results.length, results }, 200);
  } catch (e: any) {
    console.error("[billing-sync-cron] internal_error", e);
    return json({ ok: false, error: e?.message || "internal_error" }, 200);
  }
});

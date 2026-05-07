// FastCRM Kernel — Replay Events (admin)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { workspace_id, event_type, date_from, date_to, dry_run = true, limit = 100 } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let q = supabase.from("kernel_events").select("id,event_name,workspace_id,status").order("created_at", { ascending: false }).limit(Math.min(limit, 500));
    if (workspace_id) q = q.eq("workspace_id", workspace_id);
    if (event_type) q = q.eq("event_name", event_type);
    if (date_from) q = q.gte("created_at", date_from);
    if (date_to) q = q.lte("created_at", date_to);
    const { data, error } = await q;
    if (error) throw error;

    if (dry_run) {
      return json({ ok: true, dry_run: true, count: data?.length ?? 0, events: data });
    }

    let processed = 0;
    for (const ev of data ?? []) {
      const r = await supabase.functions.invoke("kernel-process-event", { body: { event_id: ev.id } });
      if (!r.error) processed++;
    }
    return json({ ok: true, dry_run: false, processed });
  } catch (err) {
    console.error("[kernel-replay-events]", err);
    return json({ ok: false, fallback: true, error: (err as Error).message }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

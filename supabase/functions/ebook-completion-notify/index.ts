import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { ebook_id, view_id, contact_id, lead_id, completion_pct, workspace_id } = await req.json();

    if (!ebook_id || !workspace_id || (!contact_id && !lead_id)) {
      return new Response(JSON.stringify({ ok: true, skipped: "missing fields" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: ebook } = await supabase
      .from("ebooks")
      .select("title, slug, notify_manager_enabled, notify_manager_threshold_pct, created_by")
      .eq("id", ebook_id)
      .maybeSingle();

    if (!ebook?.notify_manager_enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "notify disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const threshold = ebook.notify_manager_threshold_pct ?? 70;
    if ((completion_pct ?? 0) < threshold) {
      return new Response(JSON.stringify({ ok: true, skipped: "below threshold" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Idempotência: já existe evento hot_lead para este view?
    const { data: existing } = await supabase
      .from("kernel_events")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("type", "ebook.hot_lead")
      .eq("entity_id", contact_id || lead_id)
      .contains("payload", { ebook_view_id: view_id })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: "already notified" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const entityKind = contact_id ? "contact" : "lead";
    const entityId = contact_id || lead_id;

    // Emite evento kernel hot_lead
    await supabase.from("kernel_events").insert({
      workspace_id,
      type: "ebook.hot_lead",
      entity_kind: entityKind,
      entity_id: entityId,
      actor_type: "system",
      actor_id: "ebook-completion-notify",
      source_module: "ebooks",
      schema_version: 1,
      occurred_at: new Date().toISOString(),
      payload: {
        ebook_id,
        ebook_view_id: view_id,
        ebook_title: ebook.title,
        completion_pct,
        threshold,
      },
    });

    return new Response(JSON.stringify({ ok: true, notified: true, entity_kind: entityKind, entity_id: entityId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("ebook-completion-notify error:", err);
    return new Response(JSON.stringify({ ok: true, fallback: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

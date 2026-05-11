import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const nowIso = new Date().toISOString();

    const { data: due, error: queryErr } = await supabase
      .from("whatsapp_scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (queryErr) throw queryErr;
    if (!due || due.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let sent = 0;
    let failed = 0;

    for (const msg of due) {
      try {
        // Optimistic lock: bump attempts and re-check status
        const { data: locked, error: lockErr } = await supabase
          .from("whatsapp_scheduled_messages")
          .update({ attempts: (msg.attempts ?? 0) + 1 })
          .eq("id", msg.id)
          .eq("status", "pending")
          .select()
          .maybeSingle();
        if (lockErr || !locked) continue;

        // Check opt-out
        const { data: optout } = await supabase
          .from("whatsapp_optouts")
          .select("id")
          .eq("workspace_id", msg.workspace_id)
          .eq("phone", msg.to_phone)
          .maybeSingle();
        if (optout) {
          await supabase
            .from("whatsapp_scheduled_messages")
            .update({ status: "cancelled", last_error: "Contacto opt-out" })
            .eq("id", msg.id);
          failed++;
          continue;
        }

        const { data: sendRes, error: sendErr } = await supabase.functions.invoke(
          "whatsapp-pro-send",
          {
            body: {
              workspace_id: msg.workspace_id,
              conversation_id: msg.conversation_id,
              to: msg.to_phone,
              text: msg.body,
              media_url: msg.media_url,
              media_mime_type: msg.media_mime_type,
            },
          },
        );

        if (sendErr || (sendRes && sendRes.error)) {
          const errText = sendErr?.message || sendRes?.error || "Erro desconhecido";
          await supabase
            .from("whatsapp_scheduled_messages")
            .update({
              status: msg.attempts >= 2 ? "failed" : "pending",
              last_error: errText,
            })
            .eq("id", msg.id);
          failed++;
        } else {
          await supabase
            .from("whatsapp_scheduled_messages")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              external_message_id: sendRes?.message_id || sendRes?.external_message_id || null,
              last_error: null,
            })
            .eq("id", msg.id);
          sent++;

          // Recurrence: create next occurrence if metadata.recurrence != 'none'
          try {
            const recurrence = (msg.metadata as any)?.recurrence as
              | "none"
              | "daily"
              | "weekly"
              | "monthly"
              | undefined;
            if (recurrence && recurrence !== "none") {
              const base = new Date(msg.scheduled_at as string);
              const next = new Date(base);
              if (recurrence === "daily") next.setUTCDate(next.getUTCDate() + 1);
              else if (recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7);
              else if (recurrence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);

              await supabase.from("whatsapp_scheduled_messages").insert({
                workspace_id: msg.workspace_id,
                created_by: msg.created_by,
                conversation_id: msg.conversation_id,
                contact_id: msg.contact_id,
                lead_id: msg.lead_id,
                to_phone: msg.to_phone,
                body: msg.body,
                media_url: msg.media_url,
                media_mime_type: msg.media_mime_type,
                scheduled_at: next.toISOString(),
                timezone: msg.timezone,
                status: "pending",
                metadata: { ...(msg.metadata ?? {}), recurrence_parent_id: msg.id },
              });
            }
          } catch (recErr) {
            console.error("recurrence insert failed", recErr);
          }
        }
      } catch (innerErr) {
        console.error("scheduled dispatch error", innerErr);
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({
            status: msg.attempts >= 2 ? "failed" : "pending",
            last_error: String(innerErr?.message || innerErr),
          })
          .eq("id", msg.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: due.length, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("whatsapp-pro-scheduled-dispatch fatal", err);
    return new Response(
      JSON.stringify({ ok: false, fallback: true, error: String(err?.message || err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

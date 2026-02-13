import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch pending items due now
    const { data: pendingItems, error: qErr } = await supabaseAdmin
      .from("followup_queue")
      .select("*")
      .eq("status", "pending")
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true })
      .limit(50);

    if (qErr) throw qErr;
    if (!pendingItems || pendingItems.length === 0) {
      return new Response(JSON.stringify({ processed: 0, cancelled: 0, deferred: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Optionally filter by workspace_id
    const items = workspace_id ? pendingItems.filter((i: any) => i.workspace_id === workspace_id) : pendingItems;

    let processed = 0, cancelled = 0, deferred = 0;

    for (const item of items) {
      try {
        // 2. Fetch policy
        const { data: policy } = await supabaseAdmin
          .from("ai_followup_policies")
          .select("*")
          .eq("id", item.policy_id)
          .single();

        if (!policy || !policy.is_active) {
          await supabaseAdmin.from("followup_queue").update({ status: "cancelled" }).eq("id", item.id);
          cancelled++;
          continue;
        }

        // 3. Check if contact already replied (inbound message after queue creation)
        const { data: recentInbound } = await supabaseAdmin
          .from("messages")
          .select("id")
          .eq("conversation_id", item.conversation_id)
          .eq("direction", "inbound")
          .gt("created_at", item.created_at)
          .limit(1);

        if (recentInbound && recentInbound.length > 0) {
          await supabaseAdmin.from("followup_queue").update({ status: "cancelled" }).eq("id", item.id);
          cancelled++;
          continue;
        }

        // 4. Check working hours
        const workingHours = policy.working_hours as any;
        if (workingHours?.tz && workingHours?.windows) {
          const now = new Date();
          const hour = now.getHours(); // simplified — production should use timezone
          const windows = workingHours.windows as Array<{ start: number; end: number }>;
          const inWindow = windows.some((w: any) => hour >= w.start && hour < w.end);
          if (!inWindow) {
            // Defer to next working window start
            const nextStart = windows[0]?.start || 9;
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(nextStart, 0, 0, 0);
            await supabaseAdmin.from("followup_queue").update({ next_run_at: tomorrow.toISOString() }).eq("id", item.id);
            deferred++;
            continue;
          }
        }

        // 5. Trigger follow-up message via ai-inbox-reply
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        await fetch(`${supabaseUrl}/functions/v1/ai-inbox-reply`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspace_id: item.workspace_id,
            conversation_id: item.conversation_id,
            bot_id: item.bot_id,
            is_followup: true,
            followup_step: item.step_index,
          }),
        });

        // 6. Calculate next step
        const cadence = policy.cadence as any;
        const delays = cadence?.delays_minutes || [60, 360, 1440];
        const nextStep = item.step_index + 1;

        if (nextStep >= delays.length) {
          // Last step — mark completed
          await supabaseAdmin.from("followup_queue").update({ status: "completed", step_index: nextStep }).eq("id", item.id);
        } else {
          // Schedule next
          const nextDelay = delays[nextStep];
          const nextRun = new Date(Date.now() + nextDelay * 60 * 1000);
          await supabaseAdmin.from("followup_queue").update({
            step_index: nextStep,
            next_run_at: nextRun.toISOString(),
          }).eq("id", item.id);
        }

        processed++;
      } catch (itemErr) {
        console.error(`Error processing queue item ${item.id}:`, itemErr);
      }
    }

    return new Response(JSON.stringify({ processed, cancelled, deferred }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("auto-followup-scheduler error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

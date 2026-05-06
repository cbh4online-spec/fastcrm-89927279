// supabase/functions/voice-provider-webhook/index.ts
// Recebe eventos de fornecedores de voz (mock por enquanto). Sempre 200.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const providerName = url.searchParams.get("provider") ?? "mock";
    const workspaceId = url.searchParams.get("workspace_id");
    const payload = await req.json().catch(() => ({}));

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const eventType = (payload as Record<string, unknown>).event_type as string ?? "unknown";
    const providerCallId = (payload as Record<string, unknown>).call_id as string ?? null;

    await admin.from("voice_provider_logs").insert({
      workspace_id: workspaceId,
      provider_name: providerName,
      event_type: eventType,
      direction: "webhook",
      provider_call_id: providerCallId,
      payload,
      processed: false,
    });

    // Atualiza call log se existir
    if (providerCallId) {
      const status = (payload as Record<string, unknown>).status as string | undefined;
      if (status) {
        await admin
          .from("voice_call_logs")
          .update({ provider_status: status, status: mapStatus(status) })
          .eq("provider_call_id", providerCallId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-provider-webhook fatal", e);
    return new Response(JSON.stringify({ ok: true, fallback: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapStatus(s: string): string {
  const map: Record<string, string> = {
    started: "in_progress",
    ringing: "ringing",
    answered: "in_progress",
    completed: "completed",
    missed: "missed",
    failed: "failed",
    no_answer: "no_answer",
    voicemail: "voicemail",
  };
  return map[s] ?? "completed";
}

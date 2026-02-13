import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, conversation_id, trigger_reason } = await req.json();
    if (!workspace_id || !conversation_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id or conversation_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch messages
    const { data: messages, error: msgErr } = await supabaseAdmin
      .from("messages")
      .select("content, direction, sender_name, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (msgErr) throw msgErr;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Build transcript
    const transcript = messages
      .map((m: any) => `[${m.direction === 'inbound' ? 'Cliente' : 'Agente'}${m.sender_name ? ` (${m.sender_name})` : ''}] ${m.content || ''}`)
      .join("\n");

    // 3. Generate summary via AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Summarize this conversation in Portuguese (PT). Include: main topic, key decisions, action items, and outcome. Keep it under 200 words. Trigger: ${trigger_reason || 'manual'}.`
          },
          { role: "user", content: transcript }
        ],
      }),
    });

    let summary = "Resumo indisponível";
    if (aiResp.ok) {
      const aiData = await aiResp.json();
      summary = aiData.choices?.[0]?.message?.content || summary;
    }

    // 4. Upsert into conversation_sessions
    const { data: existingSession } = await supabaseAdmin
      .from("conversation_sessions")
      .select("id")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sessionId: string;

    if (existingSession) {
      await supabaseAdmin
        .from("conversation_sessions")
        .update({ summary, transcript, session_end_at: new Date().toISOString() })
        .eq("id", existingSession.id);
      sessionId = existingSession.id;
    } else {
      const { data: newSession } = await supabaseAdmin
        .from("conversation_sessions")
        .insert({
          conversation_id,
          workspace_id,
          summary,
          transcript,
          session_end_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      sessionId = newSession?.id || "unknown";
    }

    return new Response(JSON.stringify({
      session_id: sessionId,
      summary,
      transcript_length: transcript.length,
      trigger_reason: trigger_reason || "manual",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("conversation-summary-generator error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

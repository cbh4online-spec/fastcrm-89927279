import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recording_id } = await req.json();
    if (!recording_id) {
      return new Response(JSON.stringify({ error: "recording_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to processing
    await supabase
      .from("meeting_recordings")
      .update({ ai_sentiment: null, updated_at: new Date().toISOString() })
      .eq("id", recording_id);

    // Fetch segments
    const { data: segments, error: segErr } = await supabase
      .from("meeting_transcript_segments")
      .select("*")
      .eq("recording_id", recording_id)
      .order("start_time_ms", { ascending: true });

    if (segErr) throw segErr;
    if (!segments || segments.length === 0) {
      return new Response(JSON.stringify({ error: "No transcript segments found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build transcript text
    const transcriptText = segments
      .map((s: any) => {
        const mins = Math.floor(s.start_time_ms / 60000);
        const secs = Math.floor((s.start_time_ms % 60000) / 1000);
        const ts = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        return `[${ts}] ${s.speaker_label}${s.speaker_role ? ` (${s.speaker_role})` : ""}: ${s.content}`;
      })
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a meeting analysis AI. Analyze the transcript and extract structured insights. Always respond using the provided tool.",
          },
          {
            role: "user",
            content: `Analyze this meeting transcript and extract: a summary, action items with assignees, topics discussed, key moments (decisions, objections, insights, commitments, questions), and overall sentiment.\n\nTranscript:\n${transcriptText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_transcript",
              description: "Return structured analysis of the meeting transcript",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Brief meeting summary (2-3 sentences)" },
                  sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] },
                  topics: {
                    type: "array",
                    items: { type: "string" },
                    description: "Main topics discussed",
                  },
                  action_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        assignee: { type: "string" },
                      },
                      required: ["title"],
                      additionalProperties: false,
                    },
                  },
                  key_moments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["decision", "action_item", "question", "objection", "insight", "commitment"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        timestamp_ms: { type: "number" },
                      },
                      required: ["type", "title", "timestamp_ms"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "sentiment", "topics", "action_items", "key_moments"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_transcript" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No tool call in AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Update recording with AI results
    await supabase
      .from("meeting_recordings")
      .update({
        ai_summary: analysis.summary,
        ai_sentiment: analysis.sentiment,
        ai_topics: analysis.topics,
        ai_action_items: analysis.action_items,
        transcription_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recording_id);

    // Insert highlights
    if (analysis.key_moments && analysis.key_moments.length > 0) {
      // Delete old highlights first
      await supabase
        .from("meeting_transcript_highlights")
        .delete()
        .eq("recording_id", recording_id);

      const highlights = analysis.key_moments.map((m: any) => {
        // Find closest segment
        const closest = segments.reduce((prev: any, curr: any) =>
          Math.abs(curr.start_time_ms - m.timestamp_ms) < Math.abs(prev.start_time_ms - m.timestamp_ms)
            ? curr
            : prev
        );

        return {
          recording_id,
          segment_id: closest?.id || null,
          highlight_type: m.type,
          title: m.title,
          description: m.description || null,
          start_time_ms: m.timestamp_ms,
          assignee: m.type === "action_item" ? (analysis.action_items.find((a: any) => a.title === m.title)?.assignee || null) : null,
        };
      });

      await supabase.from("meeting_transcript_highlights").insert(highlights);

      // Mark key moment segments
      const segmentIds = highlights.map((h: any) => h.segment_id).filter(Boolean);
      if (segmentIds.length > 0) {
        await supabase
          .from("meeting_transcript_segments")
          .update({ is_key_moment: true })
          .in("id", segmentIds);
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-transcript-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

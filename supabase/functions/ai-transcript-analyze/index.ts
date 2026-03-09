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

    // Get recording for workspace_id
    const { data: recording } = await supabase
      .from("meeting_recordings")
      .select("workspace_id")
      .eq("id", recording_id)
      .single();

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
            content: "You are a meeting analysis AI specialized in sales intelligence. Analyze the transcript and extract structured insights including sales-specific signals. Always respond using the provided tool.",
          },
          {
            role: "user",
            content: `Analyze this meeting transcript and extract: summary, action items, topics, key moments, sentiment, AND sales intelligence (objections, buying signals, competitor mentions, talk ratio per speaker, engagement score, deal impact, follow-up suggestions).\n\nTranscript:\n${transcriptText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_transcript",
              description: "Return structured analysis of the meeting transcript including sales intelligence",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Brief meeting summary (2-3 sentences)" },
                  sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] },
                  topics: { type: "array", items: { type: "string" } },
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
                  objections_detected: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        timestamp_ms: { type: "number" },
                        speaker: { type: "string" },
                      },
                      required: ["text", "severity"],
                      additionalProperties: false,
                    },
                  },
                  buying_signals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        signal: { type: "string" },
                        strength: { type: "string", enum: ["weak", "moderate", "strong"] },
                        timestamp_ms: { type: "number" },
                      },
                      required: ["signal", "strength"],
                      additionalProperties: false,
                    },
                  },
                  competitor_mentions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        context: { type: "string" },
                        sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                      },
                      required: ["name", "context"],
                      additionalProperties: false,
                    },
                  },
                  talk_ratio: {
                    type: "object",
                    description: "Speaker name to percentage of talk time",
                    additionalProperties: { type: "number" },
                  },
                  engagement_score: { type: "number", description: "0-100 engagement score" },
                  deal_impact: { type: "string", enum: ["positive", "neutral", "negative"] },
                  follow_up_suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        deadline_days: { type: "number" },
                      },
                      required: ["action", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "sentiment", "topics", "action_items", "key_moments", "objections_detected", "buying_signals", "competitor_mentions", "talk_ratio", "engagement_score", "deal_impact", "follow_up_suggestions"],
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No tool call in AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      await supabase.from("meeting_transcript_highlights").delete().eq("recording_id", recording_id);

      const highlights = analysis.key_moments.map((m: any) => {
        const closest = segments.reduce((prev: any, curr: any) =>
          Math.abs(curr.start_time_ms - m.timestamp_ms) < Math.abs(prev.start_time_ms - m.timestamp_ms) ? curr : prev
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

      const segmentIds = highlights.map((h: any) => h.segment_id).filter(Boolean);
      if (segmentIds.length > 0) {
        await supabase.from("meeting_transcript_segments").update({ is_key_moment: true }).in("id", segmentIds);
      }
    }

    // Insert meeting_ai_analysis with sales intelligence
    if (recording?.workspace_id) {
      await supabase.from("meeting_ai_analysis").upsert({
        recording_id,
        workspace_id: recording.workspace_id,
        objections_detected: analysis.objections_detected || [],
        buying_signals: analysis.buying_signals || [],
        competitor_mentions: analysis.competitor_mentions || [],
        follow_up_suggestions: analysis.follow_up_suggestions || [],
        talk_ratio: analysis.talk_ratio || {},
        engagement_score: analysis.engagement_score || null,
        deal_impact: analysis.deal_impact || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "recording_id" });
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

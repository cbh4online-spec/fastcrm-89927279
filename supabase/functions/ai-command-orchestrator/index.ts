import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CommandRequest {
  workspace_id: string;
  command: string;
  entity_id?: string;
  entity_name?: string;
}

// Detect command intent from natural language
function detectIntent(text: string): { type: string; entityHint?: string } {
  const lower = text.toLowerCase();
  if (lower.includes("prepare") && lower.includes("meeting") || lower.includes("preparar") && lower.includes("reunião"))
    return { type: "prepare-meeting" };
  if ((lower.includes("analyze") || lower.includes("analisar")) && (lower.includes("company") || lower.includes("empresa")))
    return { type: "analyze-company" };
  if ((lower.includes("analyze") || lower.includes("analisar")) && (lower.includes("deal") || lower.includes("oportunidade") || lower.includes("negócio")))
    return { type: "analyze-deal" };
  if (lower.includes("win") || lower.includes("ganhar") || lower.includes("fechar"))
    return { type: "win-deal" };
  if (lower.includes("followup") || lower.includes("follow-up") || lower.includes("seguimento"))
    return { type: "send-followup" };
  if (lower.includes("proposal") || lower.includes("proposta"))
    return { type: "generate-proposal" };
  if (lower.includes("pipeline") || lower.includes("funil"))
    return { type: "pipeline-status" };
  return { type: "general" };
}

async function fetchCRMContext(supabase: any, workspaceId: string, intent: string, entityId?: string) {
  const context: Record<string, any> = {};

  // Always fetch basic pipeline stats
  const { data: opps } = await supabase
    .from("opportunities")
    .select("id, title, value, status, stage_id, probability, created_at, updated_at, contact_id, company_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .order("value", { ascending: false })
    .limit(50);
  context.open_opportunities = opps || [];

  if (intent === "pipeline-status") {
    const { data: stages } = await supabase
      .from("pipeline_stages")
      .select("id, name, position")
      .eq("workspace_id", workspaceId)
      .order("position");
    context.stages = stages || [];
    return context;
  }

  // Entity-specific deep context
  if (entityId) {
    if (intent === "analyze-company" || intent === "prepare-meeting") {
      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", entityId)
        .single();
      context.company = company;

      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, email, phone, job_title")
        .eq("company_id", entityId)
        .limit(20);
      context.contacts = contacts || [];

      const { data: companyDeals } = await supabase
        .from("opportunities")
        .select("id, title, value, status, probability, created_at, updated_at")
        .eq("company_id", entityId)
        .order("created_at", { ascending: false })
        .limit(10);
      context.company_deals = companyDeals || [];
    }

    if (intent === "analyze-deal" || intent === "win-deal" || intent === "send-followup" || intent === "generate-proposal") {
      const { data: deal } = await supabase
        .from("opportunities")
        .select("*, contact:contacts(name, email, job_title), company:companies(name, industry)")
        .eq("id", entityId)
        .single();
      context.deal = deal;

      const { data: activities } = await supabase
        .from("activity_logs")
        .select("action, created_at, new_data")
        .eq("record_id", entityId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20);
      context.deal_activities = activities || [];
    }

    if (intent === "prepare-meeting") {
      const { data: meetings } = await supabase
        .from("meetings")
        .select("id, title, start_time, end_time, notes, status")
        .eq("workspace_id", workspaceId)
        .or(`contact_id.eq.${entityId},company_id.eq.${entityId}`)
        .order("start_time", { ascending: false })
        .limit(5);
      context.recent_meetings = meetings || [];
    }
  }

  // For commands without entity, fetch recent context
  if (!entityId) {
    const { data: recentActivity } = await supabase
      .from("activity_logs")
      .select("action, table_name, record_id, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);
    context.recent_activity = recentActivity || [];

    const { data: leads } = await supabase
      .from("leads")
      .select("id, name, email, status, score, created_at")
      .eq("workspace_id", workspaceId)
      .in("status", ["new", "contacted", "qualified"])
      .order("created_at", { ascending: false })
      .limit(10);
    context.active_leads = leads || [];
  }

  return context;
}

function buildSystemPrompt(intent: string): string {
  const base = "You are an AI CRM Command Center assistant for a Portuguese business CRM. Respond in Portuguese (PT). Be concise, actionable, and data-driven.";

  const intentPrompts: Record<string, string> = {
    "prepare-meeting": `${base} The user wants to prepare for a meeting. Analyze the company, contacts, deal history, and recent interactions. Provide: 1) Company summary, 2) Key talking points, 3) Risk signals, 4) Recommended approach.`,
    "analyze-company": `${base} Analyze the company profile, ICP fit, revenue potential, and deal history. Provide: 1) Company overview, 2) ICP score assessment, 3) Growth opportunities, 4) Risks.`,
    "analyze-deal": `${base} Analyze the deal health, stage progression, stakeholder engagement, and risk signals. Provide: 1) Health assessment, 2) Risk signals, 3) Recommended next actions, 4) Closing probability estimate.`,
    "win-deal": `${base} The user wants to win/close a deal. Analyze blockers, stakeholders, and competitive landscape. Provide: 1) Closing probability, 2) Key blockers, 3) Recommended closing strategy, 4) Urgency assessment.`,
    "send-followup": `${base} Generate a follow-up strategy. Analyze last interactions and deal context. Provide: 1) Follow-up message draft, 2) Best timing, 3) Channel recommendation, 4) Key points to address.`,
    "generate-proposal": `${base} Help generate a proposal outline. Analyze company needs and deal context. Provide: 1) Proposal structure, 2) Key value propositions, 3) Pricing suggestions, 4) Competitive differentiators.`,
    "pipeline-status": `${base} Analyze the full pipeline. Provide: 1) Pipeline health summary, 2) Stage distribution analysis, 3) Bottlenecks, 4) Revenue forecast, 5) Top priority deals.`,
    "general": `${base} Answer the user's CRM question using the available data. Be specific and actionable.`,
  };

  return intentPrompts[intent] || intentPrompts.general;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, command, entity_id, entity_name } = await req.json() as CommandRequest;
    if (!workspace_id || !command) throw new Error("workspace_id and command are required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { type: intent } = detectIntent(command);
    const crmContext = await fetchCRMContext(supabase, workspace_id, intent, entity_id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userMessage = entity_name
      ? `Command: ${command}\nEntity: ${entity_name} (ID: ${entity_id})\n\nCRM Context:\n${JSON.stringify(crmContext, null, 2)}`
      : `Command: ${command}\n\nCRM Context:\n${JSON.stringify(crmContext, null, 2)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: buildSystemPrompt(intent) },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "command_response",
              description: "Return structured command response",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Brief executive summary (2-3 sentences)" },
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                        type: { type: "string", enum: ["text", "list", "metric", "alert", "action"] },
                      },
                      required: ["title", "content", "type"],
                    },
                  },
                  suggested_actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        action_type: { type: "string", enum: ["navigate", "create_task", "send_email", "schedule_meeting", "generate_report"] },
                        target: { type: "string" },
                      },
                      required: ["label", "action_type"],
                    },
                  },
                  confidence: { type: "number", description: "Confidence score 0-100" },
                },
                required: ["summary", "sections", "suggested_actions", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "command_response" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("[COMMAND-ORCHESTRATOR] AI error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result = null;

    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ intent, result, entity_id, entity_name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[COMMAND-ORCHESTRATOR] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

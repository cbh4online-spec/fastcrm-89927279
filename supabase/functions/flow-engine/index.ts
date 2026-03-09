
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FlowEngineRequest {
  action: "start" | "continue" | "extract_variables";
  workspaceId: string;
  conversationId: string;
  leadId?: string;
  userMessage: string;
  channel?: string;
}

interface FlowStep {
  id: string;
  flow_id: string;
  step_type: string;
  name: string;
  message_content?: string;
  next_step_id?: string;
  condition_field?: string;
  condition_operator?: string;
  condition_value?: string;
  condition_true_step_id?: string;
  condition_false_step_id?: string;
  action_type?: string;
  action_config?: Record<string, unknown>;
  variable_id?: string;
  is_entry_point?: boolean;
  ai_model?: string;
  ai_prompt?: string;
  ai_input_source?: string;
  ai_output_variable?: string;
}

interface FlowVariable {
  id: string;
  name: string;
  type: string;
}

interface FlowSession {
  id: string;
  flow_id: string;
  conversation_id: string;
  lead_id?: string;
  current_step_id?: string;
  status: "active" | "completed" | "abandoned" | "handed_off";
  variables: Record<string, unknown>;
  workspace_id?: string;
}

interface ConversationalFlow {
  id: string;
  name: string;
  persona_id?: string;
  knowledge_base_ids?: string[];
  trigger_channels?: string[];
  trigger_keywords?: string[];
  status: "draft" | "active" | "paused" | "archived";
  workspace_id?: string;
}

const AI_STEP_TYPES = ['ai_analyze', 'ai_research', 'ai_predict', 'ai_generate_message', 'ai_summarize', 'ai_extract_tasks'];

const AI_SYSTEM_PROMPTS: Record<string, string> = {
  ai_analyze: "You are a CRM data analyst. Analyze the provided record and return structured insights including strengths, weaknesses, opportunities, and recommended next actions. Return your analysis as clear, actionable text.",
  ai_research: "You are a company research specialist. Research the provided company/lead and return enriched information including industry insights, recent news, competitive landscape, and key decision-makers. Return structured findings.",
  ai_predict: "You are a deal prediction engine. Based on the provided data, predict the likelihood of deal closure, estimated timeline, and risk factors. Return a confidence score (0-100) and detailed reasoning.",
  ai_generate_message: "You are a sales communication expert. Generate a personalized, professional message based on the context provided. The message should be natural, relevant, and action-oriented. Return only the message text.",
  ai_summarize: "You are a conversation summarizer. Summarize the provided conversation or call transcript into key points, decisions made, action items, and next steps. Be concise and actionable.",
  ai_extract_tasks: "You are a task extraction specialist. Extract all action items, tasks, and follow-ups from the provided text. For each task, include: title, assignee (if mentioned), priority (high/medium/low), and deadline (if mentioned). Return as a structured list."
};

// Find matching active flow for this conversation context
async function findActiveFlow(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  channel?: string,
  userMessage?: string
): Promise<ConversationalFlow | null> {
  const { data: flows, error } = await supabase
    .from("conversational_flows")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  if (error || !flows?.length) return null;

  let matchingFlows = flows;
  if (channel) {
    matchingFlows = flows.filter((f: ConversationalFlow) => 
      !f.trigger_channels?.length || f.trigger_channels.includes(channel)
    );
  }

  if (userMessage && matchingFlows.length > 1) {
    const lowerMessage = userMessage.toLowerCase();
    const keywordMatch = matchingFlows.find((f: ConversationalFlow) =>
      f.trigger_keywords?.some((kw: string) => lowerMessage.includes(kw.toLowerCase()))
    );
    if (keywordMatch) return keywordMatch;
  }

  return matchingFlows[0] || null;
}

async function getOrCreateSession(
  supabase: ReturnType<typeof createClient>,
  flow: ConversationalFlow,
  conversationId: string,
  leadId?: string
): Promise<FlowSession> {
  const { data: existingSession } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("flow_id", flow.id)
    .eq("conversation_id", conversationId)
    .eq("status", "active")
    .single();

  if (existingSession) return existingSession as FlowSession;

  const { data: entryStep } = await supabase
    .from("flow_steps")
    .select("id")
    .eq("flow_id", flow.id)
    .eq("is_entry_point", true)
    .single();

  const { data: newSession, error } = await supabase
    .from("conversation_sessions")
    .insert({
      flow_id: flow.id,
      conversation_id: conversationId,
      lead_id: leadId,
      current_step_id: entryStep?.id,
      status: "active",
      variables: {},
      workspace_id: flow.workspace_id,
    })
    .select()
    .single();

  if (error) throw new Error("Failed to create flow session");
  return newSession as FlowSession;
}

async function getCurrentStep(
  supabase: ReturnType<typeof createClient>,
  stepId: string
): Promise<FlowStep | null> {
  const { data: step } = await supabase
    .from("flow_steps")
    .select("*")
    .eq("id", stepId)
    .single();
  return step as FlowStep | null;
}

async function getFlowVariable(
  supabase: ReturnType<typeof createClient>,
  variableId: string
): Promise<FlowVariable | null> {
  const { data: variable } = await supabase
    .from("flow_variables")
    .select("id, name, type")
    .eq("id", variableId)
    .single();
  return variable as FlowVariable | null;
}

function extractVariable(userMessage: string, variableType: string): string | null {
  const patterns: Record<string, RegExp> = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    phone: /(\+?[0-9]{9,15})/,
    name: /^[A-Za-zÀ-ÿ\s]{2,50}$/,
    number: /\d+/,
  };
  const pattern = patterns[variableType];
  if (pattern) {
    const match = userMessage.match(pattern);
    return match ? match[0] : null;
  }
  return userMessage.trim() || null;
}

function evaluateCondition(step: FlowStep, variables: Record<string, unknown>): boolean {
  const fieldValue = variables[step.condition_field || ""];
  const conditionValue = step.condition_value;
  switch (step.condition_operator) {
    case "equals": return String(fieldValue).toLowerCase() === String(conditionValue).toLowerCase();
    case "not_equals": return String(fieldValue).toLowerCase() !== String(conditionValue).toLowerCase();
    case "contains": return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "not_contains": return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "greater_than": return Number(fieldValue) > Number(conditionValue);
    case "less_than": return Number(fieldValue) < Number(conditionValue);
    case "is_empty": return !fieldValue || String(fieldValue).trim() === "";
    case "is_not_empty": return !!fieldValue && String(fieldValue).trim() !== "";
    default: return false;
  }
}

// Execute AI step via Lovable AI Gateway
async function executeAIStep(
  step: FlowStep,
  variables: Record<string, unknown>,
  workspaceId: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = AI_SYSTEM_PROMPTS[step.step_type] || "You are a helpful AI assistant.";
  
  // Build user prompt from ai_prompt template + variables
  let userPrompt = step.ai_prompt || `Process the following data for step type: ${step.step_type}`;
  
  // Replace {variable} placeholders
  for (const [key, val] of Object.entries(variables)) {
    if (!key.startsWith('_')) {
      userPrompt = userPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val || ''));
    }
  }

  // Add input source context
  if (step.ai_input_source && variables[step.ai_input_source]) {
    userPrompt += `\n\nContext data:\n${JSON.stringify(variables[step.ai_input_source])}`;
  }

  const model = step.ai_model || "google/gemini-3-flash-preview";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[FLOW-ENGINE] AI error ${response.status}:`, errorText);
    throw new Error(`AI step failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No AI response";
}

async function processStep(
  supabase: ReturnType<typeof createClient>,
  session: FlowSession,
  step: FlowStep,
  userMessage: string,
  variables: Record<string, unknown>
): Promise<{
  response: string | null;
  nextStepId: string | null;
  updatedVariables: Record<string, unknown>;
  completed: boolean;
  handoff: boolean;
}> {
  let response: string | null = null;
  let nextStepId: string | null = step.next_step_id || null;
  const updatedVariables = { ...variables };
  let completed = false;
  let handoff = false;

  // Handle AI step types
  if (AI_STEP_TYPES.includes(step.step_type)) {
    try {
      const aiResult = await executeAIStep(step, updatedVariables, session.workspace_id || '');
      
      // Store result in output variable
      if (step.ai_output_variable) {
        updatedVariables[step.ai_output_variable] = aiResult;
      }
      
      // For ai_generate_message, the AI result IS the response
      if (step.step_type === 'ai_generate_message') {
        response = aiResult;
      } else {
        // For other AI types, store result silently and continue
        console.log(`[FLOW-ENGINE] AI step ${step.step_type} completed, result stored in ${step.ai_output_variable}`);
      }
    } catch (err) {
      console.error(`[FLOW-ENGINE] AI step error:`, err);
      response = "Ocorreu um erro ao processar a análise de IA.";
    }
    return { response, nextStepId, updatedVariables, completed, handoff };
  }

  switch (step.step_type) {
    case "message":
      response = step.message_content || null;
      break;

    case "question": {
      let varName = "response";
      let varType = "text";
      if (step.variable_id) {
        const flowVar = await getFlowVariable(supabase, step.variable_id);
        if (flowVar) { varName = flowVar.name; varType = flowVar.type || "text"; }
      }
      if (!variables[`_answered_${step.id}`]) {
        response = step.message_content || null;
        updatedVariables[`_answered_${step.id}`] = false;
        nextStepId = step.id;
      } else {
        const extracted = extractVariable(userMessage, varType);
        if (extracted) {
          updatedVariables[varName] = extracted;
          updatedVariables[`_answered_${step.id}`] = true;
        }
      }
      break;
    }

    case "condition": {
      const conditionResult = evaluateCondition(step, updatedVariables);
      nextStepId = conditionResult ? step.condition_true_step_id || null : step.condition_false_step_id || null;
      break;
    }

    case "action":
      console.log(`[FLOW-ENGINE] Executing action: ${step.action_type}`, step.action_config);
      break;

    case "goal":
      completed = true;
      response = step.message_content || null;
      await supabase.from("flow_analytics").upsert({
        flow_id: session.flow_id,
        date: new Date().toISOString().split("T")[0],
        workspace_id: session.workspace_id,
        total_sessions: 1,
        completed_sessions: 1,
        goals_achieved: 1,
      }, { onConflict: "flow_id,date", ignoreDuplicates: false });
      break;

    case "handoff":
      handoff = true;
      response = step.message_content || "Um agente humano vai continuar esta conversa em breve.";
      break;
  }

  return { response, nextStepId, updatedVariables, completed, handoff };
}

async function executeFlow(
  supabase: ReturnType<typeof createClient>,
  session: FlowSession,
  userMessage: string
): Promise<{
  responses: string[];
  sessionState: "active" | "completed" | "handed_off";
  collectedVariables: Record<string, unknown>;
}> {
  const responses: string[] = [];
  let currentStepId = session.current_step_id;
  let variables = { ...session.variables };
  let sessionState: "active" | "completed" | "handed_off" = "active";
  let iterationCount = 0;
  const maxIterations = 15; // increased for AI steps

  while (currentStepId && iterationCount < maxIterations) {
    iterationCount++;
    const step = await getCurrentStep(supabase, currentStepId);
    if (!step) break;

    const result = await processStep(supabase, session, step, userMessage, variables);
    if (result.response) responses.push(result.response);
    variables = result.updatedVariables;
    
    if (result.completed) { sessionState = "completed"; break; }
    if (result.handoff) { sessionState = "handed_off"; break; }
    if (result.nextStepId === currentStepId) break;
    
    currentStepId = result.nextStepId;
    if (step.step_type === "question") break;
  }

  await supabase
    .from("conversation_sessions")
    .update({
      current_step_id: currentStepId,
      variables: variables,
      status: sessionState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  return { responses, sessionState, collectedVariables: variables };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspaceId, conversationId, leadId, userMessage, channel }: FlowEngineRequest = await req.json();

    if (!workspaceId || !conversationId || !userMessage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flow = await findActiveFlow(supabase, workspaceId, channel, userMessage);
    if (!flow) {
      return new Response(
        JSON.stringify({ hasActiveFlow: false, message: "No active flow found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await getOrCreateSession(supabase, flow, conversationId, leadId);
    const result = await executeFlow(supabase, session, userMessage);

    return new Response(
      JSON.stringify({
        hasActiveFlow: true,
        flowId: flow.id,
        flowName: flow.name,
        sessionId: session.id,
        responses: result.responses,
        sessionState: result.sessionState,
        collectedVariables: result.collectedVariables,
        personaId: flow.persona_id,
        knowledgeBaseIds: flow.knowledge_base_ids,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FLOW-ENGINE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

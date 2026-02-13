import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  step_type: "message" | "question" | "condition" | "action" | "goal" | "handoff";
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

  if (error || !flows?.length) {
    console.log("[FLOW-ENGINE] No active flows found for workspace");
    return null;
  }

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

// Get or create session for this conversation
async function getOrCreateSession(
  supabase: ReturnType<typeof createClient>,
  flow: ConversationalFlow,
  conversationId: string,
  leadId?: string
): Promise<FlowSession> {
  // Check for existing active session
  const { data: existingSession } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("flow_id", flow.id)
    .eq("conversation_id", conversationId)
    .eq("status", "active")
    .single();

  if (existingSession) {
    return existingSession as FlowSession;
  }

  // Get entry point step
  const { data: entryStep } = await supabase
    .from("flow_steps")
    .select("id")
    .eq("flow_id", flow.id)
    .eq("is_entry_point", true)
    .single();

  // Create new session
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

  if (error) {
    console.error("[FLOW-ENGINE] Error creating session:", error);
    throw new Error("Failed to create flow session");
  }

  return newSession as FlowSession;
}

// Get current step details
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

// Get variable details by ID
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

// Extract variable from user message
function extractVariable(
  userMessage: string,
  variableType: string
): string | null {
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

  // For text type, return the whole message
  return userMessage.trim() || null;
}

// Evaluate condition
function evaluateCondition(
  step: FlowStep,
  variables: Record<string, unknown>
): boolean {
  const fieldValue = variables[step.condition_field || ""];
  const conditionValue = step.condition_value;

  switch (step.condition_operator) {
    case "equals":
      return String(fieldValue).toLowerCase() === String(conditionValue).toLowerCase();
    case "not_equals":
      return String(fieldValue).toLowerCase() !== String(conditionValue).toLowerCase();
    case "contains":
      return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "not_contains":
      return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "greater_than":
      return Number(fieldValue) > Number(conditionValue);
    case "less_than":
      return Number(fieldValue) < Number(conditionValue);
    case "is_empty":
      return !fieldValue || String(fieldValue).trim() === "";
    case "is_not_empty":
      return !!fieldValue && String(fieldValue).trim() !== "";
    default:
      return false;
  }
}

// Process step and determine response + next step
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

  switch (step.step_type) {
    case "message":
      response = step.message_content || null;
      break;

    case "question": {
      // Resolve variable info from variable_id
      let varName = "response";
      let varType = "text";
      
      if (step.variable_id) {
        const flowVar = await getFlowVariable(supabase, step.variable_id);
        if (flowVar) {
          varName = flowVar.name;
          varType = flowVar.type || "text";
        }
      }

      if (!variables[`_answered_${step.id}`]) {
        // Send the question
        response = step.message_content || null;
        updatedVariables[`_answered_${step.id}`] = false;
        nextStepId = step.id; // Stay on this step until answered
      } else {
        // Extract and store variable from user response
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
      nextStepId = conditionResult 
        ? step.condition_true_step_id || null
        : step.condition_false_step_id || null;
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
      }, {
        onConflict: "flow_id,date",
        ignoreDuplicates: false,
      });
      break;

    case "handoff":
      handoff = true;
      response = step.message_content || "Um agente humano vai continuar esta conversa em breve.";
      break;
  }

  return { response, nextStepId, updatedVariables, completed, handoff };
}

// Main flow execution logic
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
  const maxIterations = 10;

  while (currentStepId && iterationCount < maxIterations) {
    iterationCount++;
    
    const step = await getCurrentStep(supabase, currentStepId);
    if (!step) break;

    const result = await processStep(supabase, session, step, userMessage, variables);
    
    if (result.response) {
      responses.push(result.response);
    }
    
    variables = result.updatedVariables;
    
    if (result.completed) {
      sessionState = "completed";
      break;
    }
    
    if (result.handoff) {
      sessionState = "handed_off";
      break;
    }

    if (result.nextStepId === currentStepId) {
      break;
    }
    
    currentStepId = result.nextStepId;
    
    if (step.step_type === "question") {
      break;
    }
  }

  // Update session with correct column names
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

serve(async (req) => {
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

    const {
      action,
      workspaceId,
      conversationId,
      leadId,
      userMessage,
      channel,
    }: FlowEngineRequest = await req.json();

    if (!workspaceId || !conversationId || !userMessage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flow = await findActiveFlow(supabase, workspaceId, channel, userMessage);
    
    if (!flow) {
      return new Response(
        JSON.stringify({ 
          hasActiveFlow: false,
          message: "No active flow found for this context"
        }),
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

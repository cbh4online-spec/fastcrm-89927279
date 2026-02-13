import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FlowEngineRequest {
  workspaceId: string;
  conversationId: string;
  leadId?: string;
  userMessage: string;
  channel?: string;
}

interface FlowEngineResponse {
  hasActiveFlow: boolean;
  flowId?: string;
  flowName?: string;
  sessionId?: string;
  responses?: string[];
  sessionState?: "active" | "completed" | "handed_off";
  collectedVariables?: Record<string, unknown>;
  personaId?: string;
  knowledgeBaseIds?: string[];
}

interface ActiveSessionData {
  id: string;
  flow_id: string;
  current_step_id: string | null;
  state: string;
  collected_variables: Record<string, unknown>;
  flow?: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export function useFlowEngine() {
  const executeFlowMutation = useMutation({
    mutationFn: async (request: FlowEngineRequest): Promise<FlowEngineResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("flow-engine", {
        body: {
          action: "continue",
          ...request,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Flow engine error");
      }

      return response.data as FlowEngineResponse;
    },
  });

  return {
    executeFlow: executeFlowMutation.mutateAsync,
    isExecuting: executeFlowMutation.isPending,
    error: executeFlowMutation.error,
    lastResult: executeFlowMutation.data,
  };
}

// Hook to check if conversation has active flow session
export function useActiveFlowSession() {
  const checkSession = useMutation({
    mutationFn: async (conversationId: string): Promise<ActiveSessionData | null> => {
      // Use rpc or raw query since types may not be generated yet
      const { data: sessions, error } = await supabase
        .from("conversation_sessions" as any)
        .select("id, flow_id, current_step_id, status, variables")
        .eq("conversation_id", conversationId)
        .eq("status", "active")
        .limit(1);

      if (error) {
        console.error("[useActiveFlowSession] Error:", error);
        return null;
      }

      if (!sessions || sessions.length === 0) return null;

      const sessionData = sessions[0] as any;

      // Fetch flow details separately
      const { data: flowData } = await supabase
        .from("conversational_flows" as any)
        .select("id, name, status")
        .eq("id", sessionData.flow_id)
        .single();

      return {
        id: sessionData.id,
        flow_id: sessionData.flow_id,
        current_step_id: sessionData.current_step_id,
        state: sessionData.status,
        collected_variables: sessionData.variables || {},
        flow: flowData ? {
          id: (flowData as any).id,
          name: (flowData as any).name,
          status: (flowData as any).status,
        } : null,
      };
    },
  });

  return {
    checkActiveSession: checkSession.mutateAsync,
    isChecking: checkSession.isPending,
    activeSession: checkSession.data,
  };
}

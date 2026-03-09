import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface CommandSection {
  title: string;
  content: string;
  type: "text" | "list" | "metric" | "alert" | "action";
}

export interface CommandAction {
  label: string;
  action_type: "navigate" | "create_task" | "send_email" | "schedule_meeting" | "generate_report";
  target?: string;
}

export interface CommandResult {
  summary: string;
  sections: CommandSection[];
  suggested_actions: CommandAction[];
  confidence: number;
}

export interface CommandResponse {
  intent: string;
  result: CommandResult | null;
  entity_id?: string;
  entity_name?: string;
}

export interface CommandHistoryItem {
  command: string;
  response: CommandResponse;
  timestamp: Date;
}

export function useCommandOrchestrator() {
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<CommandResponse | null>(null);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);

  const execute = useCallback(async (command: string, entityId?: string, entityName?: string) => {
    if (!currentWorkspace?.id || isLoading) return;
    setIsLoading(true);
    setCurrentResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-command-orchestrator", {
        body: {
          workspace_id: currentWorkspace.id,
          command,
          entity_id: entityId,
          entity_name: entityName,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const response = data as CommandResponse;
      setCurrentResponse(response);
      setHistory((prev) => [{ command, response, timestamp: new Date() }, ...prev].slice(0, 20));
    } catch (err: any) {
      console.error("[COMMAND-CENTER] Error:", err);
      if (err?.message?.includes("429")) {
        toast.error("Limite de requisições excedido. Tente novamente em breve.");
      } else {
        toast.error("Erro ao executar comando");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, isLoading]);

  const clear = useCallback(() => {
    setCurrentResponse(null);
  }, []);

  return { execute, isLoading, currentResponse, history, clear };
}

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CommandSection {
  title: string;
  content: string;
  type: "text" | "list" | "metric" | "alert" | "action";
}

export interface CommandAction {
  label: string;
  action_type: "navigate" | "create_task" | "send_email" | "schedule_meeting" | "generate_report" | "create_followup" | "analyze_deeper" | "export_pdf";
  target?: string;
}

export interface CommandFollowUp {
  label: string;
  command: string;
  emoji: string;
}

export interface CommandResult {
  summary: string;
  sections: CommandSection[];
  suggested_actions: CommandAction[];
  follow_up_suggestions?: CommandFollowUp[];
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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<CommandResponse | null>(null);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);

  // Load persisted sessions on mount
  useEffect(() => {
    if (!currentWorkspace?.id || !user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("command_center_sessions" as any)
        .select("command, intent, entity_id, entity_name, response_summary, response_confidence, response_json, created_at")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        const restored: CommandHistoryItem[] = (data as any[]).map((row) => ({
          command: row.command,
          response: row.response_json as CommandResponse || {
            intent: row.intent || "general",
            result: row.response_summary ? {
              summary: row.response_summary,
              sections: [],
              suggested_actions: [],
              confidence: row.response_confidence || 0,
            } : null,
            entity_id: row.entity_id,
            entity_name: row.entity_name,
          },
          timestamp: new Date(row.created_at),
        }));
        setHistory(restored);
      }
    };
    load();
  }, [currentWorkspace?.id, user?.id]);

  // Persist session to DB
  const persistSession = useCallback(async (command: string, response: CommandResponse) => {
    if (!currentWorkspace?.id || !user?.id) return;
    try {
      await supabase.from("command_center_sessions" as any).insert({
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        command,
        intent: response.intent,
        entity_id: response.entity_id || null,
        entity_name: response.entity_name || null,
        response_summary: response.result?.summary || null,
        response_confidence: response.result?.confidence || null,
        response_json: response as any,
      });
    } catch (err) {
      console.warn("[COMMAND-CENTER] Failed to persist session:", err);
    }
  }, [currentWorkspace?.id, user?.id]);

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

      // Persist async
      persistSession(command, response);
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
  }, [currentWorkspace?.id, isLoading, persistSession]);

  const clear = useCallback(() => {
    setCurrentResponse(null);
  }, []);

  return { execute, isLoading, currentResponse, history, clear };
}

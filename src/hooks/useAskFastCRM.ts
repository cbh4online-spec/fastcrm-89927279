import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface AskResultItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: number;
  health_label?: string;
  link: string;
}

export interface AskResultAction {
  id: string;
  label: string;
  icon: string;
  type: "bulk_task" | "navigate" | "automation";
  payload?: Record<string, any>;
}

export interface AskResultMetric {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
}

export interface AskResult {
  header: string;
  items: AskResultItem[];
  actions: AskResultAction[];
  metric?: AskResultMetric;
}

export function useAskFastCRM() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();

  const ask = useCallback(
    async (question: string) => {
      if (!currentWorkspace?.id || !question.trim()) return;
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ask-fastcrm",
          {
            body: { question: question.trim() },
            headers: { "X-Workspace-Id": currentWorkspace.id },
          }
        );

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        setResult(data as AskResult);
      } catch (e: any) {
        const msg = e?.message || "Failed to process question";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [currentWorkspace?.id]
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const executeAction = useCallback(
    async (action: AskResultAction) => {
      if (!currentWorkspace?.id || !user?.id) return;

      switch (action.type) {
        case "navigate": {
          const link =
            action.payload?.link || "/dashboard/opportunities";
          navigate(link);
          break;
        }
        case "automation": {
          const link =
            action.payload?.link ||
            "/dashboard/automations?create=true";
          navigate(link);
          break;
        }
        case "bulk_task": {
          const dealIds: string[] = action.payload?.deal_ids || [];
          const taskTitle =
            action.payload?.task_title || "Follow up on deal";
          const priority = action.payload?.priority || "MEDIUM";

          if (dealIds.length === 0) {
            toast.info("No deals to create tasks for.");
            return;
          }

          try {
            const tasks = dealIds.map((dealId) => ({
              workspace_id: currentWorkspace.id,
              assigned_to: user.id,
              created_by: user.id,
              title: taskTitle,
              priority: priority.toLowerCase(),
              status: "pending",
              related_type: "opportunity",
              related_id: dealId,
              due_at: new Date(
                Date.now() + 2 * 86400000
              ).toISOString(),
            }));

            const { error: insertError } = await supabase
              .from("tasks")
              .insert(tasks);

            if (insertError) throw insertError;

            toast.success(
              `${dealIds.length} task${dealIds.length !== 1 ? "s" : ""} created.`
            );
          } catch (e: any) {
            toast.error(
              e?.message || "Failed to create tasks"
            );
          }
          break;
        }
      }
    },
    [currentWorkspace?.id, user?.id, navigate]
  );

  return { isLoading, result, error, ask, clear, executeAction };
}

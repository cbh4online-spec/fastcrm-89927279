import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UseSJCopilotProps {
  studentId?: string;
  cohortId?: string;
}

export function useSJCopilot({ studentId, cohortId }: UseSJCopilotProps = {}) {
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const callCopilot = useCallback(
    async (action: string, userMessage?: string) => {
      if (!currentWorkspace?.id) {
        toast.error("Workspace não selecionado");
        return;
      }

      setIsLoading(true);

      if (userMessage) {
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          "sj-copilot",
          {
            body: {
              workspaceId: currentWorkspace.id,
              action,
              studentId,
              cohortId,
              userMessage,
            },
          }
        );

        if (error) throw error;

        const assistantMessage = data?.response || "Sem resposta do assistente.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantMessage },
        ]);
      } catch (error) {
        console.error("SJ Copilot error:", error);
        toast.error("Erro ao contactar o assistente");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Desculpe, ocorreu um erro ao processar o seu pedido. Por favor, tente novamente.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentWorkspace?.id, studentId, cohortId]
  );

  const diagnose = useCallback(() => callCopilot("diagnose"), [callCopilot]);

  const validateStudent = useCallback(
    () => callCopilot("validate"),
    [callCopilot]
  );

  const analyzeChurn = useCallback(
    () => callCopilot("analyze_churn"),
    [callCopilot]
  );

  const askQuestion = useCallback(
    (question: string) => callCopilot("chat", question),
    [callCopilot]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    diagnose,
    validateStudent,
    analyzeChurn,
    askQuestion,
    clearMessages,
  };
}

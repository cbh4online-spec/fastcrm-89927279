import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface Message {
  role: "user" | "assistant";
  content: string;
  parsed?: unknown;
  action?: string;
}

export interface MessageContext {
  channel: "whatsapp" | "email";
  purpose: "followup" | "welcome" | "reminder" | "congratulations" | "course_invitation";
}

export interface SuggestedMessage {
  subject?: string;
  message: string;
  callToAction: string;
  tone: string;
  personalizationUsed?: string[];
}

export interface RecommendationExplanation {
  explanation: string;
  keyBenefits: string[];
  urgencyNote?: string;
}

export interface AIRecommendationSuggestion {
  courseType: string;
  score: number;
  reasons: string[];
  nextAction: string;
}

export interface AIRecommendationsResult {
  recommendations: AIRecommendationSuggestion[];
  dataQuality: {
    hasInterests: boolean;
    hasCompletedCourses: boolean;
    missingFields: string[];
  };
}

export interface NormalizedInterests {
  normalized: string[];
  suggestions: string[];
  unmapped: string[];
}

export interface GeneratedAutomation {
  name: string;
  description: string;
  trigger: string;
  trigger_config: Record<string, unknown>;
  conditions: Array<{
    field: string;
    operator: string;
    value: string | number | null;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  explanation: string;
}

interface UseSJCopilotProps {
  studentId?: string;
  cohortId?: string;
  enrollmentId?: string;
}

export function useSJCopilot({ studentId, cohortId, enrollmentId }: UseSJCopilotProps = {}) {
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const callCopilot = useCallback(
    async (
      action: string,
      userMessage?: string,
      additionalParams?: Record<string, unknown>
    ): Promise<{ response: string; parsed?: unknown } | null> => {
      if (!currentWorkspace?.id) {
        toast.error("Workspace não selecionado");
        return null;
      }

      setIsLoading(true);

      if (userMessage && action === "chat") {
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      }

      try {
        const { data, error } = await supabase.functions.invoke("sj-copilot", {
          body: {
            workspaceId: currentWorkspace.id,
            action,
            studentId,
            cohortId,
            enrollmentId,
            userMessage,
            ...additionalParams,
          },
        });

        if (error) throw error;

        const assistantMessage = data?.response || "Sem resposta do assistente.";
        setMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            content: assistantMessage,
            parsed: data?.parsed,
            action,
          },
        ]);

        return { response: assistantMessage, parsed: data?.parsed };
      } catch (error) {
        console.error("SJ Copilot error:", error);
        
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        
        if (errorMessage.includes("429") || errorMessage.includes("Rate limit")) {
          toast.error("Limite de pedidos atingido. Aguarde alguns segundos.");
        } else if (errorMessage.includes("402") || errorMessage.includes("créditos")) {
          toast.error("Créditos de IA esgotados. Adicione mais créditos.");
        } else {
          toast.error("Erro ao contactar o assistente");
        }
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Desculpe, ocorreu um erro ao processar o seu pedido. Por favor, tente novamente.",
          },
        ]);
        
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentWorkspace?.id, studentId, cohortId, enrollmentId]
  );

  const diagnose = useCallback(() => callCopilot("diagnose"), [callCopilot]);

  const validateStudent = useCallback(() => callCopilot("validate"), [callCopilot]);

  const analyzeChurn = useCallback(() => callCopilot("analyze_churn"), [callCopilot]);

  const askQuestion = useCallback(
    (question: string) => callCopilot("chat", question),
    [callCopilot]
  );

  const normalizeInterests = useCallback(
    async (interests: string[]): Promise<NormalizedInterests | null> => {
      const result = await callCopilot("normalize_interests", undefined, { interests });
      return result?.parsed as NormalizedInterests | null;
    },
    [callCopilot]
  );

  const suggestMessage = useCallback(
    async (context: MessageContext): Promise<SuggestedMessage | null> => {
      const result = await callCopilot("suggest_message", undefined, { messageContext: context });
      return result?.parsed as SuggestedMessage | null;
    },
    [callCopilot]
  );

  const generateAutomation = useCallback(
    async (description: string): Promise<GeneratedAutomation | null> => {
      const result = await callCopilot("generate_automation", undefined, { automationDescription: description });
      return result?.parsed as GeneratedAutomation | null;
    },
    [callCopilot]
  );

  const generateRecommendations = useCallback(
    async (): Promise<AIRecommendationsResult | null> => {
      const result = await callCopilot("generate_recommendations");
      return result?.parsed as AIRecommendationsResult | null;
    },
    [callCopilot]
  );

  const explainRecommendation = useCallback(
    async (courseId: string, matchScore: number, matchReasons: string[]): Promise<RecommendationExplanation | null> => {
      const result = await callCopilot("explain_recommendation", undefined, { 
        courseId, 
        matchScore, 
        matchReasons 
      });
      return result?.parsed as RecommendationExplanation | null;
    },
    [callCopilot]
  );

  const generateInvitation = useCallback(
    async (
      courseId: string, 
      channel: "whatsapp" | "email", 
      matchScore?: number, 
      matchReasons?: string[]
    ): Promise<SuggestedMessage | null> => {
      const result = await callCopilot("generate_invitation", undefined, { 
        courseId,
        messageContext: { channel, purpose: "course_invitation" as const },
        matchScore, 
        matchReasons 
      });
      return result?.parsed as SuggestedMessage | null;
    },
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
    normalizeInterests,
    suggestMessage,
    generateAutomation,
    generateRecommendations,
    explainRecommendation,
    generateInvitation,
    clearMessages,
  };
}

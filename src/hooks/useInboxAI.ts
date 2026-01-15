import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Message } from "@/hooks/useMessages";
import { Template } from "@/hooks/useTemplates";

export interface ReplySuggestion {
  text: string;
  tone: "formal" | "friendly" | "empathetic" | "professional";
  intent: string;
}

export interface SuggestReplyResult {
  reasoning: string;
  suggestions: ReplySuggestion[];
}

export interface ModifyReplyResult {
  modifiedText: string;
  changes: string;
}

export interface PersonalizeTemplateResult {
  personalizedText: string;
  subject?: string;
  filledVariables?: string[];
  missingVariables?: string[];
}

export interface LeadData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  tags?: string[];
}

export interface OpportunityData {
  id?: string;
  title?: string;
  value?: number;
  stage?: string;
  status?: string;
}

export type ModifyAction = "shorten" | "direct" | "rewrite" | "formal" | "friendly" | "commercial";

export function useInboxAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callInboxAI = useCallback(async <T>(
    action: "suggest_reply" | "modify_reply" | "use_template",
    payload: {
      messages?: { role: string; content: string; direction?: string }[];
      leadData?: LeadData;
      opportunityData?: OpportunityData;
      channel?: string;
      template?: { id?: string; name?: string; content?: string; subject?: string; tone?: string; goal?: string };
      currentReply?: string;
      modifyAction?: ModifyAction;
    }
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-inbox-reply", {
        body: { action, ...payload },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
        } else if (data.error.includes("credits")) {
          toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      return data?.result as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao chamar AI";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const suggestReplies = useCallback(
    (
      messages: Message[],
      leadData?: LeadData,
      opportunityData?: OpportunityData,
      channel?: string
    ) => {
      const formattedMessages = messages.map(m => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
        direction: m.direction,
      }));

      return callInboxAI<SuggestReplyResult>("suggest_reply", {
        messages: formattedMessages,
        leadData,
        opportunityData,
        channel,
      });
    },
    [callInboxAI]
  );

  const modifyReply = useCallback(
    (
      currentReply: string,
      modifyAction: ModifyAction,
      messages?: Message[],
      channel?: string
    ) => {
      const formattedMessages = messages?.map(m => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
        direction: m.direction,
      }));

      return callInboxAI<ModifyReplyResult>("modify_reply", {
        currentReply,
        modifyAction,
        messages: formattedMessages,
        channel,
      });
    },
    [callInboxAI]
  );

  const personalizeTemplate = useCallback(
    (
      template: Template,
      messages: Message[],
      leadData?: LeadData,
      opportunityData?: OpportunityData,
      channel?: string
    ) => {
      const formattedMessages = messages.map(m => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
        direction: m.direction,
      }));

      return callInboxAI<PersonalizeTemplateResult>("use_template", {
        template: {
          id: template.id,
          name: template.name,
          content: template.content,
          subject: template.subject || undefined,
          tone: template.tone,
          goal: template.goal,
        },
        messages: formattedMessages,
        leadData,
        opportunityData,
        channel,
      });
    },
    [callInboxAI]
  );

  return {
    isLoading,
    error,
    suggestReplies,
    modifyReply,
    personalizeTemplate,
  };
}

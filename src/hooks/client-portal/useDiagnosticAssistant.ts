import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RecommendedProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  similarity: number;
}

interface UseDiagnosticAssistantReturn {
  messages: Message[];
  products: RecommendedProduct[];
  loading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
}

export function useDiagnosticAssistant(workspaceId: string | undefined): UseDiagnosticAssistantReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || !workspaceId) return;

    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);
    setError(null);
    setProducts([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-diagnostic-assistant", {
        body: {
          message: userMessage,
          workspaceId,
          conversationHistory: messages.slice(-6),
        },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        const assistantMessage: Message = { role: "assistant", content: data.message };
        setMessages((prev) => [...prev, assistantMessage]);
        setProducts(data.products || []);
      } else {
        const errorMsg = data?.error || "Erro ao processar pedido";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("Diagnostic assistant error:", err);
      const errorMsg = err instanceof Error ? err.message : "Erro ao processar pedido";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, messages]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setProducts([]);
    setError(null);
  }, []);

  return {
    messages,
    products,
    loading,
    error,
    sendMessage,
    clearConversation,
  };
}

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ConversationSyncResult {
  conversations_created: number;
  conversations_updated: number;
  messages_created: number;
  messages_skipped: number;
  errors: string[];
  total_processed: number;
}

export interface ConversationSyncProgress {
  page: number;
  processed: number;
  conversations_created: number;
  messages_created: number;
}

export function useGHLConversationSync() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<ConversationSyncResult | null>(null);
  const [progress, setProgress] = useState<ConversationSyncProgress | null>(null);

  const syncConversations = useCallback(async (includeMessages = true, daysBack = 30): Promise<ConversationSyncResult | null> => {
    if (!currentWorkspace?.id) {
      toast.error("Nenhum workspace selecionado");
      return null;
    }

    setIsSyncing(true);
    setLastResult(null);
    setProgress(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        return null;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/ghl-sync-conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            stream: true,
            include_messages: includeMessages,
            days_back: daysBack,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status}`;
        toast.error(`Erro na sincronização: ${errorMessage}`);
        return null;
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        toast.error("Erro ao iniciar stream");
        return null;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let result: ConversationSyncResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.startsWith("event: ")) {
            const eventType = line.substring(7);
            const dataLine = lines[i + 1];
            
            if (dataLine?.startsWith("data: ")) {
              const data = JSON.parse(dataLine.substring(6));
              
              switch (eventType) {
                case "progress":
                  setProgress(data);
                  break;
                  
                case "complete":
                  result = data;
                  setLastResult(data);
                  break;
                  
                case "error":
                  toast.error(data.error || "Erro durante sincronização");
                  break;
              }
              
              i++;
            }
          }
        }
      }

      if (result) {
        // Invalidate conversations and messages cache to refresh UI
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
        await queryClient.invalidateQueries({ queryKey: ["messages"] });

        if (result.errors.length > 0) {
          toast.warning(
            `Sincronização parcial: ${result.conversations_created} conversas, ${result.messages_created} mensagens, ${result.errors.length} erros`
          );
        } else if (result.conversations_created === 0 && result.messages_created === 0) {
          toast.info("Nenhuma conversa nova para sincronizar");
        } else {
          toast.success(
            `Sincronização concluída: ${result.conversations_created} conversas, ${result.messages_created} mensagens`
          );
        }
      }

      return result;
    } catch (error) {
      console.error("[GHL Conversation Sync] Error:", error);
      toast.error("Erro ao sincronizar conversas do GHL");
      return null;
    } finally {
      setIsSyncing(false);
      setTimeout(() => setProgress(null), 3000);
    }
  }, [currentWorkspace?.id]);

  return {
    syncConversations,
    isSyncing,
    lastResult,
    progress,
  };
}

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  total_processed: number;
}

export interface SyncProgress {
  page: number;
  processed: number;
  created: number;
  skipped: number;
  estimatedTotal: number;
}

export function useGHLContactSync() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const syncContacts = useCallback(async (): Promise<SyncResult | null> => {
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
      
      // Use streaming mode for real-time progress
      const response = await fetch(
        `${supabaseUrl}/functions/v1/ghl-sync-contacts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            stream: true,
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
      let result: SyncResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.startsWith("event: ")) {
            const eventType = line.substring(7);
            const dataLine = lines[i + 1];
            
            if (dataLine?.startsWith("data: ")) {
              const data = JSON.parse(dataLine.substring(6));
              
              switch (eventType) {
                case "init":
                  setProgress({
                    page: 0,
                    processed: 0,
                    created: 0,
                    skipped: 0,
                    estimatedTotal: data.estimatedTotal || 0,
                  });
                  break;
                  
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
              
              i++; // Skip the data line we just processed
            }
          }
        }
      }

      if (result) {
        // Invalidate leads cache to refresh UI
        await queryClient.invalidateQueries({ queryKey: ["leads"] });

        // Show appropriate toast based on result
        if (result.errors.length > 0) {
          toast.warning(
            `Sincronização parcial: ${result.created} criados, ${result.updated} actualizados, ${result.errors.length} erros`
          );
        } else if (result.created === 0 && result.updated === 0) {
          toast.info("Nenhum contacto novo para sincronizar");
        } else {
          toast.success(
            `Sincronização concluída: ${result.created} criados, ${result.updated} actualizados`
          );
        }
      }

      return result;
    } catch (error) {
      console.error("[GHL Sync] Error:", error);
      toast.error("Erro ao sincronizar contactos do GHL");
      return null;
    } finally {
      setIsSyncing(false);
      // Clear progress after a delay to show final state
      setTimeout(() => setProgress(null), 3000);
    }
  }, [currentWorkspace?.id]);

  return {
    syncContacts,
    isSyncing,
    lastResult,
    progress,
  };
}

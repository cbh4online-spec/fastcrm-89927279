import { useState } from "react";
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

export function useGHLContactSync() {
  const { currentWorkspace } = useWorkspace();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const syncContacts = async (): Promise<SyncResult | null> => {
    if (!currentWorkspace?.id) {
      toast.error("Nenhum workspace selecionado");
      return null;
    }

    setIsSyncing(true);
    setLastResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        return null;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
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
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status}`;
        toast.error(`Erro na sincronização: ${errorMessage}`);
        return null;
      }

      const result: SyncResult = await response.json();
      setLastResult(result);

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

      return result;
    } catch (error) {
      console.error("[GHL Sync] Error:", error);
      toast.error("Erro ao sincronizar contactos do GHL");
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncContacts,
    isSyncing,
    lastResult,
  };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type NavEntityTable = "contacts" | "leads" | "companies";

const SOFT_DELETE_TABLES: NavEntityTable[] = ["contacts", "companies"];

/**
 * Lista leve de IDs (ordenada por nome) usada como fallback na navegação
 * "anterior / seguinte" quando não existe contexto guardado da listagem.
 */
export function useEntityNavIds(table: NavEntityTable) {
  const { currentWorkspace } = useWorkspace();

  const query = useQuery({
    queryKey: ["entity-nav-ids", table, currentWorkspace?.id],
    queryFn: async (): Promise<string[]> => {
      if (!currentWorkspace?.id) return [];

      let request = (supabase as any)
        .from(table)
        .select("id,name")
        .eq("workspace_id", currentWorkspace.id)
        .order("name", { ascending: true })
        .limit(5000);

      if (SOFT_DELETE_TABLES.includes(table)) {
        request = request.is("deleted_at", null);
      }

      // Registos arquivados não entram na navegação anterior/seguinte
      request = request.is("archived_at", null);

      const { data, error } = await request;
      if (error) {
        console.error(`[useEntityNavIds] ${table}:`, error.message);
        return [];
      }
      return ((data ?? []) as { id: string }[]).map((row) => row.id);
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });

  return query.data ?? [];
}

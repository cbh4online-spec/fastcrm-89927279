import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Gestão/secretaria com membership atual (mesmo gate do servidor: sj_import_is_manager). Só controla a interface. */
export function useSjRole() {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  return useQuery({
    queryKey: ["sj-import-is-manager", ws],
    enabled: !!ws,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("sj_import_is_manager", { _workspace_id: ws });
      if (error) return false;
      return data === true;
    },
  });
}

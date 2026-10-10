import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  checkProspectingIdentityBatch,
  type ProspectingIdentityBatchItem,
} from "@/lib/prospecting/identity";

export const PROSPECTING_IDENTITY_QUERY_KEY = "prospecting-identity-batch";

/**
 * Batched, cached CRM identity for a visible page of results. The workspace is
 * part of the key and of the RPC, so results never cross workspaces.
 */
export function useProspectingIdentityBatch(items: ProspectingIdentityBatchItem[]) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const signature = JSON.stringify(items);
  return useQuery({
    queryKey: [PROSPECTING_IDENTITY_QUERY_KEY, workspaceId, signature],
    queryFn: () => checkProspectingIdentityBatch(supabase, workspaceId!, items),
    enabled: !!workspaceId && items.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useCapability } from '@/hooks/useCapability';

export interface EventRegistryEntry {
  id: string;
  event_name: string;
  domain: string;
  entity_type: string;
  source_module: string;
  description: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
}

export function useEventRegistry(domain?: string) {
  const { currentWorkspace } = useWorkspace();
  const canRead = useCapability('workspace.manage');
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ['event-registry', workspaceId, domain],
    enabled: !!workspaceId && canRead,
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase.rpc('read_event_catalog', { p_workspace_id: workspaceId });
      if (error) throw error;
      return (data ?? []).filter(entry => !domain || entry.domain === domain) as EventRegistryEntry[];
    },
  });
}

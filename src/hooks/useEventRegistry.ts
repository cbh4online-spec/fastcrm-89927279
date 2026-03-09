import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventRegistryEntry {
  id: string;
  event_name: string;
  domain: string;
  entity_type: string;
  source_module: string;
  description: string | null;
  payload_schema_json: Record<string, unknown> | null;
  is_active: boolean;
  version: number;
  created_at: string;
}

export function useEventRegistry(domain?: string) {
  return useQuery({
    queryKey: ['event-registry', domain],
    queryFn: async () => {
      let query = supabase
        .from('event_registry')
        .select('*')
        .order('domain')
        .order('event_name');
      if (domain) query = query.eq('domain', domain);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EventRegistryEntry[];
    },
  });
}

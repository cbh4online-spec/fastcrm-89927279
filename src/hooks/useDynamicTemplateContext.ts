import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface DynamicTemplateContext {
  crmVariables: Record<string, string>;
  smartVariables: {
    urgency_level: 'low' | 'medium' | 'high';
    business_maturity: 'early' | 'growth' | 'scale';
    digital_readiness: 'low' | 'medium' | 'high';
    conversion_probability: number;
    recommended_tone: 'direct' | 'consultative' | 'strategic';
    days_since_last_contact: number;
  };
  allVariables: Record<string, string>;
}

export function useDynamicTemplateContext(leadId?: string, contactId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['dynamic-template-context', leadId, contactId, currentWorkspace?.id],
    queryFn: async (): Promise<DynamicTemplateContext> => {
      const { data, error } = await supabase.functions.invoke('generate-dynamic-template-context', {
        body: {
          leadId,
          contactId,
          workspaceId: currentWorkspace?.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to get context');
      
      return {
        crmVariables: data.crmVariables,
        smartVariables: data.smartVariables,
        allVariables: data.allVariables,
      };
    },
    enabled: !!(currentWorkspace?.id && (leadId || contactId)),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000,
  });
}

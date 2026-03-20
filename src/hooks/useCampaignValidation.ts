import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  suppressed: number;
}

export function useCampaignValidation(campaignId: string | undefined) {
  const [lastSummary, setLastSummary] = useState<ValidationSummary | null>(null);
  const queryClient = useQueryClient();

  const validate = useMutation({
    mutationFn: async (): Promise<ValidationSummary> => {
      if (!campaignId) throw new Error('No campaign ID');
      const { data, error } = await supabase.functions.invoke('email-validate-list', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.summary as ValidationSummary;
    },
    onSuccess: (summary) => {
      setLastSummary(summary);
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing_recipients', campaignId] });
    },
  });

  return { validate, lastSummary, isValidating: validate.isPending };
}

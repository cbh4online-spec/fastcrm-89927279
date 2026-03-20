import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCampaignSendQueue(campaignId: string | undefined) {
  const queueQuery = useQuery({
    queryKey: ['campaign-send-queue', campaignId],
    queryFn: async () => {
      if (!campaignId) return { pending: 0, sending: 0, sent: 0, failed: 0, total: 0 };
      
      const { data, error } = await supabase
        .from('campaign_send_queue')
        .select('status')
        .eq('campaign_id', campaignId);
      
      if (error) throw error;
      
      const items = data || [];
      const pending = items.filter(i => i.status === 'pending').length;
      const sending = items.filter(i => i.status === 'sending').length;
      const sent = items.filter(i => i.status === 'sent').length;
      const failed = items.filter(i => i.status === 'failed').length;
      const total = items.length;
      
      return { pending, sending, sent, failed, total };
    },
    enabled: !!campaignId,
    refetchInterval: 10000, // Poll every 10s
  });

  const data = queueQuery.data || { pending: 0, sending: 0, sent: 0, failed: 0, total: 0 };
  
  return {
    queueStatus: data,
    progressPercentage: data.total > 0 ? Math.round((data.sent / data.total) * 100) : 0,
    isLoading: queueQuery.isLoading,
  };
}

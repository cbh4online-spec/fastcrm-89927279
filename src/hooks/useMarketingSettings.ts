import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { MarketingSettings, MarketingUsage } from '@/types/marketing';

// Map DB to frontend type
function mapSettings(row: any): MarketingSettings {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    isEnabled: row.is_enabled ?? true,
    monthlyEmailLimit: row.monthly_email_limit || 1000,
    activeContactsLimit: row.active_contacts_limit || 500,
    activeCampaignsLimit: row.active_campaigns_limit || 5,
    defaultFromName: row.default_from_name,
    defaultReplyTo: row.default_reply_to,
    unsubscribePageUrl: row.unsubscribe_page_url,
    customFooter: row.custom_footer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useMarketingSettings() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-settings', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('marketing_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, create default
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('marketing_settings')
          .insert({
            workspace_id: currentWorkspace.id,
            is_enabled: true,
            monthly_email_limit: 1000,
            active_contacts_limit: 500,
            active_campaigns_limit: 5,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return mapSettings(newSettings);
      }

      return mapSettings(data);
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useUpdateMarketingSettings() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: Partial<{
      isEnabled: boolean;
      monthlyEmailLimit: number;
      activeContactsLimit: number;
      activeCampaignsLimit: number;
      defaultFromName: string;
      defaultReplyTo: string;
      unsubscribePageUrl: string;
      customFooter: string;
    }>) => {
      if (!currentWorkspace?.id) throw new Error('Workspace não encontrado');

      const updateData: any = {};
      
      if (data.isEnabled !== undefined) updateData.is_enabled = data.isEnabled;
      if (data.monthlyEmailLimit !== undefined) updateData.monthly_email_limit = data.monthlyEmailLimit;
      if (data.activeContactsLimit !== undefined) updateData.active_contacts_limit = data.activeContactsLimit;
      if (data.activeCampaignsLimit !== undefined) updateData.active_campaigns_limit = data.activeCampaignsLimit;
      if (data.defaultFromName !== undefined) updateData.default_from_name = data.defaultFromName;
      if (data.defaultReplyTo !== undefined) updateData.default_reply_to = data.defaultReplyTo;
      if (data.unsubscribePageUrl !== undefined) updateData.unsubscribe_page_url = data.unsubscribePageUrl;
      if (data.customFooter !== undefined) updateData.custom_footer = data.customFooter;

      const { data: result, error } = await supabase
        .from('marketing_settings')
        .update(updateData)
        .eq('workspace_id', currentWorkspace.id)
        .select()
        .single();

      if (error) throw error;
      return mapSettings(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-settings'] });
      toast.success('Definições atualizadas');
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Erro ao atualizar definições');
    },
  });
}

export function useMarketingUsage() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-usage', currentWorkspace?.id],
    queryFn: async (): Promise<MarketingUsage | null> => {
      if (!currentWorkspace?.id) return null;

      // Get current period usage
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('marketing_usage')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('period_start', periodStart)
        .maybeSingle();

      if (error) throw error;

      // Get settings for limits
      const { data: settings } = await supabase
        .from('marketing_settings')
        .select('monthly_email_limit, active_contacts_limit, active_campaigns_limit')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();

      // If no usage record, create one
      if (!data) {
        // Count current emails sent this period
        const { count: emailsSent } = await supabase
          .from('marketing_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', currentWorkspace.id)
          .gte('sent_at', periodStart)
          .lte('sent_at', periodEnd + 'T23:59:59Z');

        // Count active campaigns
        const { count: activeCampaigns } = await supabase
          .from('marketing_campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', currentWorkspace.id)
          .in('status', ['draft', 'scheduled', 'sending']);

        // Count subscribed contacts
        const { count: activeContacts } = await supabase
          .from('marketing_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', currentWorkspace.id)
          .eq('status', 'subscribed');

        return {
          id: 'computed',
          workspaceId: currentWorkspace.id,
          periodStart,
          periodEnd,
          emailsSent: emailsSent || 0,
          emailsLimit: settings?.monthly_email_limit || 1000,
          activeContacts: activeContacts || 0,
          contactsLimit: settings?.active_contacts_limit || 500,
          activeCampaigns: activeCampaigns || 0,
          campaignsLimit: settings?.active_campaigns_limit || 5,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
      }

      return {
        id: data.id,
        workspaceId: data.workspace_id,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        emailsSent: data.emails_sent || 0,
        emailsLimit: data.emails_limit || settings?.monthly_email_limit || 1000,
        activeContacts: data.active_contacts || 0,
        contactsLimit: data.contacts_limit || settings?.active_contacts_limit || 500,
        activeCampaigns: data.active_campaigns || 0,
        campaignsLimit: data.campaigns_limit || settings?.active_campaigns_limit || 5,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useMarketingSubscriptions() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-subscriptions', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('marketing_subscriptions')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { MarketingCampaign, CampaignStatus } from '@/types/marketing';
import { emitKernelEvent } from '@/lib/kernelEmitter';

// Map DB to frontend type
function mapCampaign(row: any): MarketingCampaign {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    subject: row.subject,
    previewText: row.preview_text,
    fromName: row.from_name,
    replyTo: row.reply_to,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    templateId: row.template_id,
    segmentId: row.segment_id,
    status: row.status as CampaignStatus,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    totalRecipients: row.total_recipients || 0,
    sentCount: row.sent_count || 0,
    deliveredCount: row.delivered_count || 0,
    openedCount: row.opened_count || 0,
    clickedCount: row.clicked_count || 0,
    bouncedCount: row.bounced_count || 0,
    complainedCount: row.complained_count || 0,
    unsubscribedCount: row.unsubscribed_count || 0,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // AI Insights
    aiInsights: row.ai_insights,
    aiInsightsGeneratedAt: row.ai_insights_generated_at,
    sendHour: row.send_hour,
    linkCount: row.link_count,
  };
}

export function useMarketingCampaigns(filters?: { status?: CampaignStatus }) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-campaigns', currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapCampaign);
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useMarketingCampaign(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-campaign', id],
    queryFn: async () => {
      if (!id || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return mapCampaign(data);
    },
    enabled: !!id && !!currentWorkspace?.id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      subject: string;
      previewText?: string;
      fromName: string;
      replyTo?: string;
      bodyHtml: string;
      bodyText?: string;
      templateId?: string;
      segmentId?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !currentWorkspace?.id) {
        throw new Error('Não autenticado');
      }

      const { data: result, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          workspace_id: currentWorkspace.id,
          name: data.name,
          subject: data.subject,
          preview_text: data.previewText,
          from_name: data.fromName,
          reply_to: data.replyTo,
          body_html: data.bodyHtml,
          body_text: data.bodyText,
          template_id: data.templateId,
          segment_id: data.segmentId,
          created_by: user.user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return mapCampaign(result);
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campanha criada com sucesso');
      console.log('[EMAIL-MKT] CREATED', { campaign_id: campaign.id, name: campaign.name });
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CAMPAIGN.CREATED',
          entity_kind: 'marketing_campaign',
          entity_id: campaign.id,
          source_module: 'mkt-email-marketing',
          payload: { campaign_id: campaign.id, name: campaign.name, segment_id: campaign.segmentId },
        });
      }
    },
    onError: (error) => {
      console.warn('[EMAIL-MKT] CREATE_FAILED', { error: (error as Error).message });
      toast.error('Erro ao criar campanha');
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      subject?: string;
      previewText?: string;
      fromName?: string;
      replyTo?: string;
      bodyHtml?: string;
      bodyText?: string;
      templateId?: string;
      segmentId?: string;
      status?: CampaignStatus;
      scheduledAt?: string;
    }) => {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.subject !== undefined) updateData.subject = data.subject;
      if (data.previewText !== undefined) updateData.preview_text = data.previewText;
      if (data.fromName !== undefined) updateData.from_name = data.fromName;
      if (data.replyTo !== undefined) updateData.reply_to = data.replyTo;
      if (data.bodyHtml !== undefined) updateData.body_html = data.bodyHtml;
      if (data.bodyText !== undefined) updateData.body_text = data.bodyText;
      if (data.templateId !== undefined) updateData.template_id = data.templateId;
      if (data.segmentId !== undefined) updateData.segment_id = data.segmentId;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.scheduledAt !== undefined) updateData.scheduled_at = data.scheduledAt;

      const { data: result, error } = await supabase
        .from('marketing_campaigns')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapCampaign(result);
    },
    onSuccess: (campaign, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-campaign', variables.id] });
      toast.success('Campanha atualizada');
      const changedFields = Object.keys(variables).filter(k => k !== 'id');
      console.log('[EMAIL-MKT] UPDATED', { campaign_id: variables.id, changed_fields: changedFields });
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CAMPAIGN.UPDATED',
          entity_kind: 'marketing_campaign',
          entity_id: variables.id,
          source_module: 'mkt-email-marketing',
          payload: { campaign_id: variables.id, changed_fields: changedFields },
        });
      }
    },
    onError: (error) => {
      console.warn('[EMAIL-MKT] UPDATE_FAILED', { error: (error as Error).message });
      toast.error('Erro ao atualizar campanha');
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campanha eliminada');
      console.log('[EMAIL-MKT] DELETED', { campaign_id: id });
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CAMPAIGN.DELETED',
          entity_kind: 'marketing_campaign',
          entity_id: id,
          source_module: 'mkt-email-marketing',
          payload: { campaign_id: id },
        });
      }
    },
    onError: (error) => {
      console.warn('[EMAIL-MKT] DELETE_FAILED', { error: (error as Error).message });
      toast.error('Erro ao eliminar campanha');
    },
  });
}

export function useSendCampaign() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-send-campaign', {
        body: { campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-campaign', campaignId] });
      toast.success('Campanha iniciada com sucesso');
      console.log('[EMAIL-MKT] LAUNCHED', { campaign_id: campaignId });
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CAMPAIGN.LAUNCHED',
          entity_kind: 'marketing_campaign',
          entity_id: campaignId,
          source_module: 'mkt-email-marketing',
          payload: { campaign_id: campaignId },
        });
      }
    },
    onError: (error: any) => {
      console.warn('[EMAIL-MKT] LAUNCH_FAILED', { error: error.message });
      toast.error(error.message || 'Erro ao enviar campanha');
    },
  });
}

export function useCampaignRecipients(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['marketing-recipients', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('marketing_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });
}

export function useCampaignEvents(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['marketing-events', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('marketing_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('occurred_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });
}

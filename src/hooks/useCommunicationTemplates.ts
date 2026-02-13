import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CommunicationTemplate, 
  TemplateChannel, 
  JourneyContext,
  TemplateTone,
  TemplateStructure
} from '@/types/communicationTemplate';
import { toast } from 'sonner';

// Fetch all templates
export function useCommunicationTemplates(filters?: {
  channel?: TemplateChannel;
  journeyContext?: JourneyContext;
  isActive?: boolean;
}) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['communication-templates', currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from('communication_templates')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('usage_count', { ascending: false });

      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.journeyContext) {
        query = query.contains('journey_contexts', [filters.journeyContext]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(t => ({
        id: t.id,
        workspaceId: t.workspace_id,
        name: t.name,
        channel: t.channel as TemplateChannel,
        language: t.language,
        journeyContexts: t.journey_contexts as JourneyContext[],
        subject: t.subject,
        body: t.body,
        bodyHtml: t.body_html,
        tone: t.tone as TemplateTone,
        structureType: (t as any).structure_type || 'custom',
        cta: (t as any).cta || undefined,
        isActive: t.is_active,
        usageCount: t.usage_count,
        conversionCount: (t as any).conversion_count || 0,
        responseRate: t.response_rate,
        isDynamic: (t as any).is_dynamic || false,
        dynamicRules: (t as any).dynamic_rules || {},
        dynamicSchema: (t as any).dynamic_schema || {},
        allowedChannels: (t as any).allowed_channels || [],
        defaultTone: (t as any).default_tone || 'consultative',
        status: (t as any).status || 'active',
        personalizationLevel: (t as any).personalization_level || 'basic',
        structureFamilies: (t as any).structure_families || ['AIDA'],
        brandConstraints: (t as any).brand_constraints || {},
        maxLengthByChannel: (t as any).max_length_by_channel || { whatsapp: 350, email: 1600, sms: 160, inbox: 800 },
        createdBy: t.created_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })) as CommunicationTemplate[];
    },
    enabled: !!currentWorkspace?.id
  });
}

// Fetch single template
export function useCommunicationTemplate(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['communication-template', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        workspaceId: data.workspace_id,
        name: data.name,
        channel: data.channel as TemplateChannel,
        language: data.language,
        journeyContexts: data.journey_contexts as JourneyContext[],
        subject: data.subject,
        body: data.body,
        bodyHtml: data.body_html,
        tone: data.tone as TemplateTone,
        structureType: (data as any).structure_type || 'custom',
        cta: (data as any).cta || undefined,
        isActive: data.is_active,
        usageCount: data.usage_count,
        conversionCount: (data as any).conversion_count || 0,
        responseRate: data.response_rate,
        isDynamic: (data as any).is_dynamic || false,
        dynamicRules: (data as any).dynamic_rules || {},
        personalizationLevel: (data as any).personalization_level || 'basic',
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      } as CommunicationTemplate;
    },
    enabled: !!id && !!currentWorkspace?.id
  });
}

// Create template
export function useCreateCommunicationTemplate() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: Omit<CommunicationTemplate, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'usageCount' | 'responseRate'>) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('communication_templates')
        .insert({
          workspace_id: currentWorkspace.id,
          name: template.name,
          channel: template.channel,
          language: template.language,
          journey_contexts: template.journeyContexts,
          subject: template.subject,
          body: template.body,
          body_html: template.bodyHtml,
          tone: template.tone,
          is_active: template.isActive,
          created_by: user.id,
          structure_type: template.structureType || 'custom',
          cta: template.cta || null,
          is_dynamic: template.isDynamic || false,
          dynamic_rules: template.dynamicRules || {},
          personalization_level: template.personalizationLevel || 'basic',
          structure_families: template.structureFamilies || ['AIDA'],
          brand_constraints: template.brandConstraints || {},
          max_length_by_channel: template.maxLengthByChannel || { whatsapp: 350, email: 1600, sms: 160, inbox: 800 },
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar template');
      console.error(error);
    }
  });
}

// Update template
export function useUpdateCommunicationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CommunicationTemplate> & { id: string }) => {
      const updateData: Record<string, unknown> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.channel !== undefined) updateData.channel = updates.channel;
      if (updates.language !== undefined) updateData.language = updates.language;
      if (updates.journeyContexts !== undefined) updateData.journey_contexts = updates.journeyContexts;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.body !== undefined) updateData.body = updates.body;
      if (updates.bodyHtml !== undefined) updateData.body_html = updates.bodyHtml;
      if (updates.tone !== undefined) updateData.tone = updates.tone;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.structureType !== undefined) updateData.structure_type = updates.structureType;
      if (updates.cta !== undefined) updateData.cta = updates.cta;
      if (updates.isDynamic !== undefined) updateData.is_dynamic = updates.isDynamic;
      if (updates.dynamicRules !== undefined) updateData.dynamic_rules = updates.dynamicRules;
      if (updates.personalizationLevel !== undefined) updateData.personalization_level = updates.personalizationLevel;
      if (updates.structureFamilies !== undefined) updateData.structure_families = updates.structureFamilies;
      if (updates.brandConstraints !== undefined) updateData.brand_constraints = updates.brandConstraints;
      if (updates.maxLengthByChannel !== undefined) updateData.max_length_by_channel = updates.maxLengthByChannel;

      const { data, error } = await supabase
        .from('communication_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success('Template atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar template');
      console.error(error);
    }
  });
}

// Delete template
export function useDeleteCommunicationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('communication_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success('Template eliminado');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar template');
      console.error(error);
    }
  });
}

// Log template usage
export function useLogTemplateUsage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usage: {
      templateId: string;
      entityType: 'contact' | 'company' | 'lead';
      entityId: string;
      channel: TemplateChannel;
      automationId?: string;
    }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('template_usage_logs')
        .insert({
          workspace_id: currentWorkspace.id,
          template_id: usage.templateId,
          entity_type: usage.entityType,
          entity_id: usage.entityId,
          channel: usage.channel,
          used_by: user.id,
          automation_id: usage.automationId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
    }
  });
}

// Get template usage stats
export function useTemplateUsageStats(templateId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['template-usage-stats', templateId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      let query = supabase
        .from('template_usage_logs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalUsage = data?.length || 0;
      const responsesReceived = data?.filter(d => d.response_received).length || 0;
      const conversions = data?.filter(d => d.converted).length || 0;

      return {
        totalUsage,
        responsesReceived,
        responseRate: totalUsage > 0 ? (responsesReceived / totalUsage) * 100 : 0,
        conversions,
        conversionRate: totalUsage > 0 ? (conversions / totalUsage) * 100 : 0
      };
    },
    enabled: !!currentWorkspace?.id
  });
}

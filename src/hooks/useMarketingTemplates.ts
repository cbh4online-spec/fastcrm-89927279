import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { MarketingTemplate } from '@/types/marketing';

// Map DB to frontend type
function mapTemplate(row: any): MarketingTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    thumbnailUrl: row.thumbnail_url,
    category: row.category || 'general',
    isSystem: row.is_system ?? false,
    isActive: row.is_active ?? true,
    usageCount: row.usage_count || 0,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useMarketingTemplates() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-templates', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapTemplate);
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useMarketingTemplate(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-template', id],
    queryFn: async () => {
      if (!id || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return mapTemplate(data);
    },
    enabled: !!id && !!currentWorkspace?.id,
  });
}

export function useCreateMarketingTemplate() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      subject?: string;
      bodyHtml: string;
      bodyText?: string;
      category?: string;
      isActive?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !currentWorkspace?.id) {
        throw new Error('Não autenticado');
      }

      const { data: result, error } = await supabase
        .from('marketing_templates')
        .insert({
          workspace_id: currentWorkspace.id,
          name: data.name,
          description: data.description,
          subject: data.subject,
          body_html: data.bodyHtml,
          body_text: data.bodyText,
          category: data.category || 'general',
          is_active: data.isActive ?? true,
          is_system: false,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return mapTemplate(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Erro ao criar template');
    },
  });
}

export function useUpdateMarketingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      category?: string;
      isActive?: boolean;
    }) => {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.subject !== undefined) updateData.subject = data.subject;
      if (data.bodyHtml !== undefined) updateData.body_html = data.bodyHtml;
      if (data.bodyText !== undefined) updateData.body_text = data.bodyText;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { data: result, error } = await supabase
        .from('marketing_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapTemplate(result);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-template', variables.id] });
      toast.success('Template atualizado');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
    },
  });
}

export function useDeleteMarketingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      toast.success('Template eliminado');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Erro ao eliminar template');
    },
  });
}

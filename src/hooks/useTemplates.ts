import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TemplateType = 'email' | 'whatsapp' | 'instagram_dm' | 'proposal' | 'sms';
export type TemplateGoal = 'qualification' | 'follow_up' | 'booking' | 'closing' | 'support' | 'other';
export type TemplateTone = 'formal' | 'direct' | 'friendly' | 'casual';

export interface Template {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  type: TemplateType;
  goal: TemplateGoal;
  tone: TemplateTone;
  language: string;
  content: string;
  rich_content: any | null;
  subject: string | null;
  tags: string[];
  compatible_modules: string[];
  required_variables: string[];
  is_active: boolean;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
  reply_rate: number | null;
  click_rate: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateFolder {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  parent_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  content: string;
  rich_content: any | null;
  subject: string | null;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TemplateFilters {
  search?: string;
  type?: TemplateType | 'all';
  goal?: TemplateGoal | 'all';
  folderId?: string | null;
  tags?: string[];
  isActive?: boolean;
  isFavorite?: boolean;
}

export function useTemplates(filters: TemplateFilters = {}) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['templates', currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = supabase
        .from('templates' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.goal && filters.goal !== 'all') {
        query = query.eq('goal', filters.goal);
      }
      if (filters.folderId !== undefined) {
        if (filters.folderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', filters.folderId);
        }
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters.isFavorite !== undefined) {
        query = query.eq('is_favorite', filters.isFavorite);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Template[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useTemplateFolders() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['template-folders', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from('template_folders' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('position');

      if (error) throw error;
      return data as unknown as TemplateFolder[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useTemplateVersions(templateId: string | null) {
  return useQuery({
    queryKey: ['template-versions', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('template_versions' as any)
        .select('*')
        .eq('template_id', templateId)
        .order('version', { ascending: false });

      if (error) throw error;
      return data as unknown as TemplateVersion[];
    },
    enabled: !!templateId,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: Partial<Template>) => {
      if (!currentWorkspace || !user) throw new Error('No workspace');

      const { data, error } = await supabase
        .from('templates' as any)
        .insert({
          ...template,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Create initial version
      await supabase.from('template_versions' as any).insert({
        template_id: (data as any).id,
        version: 1,
        content: template.content || '',
        rich_content: template.rich_content,
        subject: template.subject,
        change_summary: 'Versão inicial',
        created_by: user.id,
      } as any);

      return data as unknown as Template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar template: ${err.message}`);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, createVersion, ...updates }: Partial<Template> & { id: string; createVersion?: boolean }) => {
      const { data: current } = await supabase
        .from('templates' as any)
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('templates' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create new version if content changed
      if (createVersion && current && (updates.content !== (current as any).content || updates.rich_content !== (current as any).rich_content)) {
        const { data: versions } = await supabase
          .from('template_versions' as any)
          .select('version')
          .eq('template_id', id)
          .order('version', { ascending: false })
          .limit(1);

        const nextVersion = ((versions as any)?.[0]?.version || 0) + 1;

        await supabase.from('template_versions' as any).insert({
          template_id: id,
          version: nextVersion,
          content: updates.content || (current as any).content,
          rich_content: updates.rich_content || (current as any).rich_content,
          subject: updates.subject || (current as any).subject,
          change_summary: `Versão ${nextVersion}`,
          created_by: user?.id,
        } as any);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-versions'] });
      toast.success('Template atualizado');
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('templates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template eliminado');
    },
    onError: (err: any) => {
      toast.error(`Erro ao eliminar: ${err.message}`);
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (folder: Partial<TemplateFolder>) => {
      if (!currentWorkspace) throw new Error('No workspace');

      const { data, error } = await supabase
        .from('template_folders' as any)
        .insert({
          ...folder,
          workspace_id: currentWorkspace.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-folders'] });
      toast.success('Pasta criada');
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar pasta: ${err.message}`);
    },
  });
}

export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: current } = await supabase
        .from('templates' as any)
        .select('usage_count')
        .eq('id', templateId)
        .single();

      const { error } = await supabase
        .from('templates' as any)
        .update({
          usage_count: ((current as any)?.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        } as any)
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

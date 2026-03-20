import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface ReengagementPreview {
  email: string;
  subject: string;
  preview_text: string;
  contact_name?: string;
}

export function useReengagementAI() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [inactiveThreshold, setInactiveThreshold] = useState(60);
  const [previewSubjects, setPreviewSubjects] = useState<ReengagementPreview[]>([]);

  const { data: inactiveCount = 0 } = useQuery({
    queryKey: ['inactive-contacts-count', currentWorkspace?.id, inactiveThreshold],
    queryFn: async () => {
      if (!currentWorkspace?.id) return 0;
      const cutoff = new Date(
        Date.now() - inactiveThreshold * 24 * 60 * 60 * 1000
      ).toISOString();
      const { count } = await supabase
        .from('marketing_recipients')
        .select('contact_id', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .or(`opened_at.is.null,opened_at.lt.${cutoff}`)
        .not('contact_id', 'is', null);
      return count ?? 0;
    },
    enabled: !!currentWorkspace?.id,
  });

  const generatePreview = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('email-reengagement-ai', {
        body: {
          workspace_id: currentWorkspace.id,
          inactive_days: inactiveThreshold,
          preview_only: true,
        },
      });
      if (error) throw error;
      return data as {
        contacts_found: number;
        preview_subjects: ReengagementPreview[];
      };
    },
    onSuccess: (data) => {
      setPreviewSubjects(data.preview_subjects || []);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao gerar pré-visualização'),
  });

  const generateCampaign = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('email-reengagement-ai', {
        body: {
          workspace_id: currentWorkspace.id,
          inactive_days: inactiveThreshold,
          preview_only: false,
        },
      });
      if (error) throw error;
      return data as {
        contacts_found: number;
        campaign_id: string;
        preview_subjects: ReengagementPreview[];
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campanha de re-engajamento criada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao gerar campanha de re-engajamento'),
  });

  return {
    inactiveThreshold,
    setInactiveThreshold,
    inactiveCount,
    previewSubjects,
    generatePreview,
    generateReengagementCampaign: generateCampaign,
    isGenerating: generateCampaign.isPending,
  };
}

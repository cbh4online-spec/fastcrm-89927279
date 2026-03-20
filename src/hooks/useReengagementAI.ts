import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export function useReengagementAI() {
  const { currentWorkspace } = useWorkspace();
  const [inactiveThreshold, setInactiveThreshold] = useState(60);

  const generateCampaign = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('email-reengagement-ai', {
        body: {
          workspace_id: currentWorkspace.id,
          inactive_days_threshold: inactiveThreshold,
        },
      });
      if (error) throw error;
      return data as {
        contacts_found: number;
        inactive_days: number;
        preview_subjects: Array<{ contact_name: string; subject: string; preview_text: string }>;
        contact_ids: string[];
      };
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao gerar campanha de re-engajamento'),
  });

  return {
    inactiveThreshold,
    setInactiveThreshold,
    generateReengagementCampaign: generateCampaign,
    isGenerating: generateCampaign.isPending,
    previewSubjects: generateCampaign.data?.preview_subjects || [],
    inactiveCount: generateCampaign.data?.contacts_found || 0,
  };
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface LinkedInData {
  id: string;
  company_id: string;
  workspace_id: string;
  linkedin_url: string | null;
  description: string | null;
  tagline: string | null;
  headquarters: string | null;
  founded_year: number | null;
  company_size_range: string | null;
  linkedin_industry: string | null;
  linkedin_type: string | null;
  specialties: string[] | null;
  linkedin_website: string | null;
  employee_count_linkedin: number | null;
  employees_on_linkedin: number | null;
  key_people: Array<{ name: string; title: string; linkedin_url?: string }> | null;
  recent_posts: Array<{ content: string; date?: string; likes?: number; comments?: number }> | null;
  avg_likes_per_post: number | null;
  avg_comments_per_post: number | null;
  posting_frequency: string | null;
  last_post_date: string | null;
  engagement_score: number | null;
  analyzed_at: string;
  analyzed_by: string | null;
  analysis_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Transform raw database JSON fields to typed data
function transformLinkedInData(raw: Record<string, unknown>): LinkedInData {
  return {
    ...raw,
    key_people: raw.key_people as LinkedInData['key_people'],
    recent_posts: raw.recent_posts as LinkedInData['recent_posts'],
    specialties: raw.specialties as string[] | null,
  } as LinkedInData;
}

export function useLinkedInData(companyId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['linkedin-data', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('company_linkedin_data')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data ? transformLinkedInData(data as Record<string, unknown>) : null;
    },
    enabled: !!companyId,
  });
}

export function useAnalyzeLinkedIn() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ companyId, linkedinUrl }: { companyId: string; linkedinUrl: string }) => {
      if (!currentWorkspace?.id) {
        throw new Error('Workspace não encontrado');
      }

      const { data, error } = await supabase.functions.invoke('analyze-linkedin', {
        body: {
          companyId,
          linkedinUrl,
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao analisar LinkedIn');

      return transformLinkedInData(data.data as Record<string, unknown>);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-data', variables.companyId] });
      toast.success('LinkedIn analisado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao analisar: ${error.message}`);
    },
  });
}

export function useBulkAnalyzeLinkedIn() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const mutation = useMutation({
    mutationFn: async (companies: Array<{ id: string; linkedin_url: string }>) => {
      if (!currentWorkspace?.id) {
        throw new Error('Workspace não encontrado');
      }

      const results: Array<{ companyId: string; success: boolean; error?: string }> = [];
      setProgress({ current: 0, total: companies.length });

      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        setProgress({ current: i + 1, total: companies.length });

        try {
          const { data, error } = await supabase.functions.invoke('analyze-linkedin', {
            body: {
              companyId: company.id,
              linkedinUrl: company.linkedin_url,
              workspaceId: currentWorkspace.id,
            },
          });

          if (error || !data.success) {
            results.push({
              companyId: company.id,
              success: false,
              error: error?.message || data.error,
            });
          } else {
            results.push({ companyId: company.id, success: true });
          }
        } catch (err) {
          results.push({
            companyId: company.id,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }

        // Small delay to avoid rate limiting
        if (i < companies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      queryClient.invalidateQueries({ queryKey: ['linkedin-data'] });
      queryClient.invalidateQueries({ queryKey: ['smart-companies'] });
      
      if (failed === 0) {
        toast.success(`${successful} empresa(s) analisada(s) com sucesso!`);
      } else {
        toast.warning(`${successful} sucesso, ${failed} falha(s)`);
      }
    },
  });

  return {
    ...mutation,
    progress,
  };
}

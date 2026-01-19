import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface LinkedInAnalysisData {
  id: string;
  linkedin_url: string | null;
  description: string | null;
  tagline: string | null;
  headline: string | null;
  linkedin_industry: string | null;
  company_size_range: string | null;
  headquarters: string | null;
  founded_year: number | null;
  employee_count_linkedin: number | null;
  employees_on_linkedin: number | null;
  key_people: Array<{ name: string; title: string; linkedin_url?: string }>;
  recent_posts: Array<{ content: string; likes?: number; comments?: number }>;
  posting_frequency: string | null;
  avg_likes_per_post: number | null;
  avg_comments_per_post: number | null;
  engagement_score: number | null;
  specialties: string[] | null;
  analysis_status: string | null;
  analyzed_at: string | null;
}

type EntityType = 'contact' | 'lead';

const tableMap: Record<EntityType, string> = {
  contact: 'contact_linkedin_data',
  lead: 'lead_linkedin_data',
};

const idFieldMap: Record<EntityType, string> = {
  contact: 'contact_id',
  lead: 'lead_id',
};

// Hook to get persisted LinkedIn analysis data
export function useEntityLinkedInData(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ['entity-linkedin-data', entityType, entityId],
    queryFn: async (): Promise<LinkedInAnalysisData | null> => {
      if (!entityId) return null;

      let data: any = null;
      let error: any = null;

      if (entityType === 'contact') {
        const result = await supabase
          .from('contact_linkedin_data')
          .select('*')
          .eq('contact_id', entityId)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('lead_linkedin_data')
          .select('*')
          .eq('lead_id', entityId)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      
      if (!data || data.analysis_status !== 'completed') {
        return null;
      }

      return {
        id: data.id,
        linkedin_url: data.linkedin_url,
        description: data.description,
        tagline: data.tagline,
        headline: data.headline,
        linkedin_industry: data.linkedin_industry,
        company_size_range: data.company_size_range,
        headquarters: data.headquarters,
        founded_year: data.founded_year,
        employee_count_linkedin: data.employee_count_linkedin,
        employees_on_linkedin: data.employees_on_linkedin,
        key_people: (data.key_people as any) || [],
        recent_posts: (data.recent_posts as any) || [],
        posting_frequency: data.posting_frequency,
        avg_likes_per_post: data.avg_likes_per_post,
        avg_comments_per_post: data.avg_comments_per_post,
        engagement_score: data.engagement_score,
        specialties: data.specialties,
        analysis_status: data.analysis_status,
        analyzed_at: data.analyzed_at,
      };
    },
    enabled: !!entityId,
  });
}

// Hook to analyze LinkedIn for a contact or lead
export function useAnalyzeEntityLinkedIn(entityType: EntityType) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { entityId: string; entityName: string; linkedinUrl: string }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const { data, error } = await supabase.functions.invoke('analyze-entity-linkedin', {
        body: {
          entityType,
          entityId: input.entityId,
          entityName: input.entityName,
          linkedinUrl: input.linkedinUrl,
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Analysis failed');

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entity-linkedin-data', entityType, variables.entityId] });
      toast.success('Análise LinkedIn concluída e guardada');
    },
    onError: (error) => {
      console.error('LinkedIn analysis error:', error);
      toast.error(error.message || 'Erro ao analisar LinkedIn');
    },
  });
}

// Hook for bulk analysis
export function useBulkAnalyzeEntityLinkedIn(entityType: EntityType) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (entities: Array<{ id: string; name: string; linkedin_url?: string | null }>) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const results: Array<{ entityId: string; success: boolean; error?: string }> = [];

      for (const entity of entities) {
        if (!entity.linkedin_url) {
          results.push({ entityId: entity.id, success: false, error: 'Sem URL LinkedIn' });
          continue;
        }

        try {
          const { data, error } = await supabase.functions.invoke('analyze-entity-linkedin', {
            body: {
              entityType,
              entityId: entity.id,
              entityName: entity.name,
              linkedinUrl: entity.linkedin_url,
              workspaceId: currentWorkspace.id,
            },
          });

          if (error || !data.success) {
            results.push({ entityId: entity.id, success: false, error: error?.message || data.error });
          } else {
            results.push({ entityId: entity.id, success: true });
          }
        } catch (err) {
          results.push({ entityId: entity.id, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      queryClient.invalidateQueries({ queryKey: ['entity-linkedin-data', entityType] });

      if (failed === 0) {
        toast.success(`${successful} ${entityType === 'contact' ? 'contacto(s)' : 'lead(s)'} analisado(s) com sucesso!`);
      } else {
        toast.warning(`${successful} sucesso, ${failed} falha(s)`);
      }
    },
  });
}

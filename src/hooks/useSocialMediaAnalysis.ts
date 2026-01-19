import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface SocialMediaAnalysis {
  digitalMaturity: "low" | "medium" | "high";
  digitalMaturityReason: string;
  linkedinData?: {
    followers: number | null;
    employeeCount: number | null;
    recentActivity: string[];
    keyPeople: Array<{ name: string; role: string; profileUrl?: string }>;
    industries: string[];
    specialties: string[];
    description: string | null;
  };
  instagramData?: {
    followers: number | null;
    postsCount: number | null;
    contentType: string;
    recentActivity: string[];
  };
  facebookData?: {
    followers: number | null;
    rating: number | null;
    reviewsCount: number | null;
    recentActivity: string[];
  };
  salesInsights: {
    preferredChannel: "linkedin" | "email" | "phone" | "instagram";
    approachStrategy: string;
    keyDecisionMakers: Array<{ name: string; role: string; linkedinUrl?: string }>;
    engagementOpportunities: string[];
    bestTimeToContact?: string;
  };
  warnings: string[];
  analyzedAt?: string;
}

interface AnalyzeSocialMediaInput {
  companyId: string;
  companyName: string;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}

interface PersistedAnalysis {
  id: string;
  company_id: string;
  analysis_data: SocialMediaAnalysis;
  analyzed_at: string;
  analysis_status: string;
}

// Hook to get persisted social media analysis
export function useSocialMediaData(companyId: string | undefined) {
  return useQuery({
    queryKey: ['social-media-data', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('company_linkedin_data')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data || data.analysis_status !== 'completed') {
        return null;
      }

      // Transform stored data back to SocialMediaAnalysis format
      const analysis: SocialMediaAnalysis = {
        digitalMaturity: determineDigitalMaturity(data),
        digitalMaturityReason: data.description || "Análise baseada em dados do LinkedIn.",
        linkedinData: {
          followers: null,
          employeeCount: data.employee_count_linkedin,
          recentActivity: (data.recent_posts as any[])?.map(p => p.content).slice(0, 3) || [],
          keyPeople: (data.key_people as any[]) || [],
          industries: data.linkedin_industry ? [data.linkedin_industry] : [],
          specialties: data.specialties || [],
          description: data.description,
        },
        salesInsights: {
          preferredChannel: "linkedin",
          approachStrategy: `Empresa ${data.company_size_range ? `com ${data.company_size_range} funcionários` : ''} ${data.linkedin_industry ? `no setor ${data.linkedin_industry}` : ''}. ${data.headquarters ? `Sede em ${data.headquarters}.` : ''}`,
          keyDecisionMakers: (data.key_people as any[])?.slice(0, 5).map(p => ({
            name: p.name,
            role: p.title,
            linkedinUrl: p.linkedin_url,
          })) || [],
          engagementOpportunities: generateEngagementOpportunities(data),
          bestTimeToContact: "Horário comercial",
        },
        warnings: [],
        analyzedAt: data.analyzed_at,
      };

      return {
        ...data,
        parsedAnalysis: analysis,
      };
    },
    enabled: !!companyId,
  });
}

function determineDigitalMaturity(data: any): "low" | "medium" | "high" {
  let score = 0;
  
  if (data.employees_on_linkedin > 10) score += 2;
  else if (data.employees_on_linkedin > 0) score += 1;
  
  if (data.recent_posts?.length > 2) score += 2;
  else if (data.recent_posts?.length > 0) score += 1;
  
  if (data.engagement_score > 50) score += 2;
  else if (data.engagement_score > 20) score += 1;
  
  if (data.description && data.description.length > 100) score += 1;
  if (data.specialties?.length > 0) score += 1;

  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function generateEngagementOpportunities(data: any): string[] {
  const opportunities: string[] = [];
  
  if (data.recent_posts?.length > 0) {
    opportunities.push("Interagir com publicações recentes no LinkedIn");
  }
  
  if (data.key_people?.length > 0) {
    opportunities.push("Conectar com decisores identificados");
  }
  
  if (data.specialties?.length > 0) {
    opportunities.push(`Alinhar proposta com especialidades: ${data.specialties.slice(0, 2).join(', ')}`);
  }
  
  if (data.linkedin_industry) {
    opportunities.push(`Personalizar abordagem para o setor ${data.linkedin_industry}`);
  }
  
  return opportunities;
}

export function useSocialMediaAnalysis() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: AnalyzeSocialMediaInput): Promise<SocialMediaAnalysis> => {
      const { data, error } = await supabase.functions.invoke("social-media-analysis", {
        body: {
          ...input,
          workspaceId: currentWorkspace?.id,
          persistData: true, // Flag to tell edge function to persist
        },
      });

      if (error) {
        console.error("Social media analysis error:", error);
        throw new Error(error.message || "Erro ao analisar redes sociais");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao analisar redes sociais");
      }

      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['social-media-data', variables.companyId] });
      toast.success("Análise de redes sociais concluída e guardada");
    },
    onError: (error) => {
      console.error("Social media analysis failed:", error);
      toast.error(error.message || "Não foi possível analisar as redes sociais");
    },
  });
}

// Bulk analysis hook
export function useBulkSocialMediaAnalysis() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (companies: Array<{ id: string; name: string; linkedin_url?: string | null }>) => {
      const results: Array<{ companyId: string; success: boolean; error?: string }> = [];
      
      for (const company of companies) {
        if (!company.linkedin_url) {
          results.push({ companyId: company.id, success: false, error: 'Sem URL LinkedIn' });
          continue;
        }

        try {
          const { data, error } = await supabase.functions.invoke("social-media-analysis", {
            body: {
              companyId: company.id,
              companyName: company.name,
              linkedinUrl: company.linkedin_url,
              workspaceId: currentWorkspace?.id,
              persistData: true,
            },
          });

          if (error || !data.success) {
            results.push({ companyId: company.id, success: false, error: error?.message || data.error });
          } else {
            results.push({ companyId: company.id, success: true });
          }
        } catch (err) {
          results.push({ companyId: company.id, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      queryClient.invalidateQueries({ queryKey: ['social-media-data'] });
      queryClient.invalidateQueries({ queryKey: ['smart-companies'] });
      
      if (failed === 0) {
        toast.success(`${successful} empresa(s) analisada(s) com sucesso!`);
      } else {
        toast.warning(`${successful} sucesso, ${failed} falha(s)`);
      }
    },
  });
}

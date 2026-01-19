import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for the complete social analysis
export interface SuggestedContact {
  name: string;
  role: string;
  linkedinUrl?: string;
}

export interface DataSuggestion {
  field: string;
  currentValue: string | null;
  suggestedValue: string;
  source: string;
}

export interface SalesOpportunity {
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  service: string;
}

export interface LinkedInAnalysis {
  url?: string;
  description: string | null;
  industry: string | null;
  size: string | null;
  headquarters: string | null;
  website: string | null;
  founded: number | null;
  employeeCount: number | null;
  followersCount: number | null;
  specialties: string[];
  keyPeople: SuggestedContact[];
  recentPosts: Array<{
    preview: string;
    likes: number;
    comments: number;
    relativeDate: string | null;
  }>;
  postsPerMonth: number | null;
  lastPostDate: string | null;
  activityLevel: 'unknown' | 'low' | 'medium' | 'high';
  engagementScore: number | null;
}

export interface FacebookAnalysis {
  url?: string;
  followersCount: number | null;
  likesCount: number | null;
  rating: number | null;
  reviewsCount: number | null;
  aboutText: string | null;
  pageCategory: string | null;
  activityLevel: 'unknown' | 'low' | 'medium' | 'high';
  hasRecentPosts: boolean;
}

export interface InstagramAnalysis {
  url?: string;
  followersCount: number | null;
  followingCount: number | null;
  postsCount: number | null;
  bio: string | null;
  activityLevel: 'unknown' | 'low' | 'medium' | 'high';
  contentType: 'product' | 'corporate' | 'lifestyle' | null;
  engagementRate: number | null;
}

export interface DigitalMaturity {
  score: number;
  level: 'low' | 'medium' | 'high';
  reason: string;
}

export interface CompleteSocialAnalysis {
  linkedin: LinkedInAnalysis | null;
  facebook: FacebookAnalysis | null;
  instagram: InstagramAnalysis | null;
  digitalMaturity: DigitalMaturity;
  dataSuggestions: DataSuggestion[];
  salesOpportunities: SalesOpportunity[];
  suggestedContacts: SuggestedContact[];
  analyzedAt: string;
}

// Hook to fetch all social data for a company
export function useCompleteSocialData(companyId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['complete-social-data', companyId],
    queryFn: async (): Promise<CompleteSocialAnalysis | null> => {
      if (!companyId || !currentWorkspace?.id) return null;

      // Fetch all three tables in parallel
      const [linkedinResult, facebookResult, instagramResult] = await Promise.all([
        supabase
          .from('company_linkedin_data')
          .select('*')
          .eq('company_id', companyId)
          .eq('analysis_status', 'completed')
          .maybeSingle(),
        supabase
          .from('company_facebook_data')
          .select('*')
          .eq('company_id', companyId)
          .eq('analysis_status', 'completed')
          .maybeSingle(),
        supabase
          .from('company_instagram_data')
          .select('*')
          .eq('company_id', companyId)
          .eq('analysis_status', 'completed')
          .maybeSingle(),
      ]);

      const linkedinData = linkedinResult.data;
      const facebookData = facebookResult.data;
      const instagramData = instagramResult.data;

      // If no data exists, return null
      if (!linkedinData && !facebookData && !instagramData) {
        return null;
      }

      // Transform LinkedIn data
      const linkedin: LinkedInAnalysis | null = linkedinData ? {
        url: linkedinData.linkedin_url || undefined,
        description: linkedinData.description,
        industry: linkedinData.linkedin_industry,
        size: linkedinData.company_size_range,
        headquarters: linkedinData.headquarters,
        website: linkedinData.linkedin_website,
        founded: linkedinData.founded_year,
        employeeCount: linkedinData.employee_count_linkedin,
        followersCount: linkedinData.followers_count,
        specialties: (linkedinData.specialties as string[]) || [],
        keyPeople: (linkedinData.key_people as unknown as SuggestedContact[]) || [],
        recentPosts: (linkedinData.recent_posts as unknown as any[]) || [],
        postsPerMonth: linkedinData.posts_per_month,
        lastPostDate: linkedinData.last_post_date,
        activityLevel: (linkedinData.activity_level as any) || 'unknown',
        engagementScore: linkedinData.engagement_score,
      } : null;

      // Transform Facebook data
      const facebook: FacebookAnalysis | null = facebookData ? {
        url: facebookData.facebook_url || undefined,
        followersCount: facebookData.followers_count,
        likesCount: facebookData.likes_count,
        rating: facebookData.rating,
        reviewsCount: facebookData.reviews_count,
        aboutText: facebookData.about_text,
        pageCategory: facebookData.page_category,
        activityLevel: (facebookData.activity_level as any) || 'unknown',
        hasRecentPosts: facebookData.activity_level === 'high',
      } : null;

      // Transform Instagram data
      const instagram: InstagramAnalysis | null = instagramData ? {
        url: instagramData.instagram_url || undefined,
        followersCount: instagramData.followers_count,
        followingCount: instagramData.following_count,
        postsCount: instagramData.posts_count,
        bio: instagramData.bio,
        activityLevel: (instagramData.activity_level as any) || 'unknown',
        contentType: (instagramData.content_type as any) || null,
        engagementRate: instagramData.engagement_rate,
      } : null;

      // Calculate digital maturity from available data
      const digitalMaturity = calculateDigitalMaturity(linkedin, facebook, instagram);
      
      // Get data suggestions from LinkedIn data
      const dataSuggestions = (linkedinData?.data_suggestions as unknown as DataSuggestion[]) || [];
      
      // Get suggested contacts from LinkedIn
      const suggestedContacts = (linkedinData?.suggested_contacts as unknown as SuggestedContact[]) || [];

      // Generate sales opportunities
      const salesOpportunities = generateSalesOpportunities(linkedin, facebook, instagram);

      // Get the most recent analyzed_at
      const analyzedAt = [
        linkedinData?.analyzed_at,
        facebookData?.analyzed_at,
        instagramData?.analyzed_at,
      ].filter(Boolean).sort().reverse()[0] || new Date().toISOString();

      return {
        linkedin,
        facebook,
        instagram,
        digitalMaturity,
        dataSuggestions,
        salesOpportunities,
        suggestedContacts,
        analyzedAt,
      };
    },
    enabled: !!companyId && !!currentWorkspace?.id,
  });
}

// Calculate digital maturity from analysis data
function calculateDigitalMaturity(
  linkedin: LinkedInAnalysis | null,
  facebook: FacebookAnalysis | null,
  instagram: InstagramAnalysis | null
): DigitalMaturity {
  let score = 0;
  const reasons: string[] = [];

  // LinkedIn scoring
  if (linkedin) {
    if (linkedin.followersCount && linkedin.followersCount > 1000) {
      score += 15;
      reasons.push('boa audiência LinkedIn');
    } else if (linkedin.followersCount && linkedin.followersCount > 100) {
      score += 8;
    }
    if (linkedin.activityLevel === 'high') {
      score += 20;
      reasons.push('ativo no LinkedIn');
    } else if (linkedin.activityLevel === 'medium') {
      score += 10;
    }
  }

  // Facebook scoring
  if (facebook) {
    if (facebook.followersCount && facebook.followersCount > 1000) {
      score += 15;
      reasons.push('boa audiência Facebook');
    } else if (facebook.followersCount && facebook.followersCount > 100) {
      score += 7;
    }
    if (facebook.activityLevel === 'high') {
      score += 15;
    } else if (facebook.activityLevel === 'medium') {
      score += 7;
    }
  }

  // Instagram scoring
  if (instagram) {
    if (instagram.followersCount && instagram.followersCount > 1000) {
      score += 20;
      reasons.push('boa audiência Instagram');
    } else if (instagram.followersCount && instagram.followersCount > 100) {
      score += 10;
    }
    if (instagram.activityLevel === 'high') {
      score += 15;
      reasons.push('ativo no Instagram');
    } else if (instagram.activityLevel === 'medium') {
      score += 7;
    }
  }

  let level: 'low' | 'medium' | 'high';
  let reason: string;

  if (score >= 60) {
    level = 'high';
    reason = reasons.length > 0 ? `Empresa digitalmente madura: ${reasons.slice(0, 2).join(', ')}.` : 'Boa presença digital.';
  } else if (score >= 30) {
    level = 'medium';
    reason = 'Presença digital em desenvolvimento. Oportunidade para melhorias.';
  } else {
    level = 'low';
    reason = 'Baixa maturidade digital. Grande potencial para serviços de marketing digital.';
  }

  return { score, level, reason };
}

// Generate sales opportunities from analysis
function generateSalesOpportunities(
  linkedin: LinkedInAnalysis | null,
  facebook: FacebookAnalysis | null,
  instagram: InstagramAnalysis | null
): SalesOpportunity[] {
  const opportunities: SalesOpportunity[] = [];

  // Instagram opportunities
  if (!instagram?.followersCount) {
    opportunities.push({
      type: 'missing_platform',
      severity: 'medium',
      title: 'Sem presença no Instagram',
      description: 'A empresa não tem perfil de Instagram ou não foi fornecido.',
      service: 'Gestão de Redes Sociais',
    });
  } else if (instagram.activityLevel === 'low') {
    opportunities.push({
      type: 'inactive',
      severity: 'high',
      title: 'Instagram inativo',
      description: `Apenas ${instagram.postsCount || 'poucos'} posts. Oportunidade de reativação.`,
      service: 'Gestão de Redes Sociais',
    });
  }

  // Facebook opportunities
  if (!facebook?.followersCount) {
    opportunities.push({
      type: 'missing_platform',
      severity: 'low',
      title: 'Sem presença no Facebook',
      description: 'A empresa não tem página de Facebook ou não foi fornecida.',
      service: 'Criação de Página Facebook',
    });
  } else if (facebook.activityLevel === 'low') {
    opportunities.push({
      type: 'inactive',
      severity: 'medium',
      title: 'Facebook com baixa atividade',
      description: 'Oportunidade para aumentar engagement.',
      service: 'Gestão de Redes Sociais',
    });
  }

  // LinkedIn opportunities
  if (linkedin?.activityLevel === 'low') {
    opportunities.push({
      type: 'low_engagement',
      severity: 'medium',
      title: 'LinkedIn com pouco engagement',
      description: 'Oportunidade para estratégia de conteúdo B2B.',
      service: 'Marketing de Conteúdo B2B',
    });
  }

  // Paid traffic opportunity
  if ((facebook?.followersCount && facebook.followersCount > 1000) || 
      (instagram?.followersCount && instagram.followersCount > 1000)) {
    opportunities.push({
      type: 'growth',
      severity: 'low',
      title: 'Potencial para tráfego pago',
      description: 'Audiência existente permite campanhas de retargeting.',
      service: 'Tráfego Pago / Ads',
    });
  }

  // Low followers
  if ((facebook?.followersCount && facebook.followersCount < 500) ||
      (instagram?.followersCount && instagram.followersCount < 500)) {
    opportunities.push({
      type: 'growth',
      severity: 'medium',
      title: 'Baixo número de seguidores',
      description: 'Audiência pequena. Oportunidade para growth hacking.',
      service: 'Growth / Campanhas de Awareness',
    });
  }

  return opportunities;
}

// Hook to trigger complete social analysis
export function useAnalyzeCompleteSocial() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      companyName: string;
      linkedinUrl?: string | null;
      facebookUrl?: string | null;
      instagramUrl?: string | null;
      currentCompanyData?: {
        industry?: string;
        website?: string;
        size?: string;
        employee_count?: number;
      };
    }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const { data, error } = await supabase.functions.invoke('analyze-social-complete', {
        body: {
          companyId: input.companyId,
          companyName: input.companyName,
          linkedinUrl: input.linkedinUrl,
          facebookUrl: input.facebookUrl,
          instagramUrl: input.instagramUrl,
          workspaceId: currentWorkspace.id,
          currentCompanyData: input.currentCompanyData,
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Analysis failed');

      return data.data as CompleteSocialAnalysis;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['complete-social-data', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['linkedin-data', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['social-media-data', variables.companyId] });
      toast.success('Análise completa de redes sociais concluída!');
    },
    onError: (error) => {
      console.error('Complete social analysis error:', error);
      toast.error(error.message || 'Erro ao analisar redes sociais');
    },
  });
}

// Hook to apply data suggestions to a company
export function useApplyDataSuggestions() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: { companyId: string; suggestions: DataSuggestion[] }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const updateData: Record<string, string | number> = {};
      for (const suggestion of input.suggestions) {
        if (suggestion.field === 'employee_count') {
          updateData[suggestion.field] = parseInt(suggestion.suggestedValue);
        } else {
          updateData[suggestion.field] = suggestion.suggestedValue;
        }
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', input.companyId);

      if (error) throw error;
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', variables.companyId] });
      toast.success('Dados da empresa atualizados!');
    },
    onError: (error) => {
      console.error('Apply suggestions error:', error);
      toast.error('Erro ao atualizar dados');
    },
  });
}
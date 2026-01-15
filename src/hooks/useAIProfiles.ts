import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AIProfile, AIProfileType, DEFAULT_PROFILES } from '@/types/ai-profiles';
import { DEFAULT_PROFILES as defaultProfilesConfig } from '@/types/ai-profiles';

export function useAIProfiles() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all profiles
  const fetchProfiles = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_personas')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Map database fields to our interface
      const mapped = (data || []).map(p => mapDbToProfile(p));
      setProfiles(mapped);
    } catch (error) {
      console.error('Error fetching AI profiles:', error);
      toast.error('Erro ao carregar perfis de IA');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  // Map database row to AIProfile
  const mapDbToProfile = (p: any): AIProfile => {
    // Parse limits from limitations array or default
    const limitsArray = p.limitations || [];
    const limits = {
      canRespondAutomatically: !limitsArray.includes('no_auto_response'),
      requiresHumanConfirmation: limitsArray.includes('requires_human'),
      refuseOutsideKnowledge: limitsArray.includes('refuse_outside_kb')
    };

    return {
      id: p.id,
      workspaceId: p.workspace_id,
      name: p.name,
      profileType: mapPersonaType(p.persona_type),
      description: p.description,
      objective: p.system_prompt?.split('COMPORTAMENTO:')?.[0]?.replace('O teu objetivo é', '').trim() || '',
      targetAudience: '',
      toneOfVoice: mapToneOfVoice(p.tone_of_voice),
      detailLevel: mapTechnicalDepth(p.technical_depth),
      languageStyle: mapLanguageStyle(p.language_style),
      limits,
      allowedKnowledgeBases: p.knowledge_base_ids || [],
      allowedContentTypes: [],
      systemPrompt: p.system_prompt || '',
      fallbackMessage: extractFallbackMessage(p.system_prompt) || '',
      isActive: p.is_active ?? true,
      isDefault: false,
      createdBy: p.created_by,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };
  };

  const mapPersonaType = (type: string): AIProfileType => {
    const mapping: Record<string, AIProfileType> = {
      'comercial': 'vendas',
      'vendas': 'vendas',
      'suporte': 'suporte',
      'atendimento': 'suporte',
      'terapeuta': 'clinica',
      'clinica': 'clinica',
      'formador': 'formacao',
      'formacao': 'formacao'
    };
    return mapping[type] || 'suporte';
  };

  const mapToneOfVoice = (tone: string): AIProfile['toneOfVoice'] => {
    const mapping: Record<string, AIProfile['toneOfVoice']> = {
      'empático': 'empatico',
      'empatico': 'empatico',
      'direto': 'direto',
      'educativo': 'educativo',
      'técnico': 'profissional',
      'tecnico': 'profissional',
      'amigavel': 'amigavel',
      'amigável': 'amigavel'
    };
    return mapping[tone] || 'profissional';
  };

  const mapTechnicalDepth = (depth: string): AIProfile['detailLevel'] => {
    const mapping: Record<string, AIProfile['detailLevel']> = {
      'low': 'baixo',
      'medium': 'medio',
      'high': 'alto'
    };
    return mapping[depth] || 'medio';
  };

  const mapLanguageStyle = (style: string): AIProfile['languageStyle'] => {
    const mapping: Record<string, AIProfile['languageStyle']> = {
      'formal': 'tecnica',
      'conversational': 'simples',
      'casual': 'simples'
    };
    return mapping[style] || 'mista';
  };

  const extractFallbackMessage = (prompt: string | null): string => {
    if (!prompt) return '';
    const match = prompt.match(/fallback[:\s]*["']?([^"'\n]+)["']?/i);
    return match?.[1] || '';
  };

  // Create default profiles
  const createDefaultProfiles = async () => {
    if (!currentWorkspace?.id || !user?.id) return;

    try {
      setIsLoading(true);
      
      for (const profile of defaultProfilesConfig) {
        const limitations: string[] = [];
        if (!profile.limits.canRespondAutomatically) limitations.push('no_auto_response');
        if (profile.limits.requiresHumanConfirmation) limitations.push('requires_human');
        if (profile.limits.refuseOutsideKnowledge) limitations.push('refuse_outside_kb');

        const personaType = profile.profileType === 'vendas' ? 'comercial' :
                          profile.profileType === 'clinica' ? 'terapeuta' :
                          profile.profileType === 'formacao' ? 'formador' : 'suporte';

        const toneOfVoice = profile.toneOfVoice === 'empatico' ? 'empático' :
                          profile.toneOfVoice === 'educativo' ? 'educativo' :
                          profile.toneOfVoice === 'direto' ? 'direto' : 'empático';

        const { error } = await supabase
          .from('ai_personas')
          .insert({
            workspace_id: currentWorkspace.id,
            created_by: user.id,
            name: profile.name,
            description: profile.description,
            persona_type: personaType,
            tone_of_voice: toneOfVoice,
            technical_depth: profile.detailLevel === 'baixo' ? 'low' : profile.detailLevel === 'alto' ? 'high' : 'medium',
            language_style: profile.languageStyle === 'simples' ? 'conversational' : profile.languageStyle === 'tecnica' ? 'formal' : 'conversational',
            system_prompt: profile.systemPrompt,
            limitations,
            knowledge_base_ids: [],
            is_active: true
          });

        if (error) {
          console.error('Error creating default profile:', error);
        }
      }

      toast.success('Perfis base criados com sucesso!');
      await fetchProfiles();
    } catch (error) {
      console.error('Error creating default profiles:', error);
      toast.error('Erro ao criar perfis base');
    } finally {
      setIsLoading(false);
    }
  };

  // Create profile
  const createProfile = async (data: Partial<AIProfile>): Promise<AIProfile | null> => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const limitations: string[] = [];
      if (!data.limits?.canRespondAutomatically) limitations.push('no_auto_response');
      if (data.limits?.requiresHumanConfirmation) limitations.push('requires_human');
      if (data.limits?.refuseOutsideKnowledge) limitations.push('refuse_outside_kb');

      const personaType = data.profileType === 'vendas' ? 'comercial' :
                        data.profileType === 'clinica' ? 'terapeuta' :
                        data.profileType === 'formacao' ? 'formador' : 'suporte';

      const toneOfVoice = data.toneOfVoice === 'empatico' ? 'empático' :
                        data.toneOfVoice === 'educativo' ? 'educativo' :
                        data.toneOfVoice === 'direto' ? 'direto' : 'empático';

      const { data: result, error } = await supabase
        .from('ai_personas')
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: data.name,
          description: data.description,
          persona_type: personaType,
          tone_of_voice: toneOfVoice,
          technical_depth: data.detailLevel === 'baixo' ? 'low' : data.detailLevel === 'alto' ? 'high' : 'medium',
          language_style: data.languageStyle === 'simples' ? 'conversational' : data.languageStyle === 'tecnica' ? 'formal' : 'conversational',
          system_prompt: data.systemPrompt,
          limitations,
          knowledge_base_ids: data.allowedKnowledgeBases || [],
          is_active: data.isActive ?? true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Perfil criado com sucesso!');
      await fetchProfiles();
      return mapDbToProfile(result);
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Erro ao criar perfil');
      return null;
    }
  };

  // Update profile
  const updateProfile = async (id: string, data: Partial<AIProfile>): Promise<boolean> => {
    try {
      const limitations: string[] = [];
      if (!data.limits?.canRespondAutomatically) limitations.push('no_auto_response');
      if (data.limits?.requiresHumanConfirmation) limitations.push('requires_human');
      if (data.limits?.refuseOutsideKnowledge) limitations.push('refuse_outside_kb');

      const updateData: any = {};
      
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.profileType) {
        updateData.persona_type = data.profileType === 'vendas' ? 'comercial' :
                                 data.profileType === 'clinica' ? 'terapeuta' :
                                 data.profileType === 'formacao' ? 'formador' : 'suporte';
      }
      if (data.toneOfVoice) {
        updateData.tone_of_voice = data.toneOfVoice === 'empatico' ? 'empático' :
                                  data.toneOfVoice === 'educativo' ? 'educativo' :
                                  data.toneOfVoice === 'direto' ? 'direto' : 'empático';
      }
      if (data.detailLevel) {
        updateData.technical_depth = data.detailLevel === 'baixo' ? 'low' : data.detailLevel === 'alto' ? 'high' : 'medium';
      }
      if (data.languageStyle) {
        updateData.language_style = data.languageStyle === 'simples' ? 'conversational' : data.languageStyle === 'tecnica' ? 'formal' : 'conversational';
      }
      if (data.systemPrompt !== undefined) updateData.system_prompt = data.systemPrompt;
      if (data.limits) updateData.limitations = limitations;
      if (data.allowedKnowledgeBases) updateData.knowledge_base_ids = data.allowedKnowledgeBases;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase
        .from('ai_personas')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Perfil atualizado!');
      await fetchProfiles();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
      return false;
    }
  };

  // Delete profile
  const deleteProfile = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_personas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Perfil eliminado!');
      await fetchProfiles();
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Erro ao eliminar perfil');
      return false;
    }
  };

  // Toggle active state
  const toggleActive = async (id: string, isActive: boolean): Promise<boolean> => {
    return updateProfile(id, { isActive });
  };

  // Get profile by type
  const getProfileByType = (type: AIProfileType): AIProfile | undefined => {
    return profiles.find(p => p.profileType === type && p.isActive);
  };

  // Get active profiles
  const getActiveProfiles = (): AIProfile[] => {
    return profiles.filter(p => p.isActive);
  };

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles,
    isLoading,
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    toggleActive,
    createDefaultProfiles,
    getProfileByType,
    getActiveProfiles
  };
}

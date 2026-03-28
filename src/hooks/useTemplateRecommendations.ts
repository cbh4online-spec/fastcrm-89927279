import { useMemo } from 'react';
import { useCommunicationTemplates } from '@/hooks/useCommunicationTemplates';
import type { TemplateChannel, TemplateStructure, TemplateTone } from '@/types/communicationTemplate';

export interface TemplateRecommendation {
  id: string;
  goal: string;
  goalValue: string;
  channel: 'email' | 'whatsapp';
  tone: 'formal' | 'friendly' | 'direct' | 'casual';
  toneLabel: string;
  structure: TemplateStructure;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  audienceValue?: string;
}

const GOAL_MAP: Record<string, string> = {
  captar_lead_frio: 'Captar lead frio',
  follow_up: 'Follow-up comercial',
  upsell: 'Upsell / upgrade',
  reativacao: 'Reativação de lead inativo',
  onboarding: 'Onboarding / boas-vindas',
  convite_evento: 'Convite para evento',
  qualificacao: 'Qualificação de lead',
};

export function useTemplateRecommendations() {
  const { data: templates, isLoading } = useCommunicationTemplates();

  const recommendations = useMemo<TemplateRecommendation[]>(() => {
    if (!templates) return [];

    const recs: TemplateRecommendation[] = [];
    
    // Analyze existing templates
    const channels = new Set(templates.map(t => t.channel));
    const structures = new Set(templates.map(t => t.structureType));
    const contexts = new Set(templates.flatMap(t => t.journeyContexts || []));
    const emailCount = templates.filter(t => t.channel === 'email').length;
    const whatsappCount = templates.filter(t => t.channel === 'whatsapp').length;

    // Rule 1: Channel gap — has email but no WhatsApp
    if (emailCount > 0 && whatsappCount === 0) {
      recs.push({
        id: 'gap-whatsapp',
        goal: 'Follow-up rápido para WhatsApp',
        goalValue: 'follow_up',
        channel: 'whatsapp',
        tone: 'casual',
        toneLabel: 'Casual',
        structure: 'FollowUp',
        reason: `Tem ${emailCount} templates de email mas nenhum de WhatsApp — diversifique os canais`,
        priority: 'high',
        audienceValue: 'geral',
      });
    }

    // Rule 2: Channel gap — has WhatsApp but no Email
    if (whatsappCount > 0 && emailCount === 0) {
      recs.push({
        id: 'gap-email',
        goal: 'Email profissional de apresentação',
        goalValue: 'captar_lead_frio',
        channel: 'email',
        tone: 'formal',
        toneLabel: 'Formal',
        structure: 'AIDA',
        reason: `Tem ${whatsappCount} templates de WhatsApp mas nenhum de email — adicione um canal mais formal`,
        priority: 'high',
        audienceValue: 'empresarios',
      });
    }

    // Rule 3: No reactivation template
    if (!contexts.has('reativacao')) {
      recs.push({
        id: 'gap-reativacao',
        goal: 'Template de reativação de leads inativos',
        goalValue: 'reativacao',
        channel: emailCount >= whatsappCount ? 'email' : 'whatsapp',
        tone: 'friendly',
        toneLabel: 'Amigável',
        structure: 'REENGAGE',
        reason: 'Não tem nenhum template de reativação — recupere leads que ficaram inativos',
        priority: 'high',
      });
    }

    // Rule 4: No follow-up template
    if (!contexts.has('followup')) {
      recs.push({
        id: 'gap-followup',
        goal: 'Follow-up comercial estruturado',
        goalValue: 'follow_up',
        channel: 'email',
        tone: 'direct',
        toneLabel: 'Direto',
        structure: 'FollowUp',
        reason: 'Não tem templates de follow-up — essencial para fechar oportunidades abertas',
        priority: 'high',
      });
    }

    // Rule 5: Structure variety — only uses one structure
    if (structures.size === 1 && templates.length >= 3) {
      const currentStructure = [...structures][0];
      const suggestedStructure: TemplateStructure = currentStructure === 'AIDA' ? 'PAS' : 'AIDA';
      recs.push({
        id: 'variety-structure',
        goal: `Experimente a estrutura ${suggestedStructure}`,
        goalValue: 'captar_lead_frio',
        channel: 'email',
        tone: 'formal',
        toneLabel: 'Formal',
        structure: suggestedStructure,
        reason: `Todos os seus templates usam ${currentStructure} — diversificar a estrutura pode melhorar conversões`,
        priority: 'medium',
      });
    }

    // Rule 6: No cold outreach
    if (!structures.has('ColdOutreach') && templates.length >= 2) {
      recs.push({
        id: 'gap-cold',
        goal: 'Cold outreach para novos prospects',
        goalValue: 'captar_lead_frio',
        channel: whatsappCount === 0 ? 'whatsapp' : 'email',
        tone: 'direct',
        toneLabel: 'Direto',
        structure: 'ColdOutreach',
        reason: 'Não tem templates de prospecção a frio — essencial para expandir a base de clientes',
        priority: 'medium',
      });
    }

    // Rule 7: No onboarding template
    if (!contexts.has('onboarding') && templates.length >= 3) {
      recs.push({
        id: 'gap-onboarding',
        goal: 'Boas-vindas para novos clientes',
        goalValue: 'onboarding',
        channel: 'email',
        tone: 'friendly',
        toneLabel: 'Amigável',
        structure: 'AIDA',
        reason: 'Não tem template de onboarding — cause uma boa primeira impressão',
        priority: 'low',
      });
    }

    // Rule 8: Empty workspace — suggest starting template
    if (templates.length === 0) {
      recs.push(
        {
          id: 'start-email',
          goal: 'Primeiro email de apresentação comercial',
          goalValue: 'captar_lead_frio',
          channel: 'email',
          tone: 'formal',
          toneLabel: 'Formal',
          structure: 'AIDA',
          reason: 'Comece com um email de apresentação profissional — a base de qualquer pipeline',
          priority: 'high',
          audienceValue: 'empresarios',
        },
        {
          id: 'start-whatsapp',
          goal: 'Primeira mensagem de contacto por WhatsApp',
          goalValue: 'qualificacao',
          channel: 'whatsapp',
          tone: 'casual',
          toneLabel: 'Casual',
          structure: 'PAS',
          reason: 'WhatsApp tem taxas de resposta 3x superiores ao email — ideal para primeiro contacto',
          priority: 'high',
          audienceValue: 'geral',
        },
      );
    }

    return recs.slice(0, 3); // Max 3 recommendations
  }, [templates]);

  return { recommendations, isLoading };
}

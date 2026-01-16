import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerJourney } from './useCustomerJourney';
import { AIJourneySuggestion, SuggestionPriority } from '@/types/aiJourneySuggestion';

interface UseAIJourneySuggestionsProps {
  entityType: 'contact' | 'company';
  entityId: string;
}

export function useAIJourneySuggestions({ entityType, entityId }: UseAIJourneySuggestionsProps) {
  const journeyParams = entityType === 'contact' 
    ? { contactId: entityId } 
    : { companyId: entityId };
  
  const { data: journeyData, isLoading: isJourneyLoading } = useCustomerJourney(journeyParams);

  // Fetch product details for more context
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['acquired-products-suggestions', entityType, entityId],
    queryFn: async () => {
      let query = supabase
        .from('contact_products')
        .select(`
          id, status, consumed_quantity, purchased_quantity, product_id,
          product:products(id, name, recommended_frequency)
        `);

      if (entityType === 'contact') {
        query = query.eq('contact_id', entityId);
      } else {
        query = query.eq('company_id', entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId
  });

  const suggestions = useMemo<AIJourneySuggestion[]>(() => {
    if (!journeyData || !productsData) return [];

    const result: AIJourneySuggestion[] = [];
    const now = new Date();

    // Analyze each acquired product
    productsData.forEach((product) => {
      const percentageConsumed = product.purchased_quantity 
        ? ((product.consumed_quantity || 0) / product.purchased_quantity) * 100 
        : 0;
      
      const consumed = product.consumed_quantity || 0;
      const total = product.purchased_quantity || 0;
      const remaining = total - consumed;

      // 1. Consumption near end alert (>70% consumed)
      if (percentageConsumed >= 70 && percentageConsumed < 100) {
        const priority: SuggestionPriority = percentageConsumed >= 90 ? 'high' : 'medium';
        
        result.push({
          id: `consumption-alert-${product.id}`,
          type: 'consumption_alert',
          priority,
          title: `Consumo próximo do fim`,
          description: `${product.product?.name}: ${consumed}/${total} consumidos (${Math.round(percentageConsumed)}%)`,
          reasoning: `O cliente já consumiu ${Math.round(percentageConsumed)}% do produto. Restam apenas ${remaining} unidades.`,
          suggestedAction: percentageConsumed >= 90 
            ? 'Contactar cliente para renovação ou upgrade'
            : 'Preparar proposta de renovação',
          actionType: percentageConsumed >= 90 ? 'call' : 'proposal',
          metadata: {
            productId: product.product_id,
            productName: product.product?.name,
            consumedQuantity: consumed,
            totalQuantity: total,
            percentageConsumed
          },
          createdAt: now
        });
      }

      // 2. Product completed - upsell opportunity
      if (percentageConsumed >= 100 && product.status === 'concluido') {
        result.push({
          id: `upsell-${product.id}`,
          type: 'upsell_opportunity',
          priority: 'high',
          title: `Oportunidade de renovação/upgrade`,
          description: `${product.product?.name} foi concluído`,
          reasoning: `O cliente terminou o consumo de ${product.product?.name}. Clientes semelhantes tipicamente avançam para o nível seguinte ou renovam.`,
          suggestedAction: 'Apresentar proposta de continuidade ou upgrade',
          actionType: 'proposal',
          metadata: {
            productId: product.product_id,
            productName: product.product?.name,
            consumedQuantity: consumed,
            totalQuantity: total,
            percentageConsumed: 100
          },
          createdAt: now
        });
      }
    });

    // 3. Check frequency break - suggest scheduling
    if (journeyData.daysSinceLastInteraction && journeyData.averageConsumptionFrequency) {
      const expectedFrequency = journeyData.averageConsumptionFrequency;
      const daysSince = journeyData.daysSinceLastInteraction;
      
      // If days since last interaction exceeds expected frequency by 50%
      if (daysSince > expectedFrequency * 1.5) {
        const priority: SuggestionPriority = daysSince > expectedFrequency * 3 ? 'high' : 'medium';
        
        result.push({
          id: `schedule-session-${entityId}`,
          type: 'schedule_session',
          priority,
          title: 'Frequência de sessões quebrada',
          description: `Última interação há ${daysSince} dias`,
          reasoning: `A frequência média de consumo é de ${Math.round(expectedFrequency)} dias, mas já passaram ${daysSince} dias desde a última interação.`,
          suggestedAction: 'Agendar próxima sessão ou contactar cliente',
          actionType: 'schedule',
          metadata: {
            daysSinceLastInteraction: daysSince,
            expectedFrequencyDays: expectedFrequency
          },
          createdAt: now
        });
      }
    }

    // 4. Churn risk based on journey stage and inactivity
    if (journeyData.churnRisk === 'alto' || journeyData.stage === 'em_pausa') {
      const daysSince = journeyData.daysSinceLastInteraction || 0;
      
      result.push({
        id: `churn-risk-${entityId}`,
        type: 'churn_risk',
        priority: 'high',
        title: 'Cliente em risco de abandono',
        description: journeyData.stage === 'em_pausa' 
          ? 'Cliente está em pausa prolongada'
          : `Inatividade há ${daysSince} dias`,
        reasoning: journeyData.stage === 'em_pausa'
          ? 'O cliente entrou em modo de pausa, indicando possível perda de interesse ou problema.'
          : `O cliente está inativo há ${daysSince} dias, o que é significativamente acima do padrão esperado.`,
        suggestedAction: 'Contactar cliente para entender situação e oferecer suporte',
        actionType: 'call',
        metadata: {
          daysSinceLastInteraction: daysSince
        },
        createdAt: now
      });
    }

    // 5. Reactivation for completed customers
    if (journeyData.stage === 'concluido' && journeyData.completedProducts > 0) {
      const completedProduct = productsData.find(p => p.status === 'concluido');
      
      result.push({
        id: `reactivation-${entityId}`,
        type: 'reactivation',
        priority: 'medium',
        title: 'Oportunidade de reativação',
        description: `Cliente completou ${journeyData.completedProducts} produto(s)`,
        reasoning: `O cliente concluiu todos os produtos ativos. É uma boa altura para propor novos serviços ou renovação.`,
        suggestedAction: 'Apresentar novos produtos ou serviços complementares',
        actionType: 'proposal',
        metadata: completedProduct ? {
          productId: completedProduct.product_id,
          productName: completedProduct.product?.name
        } : undefined,
        createdAt: now
      });
    }

    // 6. Upsell ready customers
    if (journeyData.stage === 'pronto_upsell') {
      result.push({
        id: `upsell-ready-${entityId}`,
        type: 'upsell_opportunity',
        priority: 'high',
        title: 'Cliente pronto para upgrade',
        description: 'Padrão de consumo indica potencial para nível seguinte',
        reasoning: `Com base no consumo consistente e na fase de jornada atual, o cliente está preparado para avançar para um nível superior de serviço.`,
        suggestedAction: 'Apresentar proposta de upgrade ou serviços adicionais',
        actionType: 'proposal',
        createdAt: now
      });
    }

    // 7. New customer onboarding
    if (journeyData.stage === 'novo' && journeyData.activeProducts > 0) {
      result.push({
        id: `onboarding-${entityId}`,
        type: 'schedule_session',
        priority: 'medium',
        title: 'Iniciar onboarding',
        description: 'Novo cliente com produtos ativos',
        reasoning: 'O cliente adquiriu produtos mas ainda não iniciou o consumo. É importante agendar a primeira sessão.',
        suggestedAction: 'Agendar primeira sessão de onboarding',
        actionType: 'schedule',
        createdAt: now
      });
    }

    // Sort by priority
    const priorityOrder: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [journeyData, productsData, entityId]);

  return {
    suggestions,
    isLoading: isJourneyLoading || isProductsLoading,
    journeyData
  };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerJourney, JourneyStage, ChurnRisk } from "@/types/customerJourney";

interface UseCustomerJourneyParams {
  contactId?: string;
  companyId?: string;
}

export function useCustomerJourney({ contactId, companyId }: UseCustomerJourneyParams) {
  return useQuery({
    queryKey: ["customer-journey", contactId, companyId],
    queryFn: async (): Promise<CustomerJourney> => {
      // Fetch acquired products
      let productsQuery = supabase
        .from("contact_products")
        .select(`
          id, status, acquisition_date, consumed_quantity, purchased_quantity, quantity,
          product:products(id, name, recommended_frequency, typical_duration_days, is_trackable)
        `);

      if (contactId) {
        productsQuery = productsQuery.eq("contact_id", contactId);
      } else if (companyId) {
        productsQuery = productsQuery.eq("company_id", companyId);
      }

      const { data: products, error: productsError } = await productsQuery;
      if (productsError) throw productsError;

      // Fetch consumption logs
      let logsQuery = supabase
        .from("consumption_logs")
        .select("consumption_date, quantity")
        .order("consumption_date", { ascending: false });

      if (contactId) {
        logsQuery = logsQuery.eq("contact_id", contactId);
      } else if (companyId) {
        logsQuery = logsQuery.eq("company_id", companyId);
      }

      const { data: logs, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      // Fetch CRM activities for last interaction
      let activitiesQuery = supabase
        .from("crm_activities")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (contactId) {
        activitiesQuery = activitiesQuery.eq("entity_id", contactId).eq("entity_type", "contact");
      } else if (companyId) {
        activitiesQuery = activitiesQuery.eq("entity_id", companyId).eq("entity_type", "company");
      }

      const { data: activities } = await activitiesQuery;

      // Calculate metrics
      const activeProducts = products?.filter(p => p.status === 'ativo' || p.status === 'em_consumo').length || 0;
      const completedProducts = products?.filter(p => p.status === 'concluido').length || 0;
      const totalConsumption = logs?.reduce((sum, log) => sum + log.quantity, 0) || 0;

      // Last interaction date
      const lastLogDate = logs?.[0]?.consumption_date;
      const lastActivityDate = activities?.[0]?.created_at;
      const lastInteractionDate = [lastLogDate, lastActivityDate]
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

      // Days since last interaction
      const daysSinceLastInteraction = lastInteractionDate
        ? Math.floor((Date.now() - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Calculate average consumption frequency
      let averageConsumptionFrequency: number | null = null;
      if (logs && logs.length >= 2) {
        const dates = logs.map(l => new Date(l.consumption_date).getTime()).sort((a, b) => a - b);
        const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
        averageConsumptionFrequency = Math.round(totalDays / (logs.length - 1));
      }

      // Calculate journey stage
      const stage = calculateJourneyStage({
        products: products || [],
        logs: logs || [],
        daysSinceLastInteraction,
        averageConsumptionFrequency,
      });

      // Calculate churn risk
      const churnRisk = calculateChurnRisk({
        products: products || [],
        daysSinceLastInteraction,
        averageConsumptionFrequency,
        stage,
      });

      // Generate recommended action based on stage
      const nextRecommendedAction = generateRecommendedAction(stage, {
        daysSinceLastInteraction,
        activeProducts,
        completedProducts,
        churnRisk,
      });

      return {
        stage,
        lastInteractionDate,
        nextRecommendedAction,
        churnRisk,
        activeProducts,
        completedProducts,
        totalConsumption,
        daysSinceLastInteraction,
        averageConsumptionFrequency,
      };
    },
    enabled: !!(contactId || companyId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

interface CalculateJourneyStageParams {
  products: Array<{
    status: string | null;
    acquisition_date: string | null;
    consumed_quantity: number | null;
    purchased_quantity: number | null;
    quantity: number | null;
  }>;
  logs: Array<{ consumption_date: string; quantity: number }>;
  daysSinceLastInteraction: number | null;
  averageConsumptionFrequency: number | null;
}

function calculateJourneyStage(params: CalculateJourneyStageParams): JourneyStage {
  const { products, logs, daysSinceLastInteraction, averageConsumptionFrequency } = params;

  // No products = New
  if (products.length === 0) {
    return 'novo';
  }

  const activeProducts = products.filter(p => p.status === 'ativo' || p.status === 'em_consumo');
  const completedProducts = products.filter(p => p.status === 'concluido');
  const inProgressProducts = products.filter(p => {
    const consumed = p.consumed_quantity || 0;
    const total = p.purchased_quantity || p.quantity || 0;
    return consumed > 0 && consumed < total;
  });

  // All completed with recent activity = Ready for upsell
  if (completedProducts.length > 0 && activeProducts.length === 0) {
    if (daysSinceLastInteraction !== null && daysSinceLastInteraction <= 30) {
      return 'pronto_upsell';
    }
    return 'concluido';
  }

  // Has active products but no consumption = Onboarding
  if (activeProducts.length > 0 && logs.length === 0) {
    return 'em_onboarding';
  }

  // Active consumption
  if (inProgressProducts.length > 0 || (activeProducts.length > 0 && logs.length > 0)) {
    // Check if paused (no activity for 2x expected frequency or 30+ days)
    const expectedFrequency = averageConsumptionFrequency || 14; // default 14 days
    const pauseThreshold = Math.max(expectedFrequency * 2, 30);

    if (daysSinceLastInteraction !== null && daysSinceLastInteraction > pauseThreshold) {
      return 'em_pausa';
    }

    return 'em_consumo';
  }

  return 'novo';
}

interface CalculateChurnRiskParams {
  products: Array<{
    status: string | null;
    product: { recommended_frequency: string | null } | null;
  }>;
  daysSinceLastInteraction: number | null;
  averageConsumptionFrequency: number | null;
  stage: JourneyStage;
}

function calculateChurnRisk(params: CalculateChurnRiskParams): ChurnRisk {
  const { daysSinceLastInteraction, averageConsumptionFrequency, stage } = params;

  // Completed or new = low risk
  if (stage === 'concluido' || stage === 'novo' || stage === 'pronto_upsell') {
    return 'baixo';
  }

  // In pause = medium to high risk
  if (stage === 'em_pausa') {
    if (daysSinceLastInteraction !== null && daysSinceLastInteraction > 60) {
      return 'alto';
    }
    return 'medio';
  }

  // Calculate based on frequency deviation
  if (daysSinceLastInteraction !== null && averageConsumptionFrequency !== null) {
    const deviation = daysSinceLastInteraction / averageConsumptionFrequency;
    if (deviation > 3) return 'alto';
    if (deviation > 1.5) return 'medio';
  }

  // Default based on days without interaction
  if (daysSinceLastInteraction !== null) {
    if (daysSinceLastInteraction > 45) return 'alto';
    if (daysSinceLastInteraction > 21) return 'medio';
  }

  return 'baixo';
}

interface GenerateActionParams {
  daysSinceLastInteraction: number | null;
  activeProducts: number;
  completedProducts: number;
  churnRisk: ChurnRisk;
}

function generateRecommendedAction(stage: JourneyStage, params: GenerateActionParams): string {
  const { daysSinceLastInteraction, activeProducts, completedProducts, churnRisk } = params;

  switch (stage) {
    case 'novo':
      return 'Agendar apresentação de produtos/serviços';
    
    case 'em_onboarding':
      return 'Confirmar início e agendar primeira sessão';
    
    case 'em_consumo':
      if (churnRisk === 'medio') {
        return 'Contactar para acompanhamento de satisfação';
      }
      return 'Manter acompanhamento regular';
    
    case 'em_pausa':
      if (churnRisk === 'alto') {
        return 'Contactar urgentemente para reativação';
      }
      return 'Enviar mensagem de follow-up personalizada';
    
    case 'concluido':
      return 'Recolher feedback e avaliar próximos passos';
    
    case 'pronto_upsell':
      return completedProducts > 0 
        ? `Sugerir novo produto (${completedProducts} concluído${completedProducts > 1 ? 's' : ''})`
        : 'Apresentar produtos complementares';
    
    default:
      return 'Verificar situação do cliente';
  }
}

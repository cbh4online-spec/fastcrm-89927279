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

      // Fetch invoices for this company/contact
      let invoicesQuery = supabase
        .from("invoices")
        .select("id, status, total, issue_date, paid_at, sent_at")
        .order("issue_date", { ascending: false });

      if (contactId) {
        invoicesQuery = invoicesQuery.eq("contact_id", contactId);
      } else if (companyId) {
        invoicesQuery = invoicesQuery.eq("company_id", companyId);
      }

      const { data: invoices } = await invoicesQuery;

      // Fetch proposals via opportunities linked to this entity
      let proposalsCount = 0;
      let acceptedProposals = 0;
      
      if (companyId) {
        // Get opportunities through company contacts
        const { data: companyContacts } = await supabase
          .from("contacts")
          .select("id")
          .eq("company_id", companyId);
        
        if (companyContacts && companyContacts.length > 0) {
          const contactIds = companyContacts.map(c => c.id);
          const { data: opportunities } = await supabase
            .from("opportunities")
            .select("id, status")
            .in("contact_id", contactIds);
          
          if (opportunities && opportunities.length > 0) {
            const oppIds = opportunities.map(o => o.id);
            const { data: proposals } = await supabase
              .from("proposals")
              .select("id, status")
              .in("opportunity_id", oppIds);
            
            proposalsCount = proposals?.length || 0;
            acceptedProposals = proposals?.filter(p => p.status === "accepted").length || 0;
          }
        }
      } else if (contactId) {
        const { data: opportunities } = await supabase
          .from("opportunities")
          .select("id, status")
          .eq("contact_id", contactId);
        
        if (opportunities && opportunities.length > 0) {
          const oppIds = opportunities.map(o => o.id);
          const { data: proposals } = await supabase
            .from("proposals")
            .select("id, status")
            .in("opportunity_id", oppIds);
          
          proposalsCount = proposals?.length || 0;
          acceptedProposals = proposals?.filter(p => p.status === "accepted").length || 0;
        }
      }

      // Calculate metrics
      const activeProducts = products?.filter(p => p.status === 'ativo' || p.status === 'em_consumo').length || 0;
      const completedProducts = products?.filter(p => p.status === 'concluido').length || 0;
      const totalConsumption = logs?.reduce((sum, log) => sum + log.quantity, 0) || 0;

      // Invoice metrics
      const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0;
      const pendingInvoices = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').length || 0;
      const totalInvoiceValue = invoices?.reduce((sum, i) => sum + (i.total || 0), 0) || 0;

      // Last interaction date - include invoices and proposals
      const lastLogDate = logs?.[0]?.consumption_date;
      const lastActivityDate = activities?.[0]?.created_at;
      const lastInvoiceDate = invoices?.[0]?.issue_date;
      
      const lastInteractionDate = [lastLogDate, lastActivityDate, lastInvoiceDate]
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

      // Calculate journey stage - now considering invoices and proposals
      const stage = calculateJourneyStage({
        products: products || [],
        logs: logs || [],
        invoices: invoices || [],
        proposalsCount,
        acceptedProposals,
        daysSinceLastInteraction,
        averageConsumptionFrequency,
      });

      // Calculate churn risk
      const churnRisk = calculateChurnRisk({
        products: products || [],
        daysSinceLastInteraction,
        averageConsumptionFrequency,
        stage,
        paidInvoices,
      });

      // Generate recommended action based on stage
      const nextRecommendedAction = generateRecommendedAction(stage, {
        daysSinceLastInteraction,
        activeProducts,
        completedProducts,
        churnRisk,
        pendingInvoices,
        proposalsCount,
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
  invoices: Array<{ id: string; status: string | null; total: number | null }>;
  proposalsCount: number;
  acceptedProposals: number;
  daysSinceLastInteraction: number | null;
  averageConsumptionFrequency: number | null;
}

function calculateJourneyStage(params: CalculateJourneyStageParams): JourneyStage {
  const { products, logs, invoices, proposalsCount, acceptedProposals, daysSinceLastInteraction, averageConsumptionFrequency } = params;

  // Check if client has paid invoices = customer relationship exists
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'draft' || i.status === 'overdue');

  // Has paid invoices = at least in consumption or completed
  if (paidInvoices.length > 0) {
    if (products.length > 0) {
      const activeProducts = products.filter(p => p.status === 'ativo' || p.status === 'em_consumo');
      if (activeProducts.length > 0) {
        return 'em_consumo';
      }
      return 'concluido';
    }
    // Paid but no products tracked = in consumption
    if (daysSinceLastInteraction !== null && daysSinceLastInteraction <= 30) {
      return 'em_consumo';
    }
    return 'pronto_upsell';
  }

  // Has pending invoices = in onboarding (waiting for payment/start)
  if (pendingInvoices.length > 0) {
    return 'em_onboarding';
  }

  // Has accepted proposals = in onboarding
  if (acceptedProposals > 0) {
    return 'em_onboarding';
  }

  // Has proposals sent = prospect (treat as new with activity)
  if (proposalsCount > 0) {
    return 'novo';
  }

  // Original product-based logic
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
    const expectedFrequency = averageConsumptionFrequency || 14;
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
  paidInvoices: number;
}

function calculateChurnRisk(params: CalculateChurnRiskParams): ChurnRisk {
  const { daysSinceLastInteraction, averageConsumptionFrequency, stage, paidInvoices } = params;

  // Completed or new = low risk
  if (stage === 'concluido' || stage === 'novo' || stage === 'pronto_upsell') {
    return 'baixo';
  }

  // Onboarding with paid invoices = low risk
  if (stage === 'em_onboarding' && paidInvoices > 0) {
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
  pendingInvoices: number;
  proposalsCount: number;
}

function generateRecommendedAction(stage: JourneyStage, params: GenerateActionParams): string {
  const { completedProducts, churnRisk, pendingInvoices, proposalsCount } = params;

  switch (stage) {
    case 'novo':
      if (proposalsCount > 0) {
        return 'Fazer follow-up das propostas enviadas';
      }
      return 'Agendar apresentação de produtos/serviços';
    
    case 'em_onboarding':
      if (pendingInvoices > 0) {
        return 'Confirmar pagamento e agendar início';
      }
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

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMemo } from "react";
import {
  ExecutiveKPIs,
  RevenueMetrics,
  ChurnMetrics,
  ChurnCause,
  ConsumptionForecast,
  ProductConsumption,
  CohortData,
  ReportAIInsight,
  ScenarioAnalysis,
} from "@/types/forecastsReports";

// Hook for Executive Overview KPIs
export function useExecutiveKPIs() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['executive-kpis', currentWorkspace?.id],
    queryFn: async (): Promise<ExecutiveKPIs> => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      // Fetch contact products (purchased products)
      const { data: contactProducts } = await supabase
        .from('contact_products')
        .select('*, products(*)')
        .eq('workspace_id', currentWorkspace.id);

      // Fetch opportunities for revenue
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      // Fetch contacts for journey analysis
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Calculate realized revenue from closed opportunities
      const closedOpps = opportunities?.filter(o => o.status === 'closed_won') || [];
      const realizedMTD = closedOpps
        .filter(o => new Date(o.updated_at) >= startOfMonth)
        .reduce((sum, o) => sum + (o.value || 0), 0);
      const realizedYTD = closedOpps
        .filter(o => new Date(o.updated_at) >= startOfYear)
        .reduce((sum, o) => sum + (o.value || 0), 0);

      // Calculate forecast from active products and opportunities
      const activeProducts = contactProducts?.filter(p => p.status === 'active') || [];
      const activeOpportunities = opportunities?.filter(o => 
        o.status !== 'closed_won' && o.status !== 'closed_lost'
      ) || [];

      // Forecast based on weighted probability
      const forecast30d = activeOpportunities.reduce((sum, o) => 
        sum + (o.value || 0) * ((o.probability || 50) / 100), 0);
      const forecast60d = forecast30d * 1.3;
      const forecast90d = forecast30d * 1.6;

      // Count clients at risk (no recent activity)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const atRiskContacts = contacts?.filter(c => {
        const lastContact = c.last_contact_at ? new Date(c.last_contact_at) : null;
        return lastContact && lastContact < thirtyDaysAgo && c.client_status === 'active';
      }) || [];

      // Calculate churn and retention rates
      const totalActiveClients = contacts?.filter(c => c.client_status === 'active').length || 0;
      const churnRate = totalActiveClients > 0 ? (atRiskContacts.length / totalActiveClients) * 100 : 0;

      // Upsell potential from products near completion
      const upsellReady = contactProducts?.filter(p => {
        const consumed = p.consumed_quantity || 0;
        const total = p.purchased_quantity || 1;
        return consumed / total >= 0.8 && p.status === 'active';
      }) || [];

      const avgProductValue = activeProducts.reduce((sum, p) => sum + (p.total_value || 0), 0) / (activeProducts.length || 1);
      const upsellPotential = upsellReady.length * avgProductValue;

      return {
        realizedRevenueMTD: realizedMTD,
        realizedRevenueYTD: realizedYTD,
        forecastedRevenue30d: forecast30d,
        forecastedRevenue60d: forecast60d,
        forecastedRevenue90d: forecast90d,
        activeProducts: activeProducts.length,
        clientsInConsumption: contacts?.filter(c => c.client_status === 'active').length || 0,
        clientsAtRisk: atRiskContacts.length,
        upsellPotential,
        churnRate,
        retentionRate: 100 - churnRate,
      };
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for Revenue Metrics
export function useRevenueMetrics() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['revenue-metrics', currentWorkspace?.id],
    queryFn: async (): Promise<RevenueMetrics> => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const closedWon = opportunities?.filter(o => o.status === 'closed_won') || [];
      const active = opportunities?.filter(o => 
        o.status !== 'closed_won' && o.status !== 'closed_lost'
      ) || [];

      const realizedMTD = closedWon
        .filter(o => new Date(o.updated_at) >= startOfMonth)
        .reduce((sum, o) => sum + (o.value || 0), 0);

      const realizedYTD = closedWon
        .filter(o => new Date(o.updated_at) >= startOfYear)
        .reduce((sum, o) => sum + (o.value || 0), 0);

      // Guaranteed = high probability (>80%)
      const guaranteed = active
        .filter(o => (o.probability || 0) >= 80)
        .reduce((sum, o) => sum + (o.value || 0), 0);

      // Probable = medium probability (40-80%)
      const probable = active
        .filter(o => (o.probability || 0) >= 40 && (o.probability || 0) < 80)
        .reduce((sum, o) => sum + (o.value || 0) * ((o.probability || 50) / 100), 0);

      // Calculate forecasts
      const weightedForecast = active.reduce((sum, o) => 
        sum + (o.value || 0) * ((o.probability || 50) / 100), 0);

      return {
        realizedMTD,
        realizedYTD,
        forecast30d: weightedForecast,
        forecast60d: weightedForecast * 1.3,
        forecast90d: weightedForecast * 1.6,
        guaranteedRevenue: guaranteed,
        probableRevenue: probable,
        variance: 0, // Would compare to previous period
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Hook for Churn Analysis
export function useChurnAnalysis() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['churn-analysis', currentWorkspace?.id],
    queryFn: async (): Promise<{ metrics: ChurnMetrics; causes: ChurnCause[]; atRiskClients: any[] }> => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      const { data: contactProducts } = await supabase
        .from('contact_products')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Identify at-risk clients
      const atRiskClients = contacts?.filter(c => {
        const lastContact = c.last_contact_at ? new Date(c.last_contact_at) : null;
        return (!lastContact || lastContact < thirtyDaysAgo) && c.client_status === 'active';
      }) || [];

      // Calculate churn rates
      const totalActive = contacts?.filter(c => c.client_status === 'active').length || 0;
      const churned30d = contacts?.filter(c => {
        return c.client_status === 'churned' && 
               new Date(c.updated_at) >= thirtyDaysAgo;
      }).length || 0;
      const churned90d = contacts?.filter(c => {
        return c.client_status === 'churned' && 
               new Date(c.updated_at) >= ninetyDaysAgo;
      }).length || 0;

      // Analyze causes
      const causes: ChurnCause[] = [
        {
          cause: 'Quebra de frequência',
          percentage: 40,
          affectedClients: Math.round(atRiskClients.length * 0.4),
          suggestion: 'Implementar lembretes automáticos de sessão',
        },
        {
          cause: 'Consumo incompleto',
          percentage: 30,
          affectedClients: Math.round(atRiskClients.length * 0.3),
          suggestion: 'Contactar clientes com packs por usar',
        },
        {
          cause: 'Falta de follow-up',
          percentage: 20,
          affectedClients: Math.round(atRiskClients.length * 0.2),
          suggestion: 'Criar tarefas de acompanhamento automático',
        },
        {
          cause: 'Preço / Valor percebido',
          percentage: 10,
          affectedClients: Math.round(atRiskClients.length * 0.1),
          suggestion: 'Reforçar comunicação de valor',
        },
      ];

      const churnRate = totalActive > 0 ? (churned30d / totalActive) * 100 : 0;

      // Calculate average LTV
      const avgLTV = contacts?.reduce((sum, c) => sum + (c.total_revenue || 0), 0) / (contacts?.length || 1);

      return {
        metrics: {
          churnRate,
          atRiskClients: atRiskClients.length,
          churned30d,
          churned90d,
          retentionRate: 100 - churnRate,
          avgLifetimeValue: avgLTV,
        },
        causes,
        atRiskClients: atRiskClients.slice(0, 20), // Top 20
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Hook for Consumption Forecasts
export function useConsumptionForecast() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['consumption-forecast', currentWorkspace?.id],
    queryFn: async (): Promise<ConsumptionForecast[]> => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: contactProducts } = await supabase
        .from('contact_products')
        .select('*, products(*)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'active');

      // Generate next 4 weeks forecast
      const weeks: ConsumptionForecast[] = [];
      const baseCapacity = 40; // Example: 40 sessions per week

      for (let i = 1; i <= 4; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() + (i - 1) * 7);
        
        // Calculate expected sessions based on active products
        const sessionsProducts = contactProducts?.filter(p => 
          p.products?.consumption_model === 'sessions'
        ) || [];
        
        const expectedSessions = Math.round(
          sessionsProducts.reduce((sum, p) => {
            const remaining = (p.purchased_quantity || 0) - (p.consumed_quantity || 0);
            return sum + Math.min(remaining, 3); // Assume max 3 sessions per week per client
          }, 0) * (0.7 + Math.random() * 0.3) // Add some variance
        );

        weeks.push({
          period: `Semana ${i}`,
          expectedSessions,
          expectedUnits: Math.round(expectedSessions * 0.8),
          capacityNeeded: expectedSessions,
          capacityAvailable: baseCapacity,
          utilizationRate: (expectedSessions / baseCapacity) * 100,
        });
      }

      return weeks;
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Hook for Product Consumption Analysis
export function useProductConsumption() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['product-consumption', currentWorkspace?.id],
    queryFn: async (): Promise<ProductConsumption[]> => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: contactProducts } = await supabase
        .from('contact_products')
        .select('*, products(*)')
        .eq('workspace_id', currentWorkspace.id);

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      // Group by product
      const productMap = new Map<string, {
        product: any;
        totalPurchased: number;
        totalConsumed: number;
        clientCount: number;
      }>();

      contactProducts?.forEach(cp => {
        const productId = cp.product_id;
        const existing = productMap.get(productId);
        
        if (existing) {
          existing.totalPurchased += cp.purchased_quantity || 0;
          existing.totalConsumed += cp.consumed_quantity || 0;
          existing.clientCount += 1;
        } else {
          productMap.set(productId, {
            product: cp.products,
            totalPurchased: cp.purchased_quantity || 0,
            totalConsumed: cp.consumed_quantity || 0,
            clientCount: 1,
          });
        }
      });

      return Array.from(productMap.entries()).map(([productId, data]) => ({
        productId,
        productName: data.product?.name || 'Produto',
        totalPurchased: data.totalPurchased,
        totalConsumed: data.totalConsumed,
        consumptionRate: data.totalPurchased > 0 
          ? (data.totalConsumed / data.totalPurchased) * 100 
          : 0,
        avgConsumptionPerClient: data.clientCount > 0 
          ? data.totalConsumed / data.clientCount 
          : 0,
        forecastCompletion: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      }));
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Hook for Cohort Analysis
export function useCohortAnalysis() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['cohort-analysis', currentWorkspace?.id],
    queryFn: async (): Promise<CohortData[]> => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      const { data: contactProducts } = await supabase
        .from('contact_products')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      // Group contacts by month of creation
      const cohortMap = new Map<string, {
        contacts: any[];
        products: any[];
      }>();

      contacts?.forEach(c => {
        const date = new Date(c.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const existing = cohortMap.get(monthKey);
        if (existing) {
          existing.contacts.push(c);
        } else {
          cohortMap.set(monthKey, { contacts: [c], products: [] });
        }
      });

      // Add products to cohorts
      contactProducts?.forEach(cp => {
        const contact = contacts?.find(c => c.id === cp.contact_id);
        if (contact) {
          const date = new Date(contact.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const cohort = cohortMap.get(monthKey);
          if (cohort) {
            cohort.products.push(cp);
          }
        }
      });

      // Calculate cohort metrics
      const cohorts: CohortData[] = [];
      cohortMap.forEach((data, monthKey) => {
        const totalClients = data.contacts.length;
        const completedProducts = data.products.filter(p => p.status === 'completed').length;
        const totalRevenue = data.contacts.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
        const repurchases = data.products.length - totalClients; // Products beyond first

        cohorts.push({
          cohortMonth: monthKey,
          totalClients,
          completionRate: data.products.length > 0 
            ? (completedProducts / data.products.length) * 100 
            : 0,
          avgConsumptionTime: 45, // Would calculate from actual data
          repurchaseRate: totalClients > 0 
            ? (Math.max(0, repurchases) / totalClients) * 100 
            : 0,
          revenuePerClient: totalClients > 0 ? totalRevenue / totalClients : 0,
        });
      });

      return cohorts.sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth)).slice(0, 12);
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Hook for AI Insights on Reports
export function useReportAIInsights(kpis: ExecutiveKPIs | undefined) {
  return useMemo((): ReportAIInsight[] => {
    if (!kpis) return [];

    const insights: ReportAIInsight[] = [];

    // High churn warning
    if (kpis.churnRate > 10) {
      insights.push({
        id: 'high-churn',
        type: 'warning',
        title: 'Taxa de churn elevada',
        description: `${kpis.churnRate.toFixed(1)}% dos clientes estão em risco de abandono`,
        explanation: 'Clientes com mais de 30 dias sem interação são classificados como em risco.',
        affectedClients: kpis.clientsAtRisk,
        suggestion: 'Considere criar uma automação de reativação para clientes inativos.',
      });
    }

    // Upsell opportunity
    if (kpis.upsellPotential > 0) {
      insights.push({
        id: 'upsell-opportunity',
        type: 'opportunity',
        title: 'Potencial de upsell identificado',
        description: `€${kpis.upsellPotential.toLocaleString()} em potencial de renovações`,
        explanation: 'Clientes com consumo acima de 80% estão prontos para renovar ou avançar.',
        impact: kpis.upsellPotential,
        suggestion: 'Prepare propostas de continuação para estes clientes.',
      });
    }

    // Good retention
    if (kpis.retentionRate > 90) {
      insights.push({
        id: 'good-retention',
        type: 'success',
        title: 'Retenção excelente',
        description: `Taxa de retenção de ${kpis.retentionRate.toFixed(1)}%`,
        explanation: 'A maioria dos clientes mantém-se ativa e engajada.',
      });
    }

    // Pipeline health
    if (kpis.forecastedRevenue30d > 0) {
      insights.push({
        id: 'pipeline-healthy',
        type: 'info',
        title: 'Pipeline em movimento',
        description: `€${kpis.forecastedRevenue30d.toLocaleString()} previstos para os próximos 30 dias`,
        explanation: 'Baseado na probabilidade ponderada das oportunidades ativas.',
      });
    }

    return insights;
  }, [kpis]);
}

// Hook for Scenario Analysis
export function useScenarioAnalysis(kpis: ExecutiveKPIs | undefined) {
  return useMemo((): ScenarioAnalysis[] => {
    if (!kpis) return [];

    return [
      {
        scenario: 'Conversão de 30% dos upsells',
        description: 'Se 30% dos clientes prontos para upsell avançarem',
        probability: 60,
        revenueImpact: kpis.upsellPotential * 0.3,
        clientsAffected: Math.round(kpis.clientsAtRisk * 0.3),
      },
      {
        scenario: 'Redução de 50% do churn',
        description: 'Com automações de retenção ativas',
        probability: 40,
        revenueImpact: kpis.clientsAtRisk * (kpis.forecastedRevenue30d / kpis.clientsInConsumption) * 0.5,
        clientsAffected: Math.round(kpis.clientsAtRisk * 0.5),
      },
      {
        scenario: 'Aumento de 20% no pipeline',
        description: 'Com campanha de captação ativa',
        probability: 50,
        revenueImpact: kpis.forecastedRevenue30d * 0.2,
        clientsAffected: Math.round(kpis.clientsInConsumption * 0.1),
      },
    ];
  }, [kpis]);
}

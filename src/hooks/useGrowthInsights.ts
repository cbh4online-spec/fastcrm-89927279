import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { emitKernelEvent } from '@/lib/kernelEmitter';
import { 
  customerRankingService,
  sellerRankingService,
  needMatchingService,
  lifecycleService
} from '@/services/growth-insights';
import type { 
  TopCustomer, 
  TopSeller, 
  NeedMatch, 
  LifecycleEvent,
  LifecycleTrigger,
  GrowthInsightsSummary,
  RankingConfig,
  AIGrowthAnalysis
} from '@/types/growth-insights';

interface UseGrowthInsightsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  customersLimit?: number;
  sellersLimit?: number;
}

export function useGrowthInsights(options: UseGrowthInsightsOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const { 
    autoRefresh = false, 
    refreshInterval = 300000,
    customersLimit = 10,
    sellersLimit = 10
  } = options;

  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [needMatches, setNeedMatches] = useState<NeedMatch[]>([]);
  const [lifecycleEvents, setLifecycleEvents] = useState<LifecycleEvent[]>([]);
  const [lifecycleTriggers, setLifecycleTriggers] = useState<LifecycleTrigger[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIGrowthAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch contacts (customers)
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, email, company, created_at')
        .eq('workspace_id', currentWorkspace.id);

      // Fetch companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, email, created_at')
        .eq('workspace_id', currentWorkspace.id);

      // Fetch opportunities
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('id, contact_id, company_id, owner_id, value, status, created_at, updated_at, title')
        .eq('workspace_id', currentWorkspace.id);

      // Fetch workspace members (sellers)
      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', currentWorkspace.id);

      // Fetch profiles for members
      const memberIds = members?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', memberIds);

      // Transform data for services
      const customersData = [
        ...(contacts?.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email || undefined,
          company: c.company || undefined,
          createdAt: c.created_at
        })) || []),
        ...(companies?.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email || undefined,
          createdAt: c.created_at
        })) || [])
      ];

      const oppsData = opportunities?.map(o => ({
        id: o.id,
        contactId: o.contact_id || undefined,
        companyId: o.company_id || undefined,
        ownerId: o.owner_id,
        value: o.value || 0,
        status: o.status,
        createdAt: o.created_at,
        closedAt: o.status === 'closed_won' || o.status === 'closed_lost' ? o.updated_at : undefined,
        products: o.title ? [o.title] : undefined
      })) || [];

      const sellersData = profiles?.map(p => ({
        id: p.user_id,
        name: p.full_name || 'Sem nome',
        email: p.email || undefined,
        avatarUrl: p.avatar_url || undefined
      })) || [];

      // Calculate rankings
      const customerConfig: RankingConfig = {
        criteria: ['total_revenue', 'purchase_frequency', 'ltv'],
        weights: {
          total_revenue: 0.4,
          recurring_revenue: 0.2,
          purchase_frequency: 0.2,
          margin: 0.1,
          ltv: 0.1,
          conversion_rate: 0,
          close_velocity: 0
        },
        period: 'year',
        limit: customersLimit
      };

      const calculatedCustomers = customerRankingService.calculateTopCustomers(
        customersData,
        oppsData,
        customerConfig
      );

      // Generate insights for each customer
      const customersWithInsights = calculatedCustomers.map(customer => ({
        ...customer,
        insights: customerRankingService.generateCustomerInsights(
          customer,
          [], // Products would come from a products table
          calculatedCustomers
        )
      }));

      const calculatedSellers = sellerRankingService.calculateTopSellers(
        sellersData,
        oppsData,
        { limit: sellersLimit }
      );

      // Generate insights for each seller
      const sellersWithInsights = calculatedSellers.map(seller => ({
        ...seller,
        insights: sellerRankingService.generateSellerInsights(seller, calculatedSellers)
      }));

      // Learn from purchase history and find matches
      const purchaseHistory = customersWithInsights.map(c => ({
        customerId: c.id,
        products: c.products
      }));
      needMatchingService.learnFromHistory(purchaseHistory);

      const matches = needMatchingService.findAllNeedMatches(
        customersWithInsights,
        [] // Products would come from a products table
      );

      // Get lifecycle triggers and evaluate
      const triggers = lifecycleService.getDefaultTriggers();
      const lastInteractions = new Map<string, Date>();
      const renewalDates = new Map<string, Date>();
      
      // Build interaction map from opportunities
      oppsData.forEach(opp => {
        if (opp.contactId) {
          const current = lastInteractions.get(opp.contactId);
          const oppDate = new Date(opp.closedAt || opp.createdAt);
          if (!current || oppDate > current) {
            lastInteractions.set(opp.contactId, oppDate);
          }
        }
      });

      const events = lifecycleService.evaluateTriggers(
        customersWithInsights,
        triggers,
        lastInteractions,
        renewalDates
      );

      setTopCustomers(customersWithInsights);
      setTopSellers(sellersWithInsights);
      setNeedMatches(matches);
      setLifecycleTriggers(triggers);
      setLifecycleEvents(events);

    } catch (err) {
      console.warn('[B2B-INTELLIGENCE] GROWTH_DATA_FAILED', (err as Error).message);
      setError('Erro ao carregar dados de crescimento');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch AI analysis
  const fetchAIAnalysis = async (context?: { customerId?: string; sellerId?: string }) => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data, error } = await supabase.functions.invoke('ai-growth-insights', {
        body: {
          workspaceId: currentWorkspace.id,
          context,
          topCustomers: topCustomers.slice(0, 5),
          topSellers: topSellers.slice(0, 5),
          needMatches: needMatches.slice(0, 10)
        }
      });

      if (error) throw error;
      setAiAnalysis(data);

      console.log('[B2B-INTELLIGENCE] INSIGHT_GENERATED confidence=' + (data?.confidenceLevel ?? 'N/A') + ' insights=' + (data?.insights?.length ?? 0) + ' recommendations=' + (data?.recommendations?.length ?? 0));
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'B2B.INSIGHT_GENERATED',
        entity_kind: 'growth_analysis',
        entity_id: currentWorkspace.id,
        source_module: 'b2b-intelligence',
        payload: {
          confidence_level: data?.confidenceLevel,
          insights_count: data?.insights?.length ?? 0,
          recommendations_count: data?.recommendations?.length ?? 0,
          customer_id: context?.customerId,
          seller_id: context?.sellerId,
        },
      });

      return data;
    } catch (err) {
      console.error('[B2B-INTELLIGENCE] AI_ANALYSIS_FAILED', (err as Error).message);
      return null;
    }
  };

  // Summary computed from current data
  const summary = useMemo<GrowthInsightsSummary>(() => ({
    topCustomersCount: topCustomers.length,
    topCustomersTotalRevenue: topCustomers.reduce((sum, c) => sum + c.totalRevenue, 0),
    topSellersCount: topSellers.length,
    pendingNeedMatches: needMatches.filter(m => m.confidence > 0.6).length,
    upcomingLifecycleEvents: lifecycleEvents.filter(e => e.status === 'pending').length,
    averageChurnRisk: topCustomers.length > 0
      ? topCustomers.filter(c => c.churnRisk === 'high' || c.churnRisk === 'critical').length / topCustomers.length
      : 0,
    insightsGenerated: topCustomers.reduce((sum, c) => sum + c.insights.length, 0) +
                       topSellers.reduce((sum, s) => sum + s.insights.length, 0)
  }), [topCustomers, topSellers, needMatches, lifecycleEvents]);

  useEffect(() => {
    fetchData();
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  return {
    // Data
    topCustomers,
    topSellers,
    needMatches,
    lifecycleEvents,
    lifecycleTriggers,
    aiAnalysis,
    summary,
    
    // State
    isLoading,
    error,
    
    // Actions
    refresh: fetchData,
    fetchAIAnalysis
  };
}

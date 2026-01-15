import { useState } from 'react';
import { useGrowthInsights } from '@/hooks/useGrowthInsights';
import { TopCustomersCard } from './TopCustomersCard';
import { TopSellersCard } from './TopSellersCard';
import { NeedMatchingPanel } from './NeedMatchingPanel';
import { LifecycleEventsCard } from './LifecycleEventsCard';
import { AIGrowthInsightsPanel } from './AIGrowthInsightsPanel';
import { GrowthInsightsSummaryCard } from './GrowthInsightsSummaryCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export function GrowthInsightsModule() {
  const {
    topCustomers,
    topSellers,
    needMatches,
    lifecycleEvents,
    lifecycleTriggers,
    aiAnalysis,
    summary,
    isLoading,
    refresh,
    fetchAIAnalysis
  } = useGrowthInsights({ autoRefresh: false });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
    toast.success('Dados atualizados');
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    await fetchAIAnalysis();
    setIsAnalyzing(false);
  };

  const handleAcceptMatch = (match: any) => {
    toast.success(`Oportunidade criada para ${match.customerName}`);
  };

  const handleExecuteEvent = (event: any) => {
    toast.success(`Ação executada: ${event.suggestion}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Insights de Crescimento
          </h1>
          <p className="text-muted-foreground">
            Identifique padrões, antecipe necessidades e impulsione vendas
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary */}
      <GrowthInsightsSummaryCard summary={summary} isLoading={isLoading} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCustomersCard customers={topCustomers} isLoading={isLoading} />
        <TopSellersCard sellers={topSellers} isLoading={isLoading} />
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NeedMatchingPanel 
          matches={needMatches} 
          isLoading={isLoading}
          onAccept={handleAcceptMatch}
        />
        <LifecycleEventsCard 
          events={lifecycleEvents}
          triggers={lifecycleTriggers}
          isLoading={isLoading}
          onExecuteEvent={handleExecuteEvent}
        />
        <AIGrowthInsightsPanel 
          analysis={aiAnalysis}
          isLoading={isAnalyzing}
          onRefresh={handleAIAnalysis}
        />
      </div>
    </div>
  );
}

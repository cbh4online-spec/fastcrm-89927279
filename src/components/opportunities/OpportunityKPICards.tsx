import { useTranslation } from "react-i18next";
import { useOpportunityKPIs } from "@/hooks/useOpportunitiesEnhanced";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  XCircle, 
  DollarSign,
  Clock,
  Percent,
  BarChart3
} from "lucide-react";

export function OpportunityKPICards() {
  const { t } = useTranslation('crm');
  const { data: kpis, isLoading } = useOpportunityKPIs();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      title: t('oppKpiPipelineValue'),
      value: formatCurrency(kpis?.totalValue || 0),
      icon: DollarSign,
      description: t('oppKpiPipelineValueDesc'),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: t('oppKpiWeightedValue'),
      value: formatCurrency(kpis?.weightedValue || 0),
      icon: Target,
      description: t('oppKpiWeightedValueDesc'),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: t('oppKpiOpenOpps'),
      value: kpis?.totalOpen?.toString() || "0",
      icon: TrendingUp,
      description: t('oppKpiOpenOppsDesc'),
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: t('oppKpiConversionRate'),
      value: `${(kpis?.conversionRate || 0).toFixed(1)}%`,
      icon: Percent,
      description: t('oppKpiConversionRateDesc'),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: t('oppKpiWon'),
      value: kpis?.totalWon?.toString() || "0",
      icon: CheckCircle2,
      description: t('oppKpiWonDesc'),
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: t('oppKpiLost'),
      value: kpis?.totalLost?.toString() || "0",
      icon: XCircle,
      description: t('oppKpiLostDesc'),
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: t('oppKpiAvgDealSize'),
      value: formatCurrency(kpis?.avgDealSize || 0),
      icon: BarChart3,
      description: t('oppKpiAvgDealSizeDesc'),
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: t('oppKpiAvgCloseTime'),
      value: `${Math.round(kpis?.avgCloseTime || 0)}d`,
      icon: Clock,
      description: t('oppKpiAvgCloseTimeDesc'),
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${card.bgColor}`}>
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground">{card.value}</div>
            <p className="text-xs text-muted-foreground truncate">{card.title}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

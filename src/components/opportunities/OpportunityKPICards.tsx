import { useTranslation } from "react-i18next";
import { useOpportunityKPIs } from "@/hooks/useOpportunitiesEnhanced";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  Percent,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export function OpportunityKPICards() {
  const { t } = useTranslation("crm");
  const { data: kpis, isLoading } = useOpportunityKPIs();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const cards: { title: string; value: string; icon: LucideIcon }[] = [
    { title: t("oppKpiPipelineValue"), value: formatCurrency(kpis?.totalValue || 0), icon: DollarSign },
    { title: t("oppKpiWeightedValue"), value: formatCurrency(kpis?.weightedValue || 0), icon: Target },
    { title: t("oppKpiOpenOpps"), value: kpis?.totalOpen?.toString() || "0", icon: TrendingUp },
    { title: t("oppKpiConversionRate"), value: `${(kpis?.conversionRate || 0).toFixed(1)}%`, icon: Percent },
    { title: t("oppKpiWon"), value: kpis?.totalWon?.toString() || "0", icon: CheckCircle2 },
    { title: t("oppKpiLost"), value: kpis?.totalLost?.toString() || "0", icon: XCircle },
    { title: t("oppKpiAvgDealSize"), value: formatCurrency(kpis?.avgDealSize || 0), icon: BarChart3 },
    { title: t("oppKpiAvgCloseTime"), value: `${Math.round(kpis?.avgCloseTime || 0)}d`, icon: Clock },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {card.title}
              </span>
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground truncate">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}

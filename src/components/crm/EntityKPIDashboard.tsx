import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Clock,
  CheckSquare,
  TrendingUp,
  DollarSign,
  Calendar,
  Megaphone,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntityKPIs, useEntityAIInsights, EntityKPIs } from "@/hooks/useEntityInsights";

interface KPIItemProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: string;
  trend?: "up" | "down" | "neutral";
  subValue?: string;
}

function KPIItem({ label, value, icon, iconColor, subValue }: KPIItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
      <div className={cn("p-2 rounded-md bg-background", iconColor)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

interface EntityKPIDashboardProps {
  entityType: "lead" | "contact";
  entityId: string | undefined;
  entityData: {
    name: string;
    status?: string;
    source?: string;
    tags?: string[];
    notes?: string;
  } | null;
}

export function EntityKPIDashboard({
  entityType,
  entityId,
  entityData,
}: EntityKPIDashboardProps) {
  const { data: kpis, isLoading: kpisLoading } = useEntityKPIs(entityType, entityId);
  const { data: insights, isLoading: insightsLoading } = useEntityAIInsights(
    entityType,
    entityId,
    entityData
  );

  if (kpisLoading) {
    return <KPIDashboardSkeleton />;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} sem`;
    return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return "€0";
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPIItem
          label="Mensagens (30d)"
          value={kpis?.messagesLast30Days || 0}
          icon={<MessageSquare className="w-4 h-4" />}
          iconColor="text-blue-600"
          subValue={`${kpis?.messagesCount || 0} total`}
        />
        <KPIItem
          label="Última Interação"
          value={formatDate(kpis?.lastInteractionDate || null)}
          icon={<Clock className="w-4 h-4" />}
          iconColor="text-amber-600"
        />
        <KPIItem
          label="Atividades Abertas"
          value={kpis?.openActivitiesCount || 0}
          icon={<CheckSquare className="w-4 h-4" />}
          iconColor="text-orange-600"
        />
        <KPIItem
          label="Oportunidades"
          value={kpis?.opportunitiesCount || 0}
          icon={<TrendingUp className="w-4 h-4" />}
          iconColor="text-emerald-600"
        />
        <KPIItem
          label="Valor em Aberto"
          value={formatCurrency(kpis?.totalOpenDealValue || 0)}
          icon={<DollarSign className="w-4 h-4" />}
          iconColor="text-teal-600"
        />
        <KPIItem
          label="Reuniões"
          value={kpis?.meetingsHeld || 0}
          icon={<Calendar className="w-4 h-4" />}
          iconColor="text-purple-600"
        />
      </div>

      {/* AI Insights Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <span>Insights IA</span>
                  {insightsLoading && (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      A analisar...
                    </Badge>
                  )}
                </h4>
              </div>

              {insights && (
                <div className="space-y-2.5">
                  {/* Summary */}
                  {insights.summary && (
                    <p className="text-sm text-muted-foreground">
                      {insights.summary}
                    </p>
                  )}

                  {/* Next Action */}
                  {insights.nextAction && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary">
                      <Lightbulb className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{insights.nextAction}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                    </div>
                  )}

                  {/* Warnings */}
                  {insights.warnings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {insights.warnings.map((warning, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-xs"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {warning}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!insights && !insightsLoading && (
                <p className="text-sm text-muted-foreground">
                  Sem dados suficientes para gerar insights
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPIDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

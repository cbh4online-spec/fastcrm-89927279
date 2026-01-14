import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Target, Briefcase, FileText, Clock, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIData {
  leadsToday: number;
  leadsWeek: number;
  leadsTrend: number;
  activeOpportunities: number;
  opportunitiesValue: number;
  opportunitiesTrend: number;
  proposalsSent: number;
  proposalsTrend: number;
  proposalsPending: number;
  revenueForecast: number;
  revenueTrend: number;
}

interface DashboardKPICardsProps {
  data: KPIData | null;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return `€${value.toFixed(0)}`;
}

function TrendIndicator({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  if (value === 0) return null;
  
  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const sizeClass = size === "sm" ? "text-xs" : "text-sm";
  
  return (
    <span className={cn(
      "flex items-center gap-0.5",
      sizeClass,
      isPositive ? "text-emerald-600" : "text-red-500"
    )}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      {Math.abs(value)}%
    </span>
  );
}

function KPICard({
  title,
  mainValue,
  subtitle,
  trend,
  icon: Icon,
  tooltip,
  accentColor = "primary",
  isLoading,
}: {
  title: string;
  mainValue: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ElementType;
  tooltip: string;
  accentColor?: "primary" | "emerald" | "amber" | "blue";
  isLoading?: boolean;
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    blue: "bg-blue-500/10 text-blue-600",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="hover:shadow-md transition-all cursor-help group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-lg", colorClasses[accentColor])}>
                  <Icon className="h-4 w-4" />
                </div>
                <Info className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{mainValue}</span>
                    {trend !== undefined && <TrendIndicator value={trend} />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{title}</p>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DashboardKPICards({ data, isLoading }: DashboardKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <KPICard
        title="Leads"
        mainValue={data?.leadsToday ?? 0}
        subtitle={`${data?.leadsWeek ?? 0} esta semana`}
        trend={data?.leadsTrend}
        icon={Target}
        tooltip="Novos leads captados hoje e nos últimos 7 dias. Um aumento indica maior interesse no seu negócio."
        accentColor="emerald"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Oportunidades Ativas"
        mainValue={data?.activeOpportunities ?? 0}
        subtitle={formatCurrency(data?.opportunitiesValue ?? 0)}
        trend={data?.opportunitiesTrend}
        icon={Briefcase}
        tooltip="Oportunidades em progresso no pipeline. O valor representa o potencial total de receita."
        accentColor="blue"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Propostas Enviadas"
        mainValue={data?.proposalsSent ?? 0}
        trend={data?.proposalsTrend}
        icon={FileText}
        tooltip="Total de propostas enviadas este mês. Compare com meses anteriores para avaliar a atividade comercial."
        accentColor="primary"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Propostas Pendentes"
        mainValue={data?.proposalsPending ?? 0}
        icon={Clock}
        tooltip="Propostas aguardando resposta do cliente. Propostas antigas podem precisar de follow-up."
        accentColor="amber"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Previsão de Receita"
        mainValue={formatCurrency(data?.revenueForecast ?? 0)}
        trend={data?.revenueTrend}
        icon={TrendingUp}
        tooltip="Receita prevista baseada nas oportunidades ponderadas pela probabilidade de fecho."
        accentColor="emerald"
        isLoading={isLoading}
      />
    </div>
  );
}

export type { KPIData };

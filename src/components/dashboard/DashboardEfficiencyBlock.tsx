import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Users, Zap, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EfficiencyMetrics } from "@/hooks/useOperationalDashboard";

interface DashboardEfficiencyBlockProps {
  data: EfficiencyMetrics | null;
  isLoading: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  highlight?: boolean;
}

function MetricCard({ title, value, icon: Icon, description, highlight }: MetricCardProps) {
  return (
    <div className={cn(
      "p-3 rounded-lg border bg-card",
      highlight && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", highlight ? "text-amber-600" : "text-muted-foreground")} />
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <p className={cn("text-xl font-bold", highlight && "text-amber-600")}>{value}</p>
      {description && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

export function DashboardEfficiencyBlock({ data, isLoading }: DashboardEfficiencyBlockProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Eficiência (PARE)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Eficiência (PARE)
        </CardTitle>
        <CardDescription className="text-xs">
          Eficiência operacional em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="Tempo Médio de Resposta"
            value={data?.avgResponseTimeHours ? `${data.avgResponseTimeHours}h` : "—"}
            icon={Clock}
            description="Média de resposta a clientes"
          />
          <MetricCard
            title="Leads sem Follow-up"
            value={data?.leadsWithoutFollowup ?? 0}
            icon={Users}
            highlight={(data?.leadsWithoutFollowup ?? 0) > 0}
            description="Aguardam contacto há +24h"
          />
          <MetricCard
            title="Automações Ativas"
            value={data?.activeAutomations ?? 0}
            icon={Zap}
            description="Processos automatizados"
          />
          <MetricCard
            title="Tempo Poupado"
            value={data?.estimatedTimeSavedHours ? `~${data.estimatedTimeSavedHours}h` : "—"}
            icon={Timer}
            description="Estimativa semanal com automações"
          />
        </div>
      </CardContent>
    </Card>
  );
}

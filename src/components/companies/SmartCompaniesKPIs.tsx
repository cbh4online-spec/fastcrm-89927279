import { useCompaniesKPIs } from "@/hooks/useSmartCompanies";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Flame, 
  Clock, 
  TrendingUp,
  Euro,
  Users,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: boolean;
  description?: string;
}

function KPICard({ title, value, icon, highlight, description }: KPICardProps) {
  return (
    <Card className={cn(
      "p-4 flex items-center gap-3 transition-all hover:shadow-md",
      highlight && "border-destructive/50 bg-destructive/5"
    )}>
      <div className={cn(
        "p-2.5 rounded-lg",
        highlight ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{title}</p>
        <p className={cn(
          "text-xl font-bold",
          highlight && "text-destructive"
        )}>
          {value}
        </p>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </Card>
  );
}

export function SmartCompaniesKPIs() {
  const { data: kpis, isLoading } = useCompaniesKPIs();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KPICard
        title="Total Empresas"
        value={kpis.totalCompanies}
        icon={<Building2 className="w-4 h-4" />}
        description="Base de empresas"
      />
      <KPICard
        title="Empresas Quentes"
        value={kpis.hotCompanies}
        icon={<Flame className="w-4 h-4" />}
        highlight={kpis.hotCompanies > 0}
        description="Prontas para ação"
      />
      <KPICard
        title="Sem Resposta >24h"
        value={kpis.noResponseOver24h}
        icon={<Clock className="w-4 h-4" />}
        highlight={kpis.noResponseOver24h > 0}
        description="Precisam de atenção"
      />
      <KPICard
        title="Clientes"
        value={kpis.clients}
        icon={<Users className="w-4 h-4" />}
        description="Empresas ativas"
      />
      <KPICard
        title="Prospects"
        value={kpis.prospects}
        icon={<Briefcase className="w-4 h-4" />}
        description="Oportunidades"
      />
      <KPICard
        title="Pipeline"
        value={formatCurrency(kpis.totalPipelineValue)}
        icon={<Euro className="w-4 h-4" />}
        description="Valor estimado"
      />
    </div>
  );
}

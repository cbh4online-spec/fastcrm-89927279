import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Flame, 
  MessageSquareWarning, 
  Target, 
  Euro,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperationalKPIs } from "@/hooks/useOperationalDashboard";

interface OperationalKPICardsProps {
  data: OperationalKPIs | null;
  isLoading: boolean;
}

interface KPICardProps {
  title: string;
  value: number | string;
  microcopy: string;
  icon: React.ElementType;
  highlight?: boolean;
  route: string;
  accentColor?: "default" | "destructive" | "warning" | "success";
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

function KPICard({ title, value, microcopy, icon: Icon, highlight, route, accentColor = "default" }: KPICardProps) {
  const navigate = useNavigate();
  
  const colorStyles = {
    default: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-amber-500/10 text-amber-600",
    success: "bg-emerald-500/10 text-emerald-600",
  };

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md group",
        highlight && "border-destructive/50 bg-destructive/5"
      )}
      onClick={() => navigate(route)}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-lg", colorStyles[accentColor])}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-3">
        <p className={cn("text-3xl font-bold", highlight && "text-destructive")}>{value}</p>
        <p className="text-sm font-medium text-foreground mt-1">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{microcopy}</p>
      </div>
    </Card>
  );
}

export function OperationalKPICards({ data, isLoading }: OperationalKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <KPICard
        title="Leads Hoje"
        value={data?.leadsToday ?? 0}
        microcopy="Novos contactos nas últimas 24h"
        icon={Users}
        route="/dashboard/leads?filter=today"
        accentColor="default"
      />
      <KPICard
        title="Leads Quentes 🔥"
        value={data?.hotLeads ?? 0}
        microcopy="Leads com alta intenção de compra"
        icon={Flame}
        route="/dashboard/leads?filter=hot"
        highlight={(data?.hotLeads ?? 0) > 0}
        accentColor="destructive"
      />
      <KPICard
        title="Sem Resposta"
        value={data?.conversationsWithoutResponse ?? 0}
        microcopy="Mensagens que precisam de atenção"
        icon={MessageSquareWarning}
        route="/dashboard/inbox"
        highlight={(data?.conversationsWithoutResponse ?? 0) > 0}
        accentColor="warning"
      />
      <KPICard
        title="Oportunidades"
        value={data?.activeOpportunities ?? 0}
        microcopy="Negócios em curso no pipeline"
        icon={Target}
        route="/dashboard/opportunities"
        accentColor="default"
      />
      <KPICard
        title="Receita Prevista"
        value={formatCurrency(data?.forecastedRevenue ?? 0)}
        microcopy="Valor estimado das oportunidades"
        icon={Euro}
        route="/dashboard/opportunities"
        accentColor="success"
      />
    </div>
  );
}

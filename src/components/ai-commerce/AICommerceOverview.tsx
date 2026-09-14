import { useMemo } from "react";
import { BadgeCheck, Boxes, CircleAlert, Euro, Radio, Rss, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAICommerceAnalytics, useAICommerceOverview } from "@/hooks/useAICommerce";

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function AICommerceOverview() {
  const { overview, isLoading } = useAICommerceOverview();
  const analytics = useAICommerceAnalytics({ days: 30 });

  const ai = useMemo(() => {
    const rows = (analytics.data || []).filter((r) => r.isAi);
    return {
      visits: rows.reduce((s, r) => s + r.visits, 0),
      leads: rows.reduce((s, r) => s + r.leads, 0),
      purchases: rows.reduce((s, r) => s + r.purchases, 0),
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
    };
  }, [analytics.data]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Produtos" value={overview.totalProducts} icon={Boxes} />
        <Kpi
          label="AI-ready"
          value={overview.aiReady}
          icon={BadgeCheck}
          hint={`${overview.aiEnabled} com AI Commerce ativo`}
        />
        <Kpi label="Com erros" value={overview.withErrors} icon={CircleAlert} />
        <Kpi label="Incompletos" value={overview.incomplete} icon={CircleAlert} />
        <Kpi label="Canais ativos" value={overview.activeChannels} icon={Radio} />
        <Kpi label="Feeds ativos" value={overview.activeFeeds} icon={Rss} />
        <Kpi label="Score médio" value={`${overview.avgScore}/100`} icon={TrendingUp} />
        <Kpi label="Visitas de IA (30d)" value={ai.visits} icon={Users} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Leads de IA (30d)" value={ai.leads} icon={Users} />
        <Kpi label="Vendas de IA (30d)" value={ai.purchases} icon={BadgeCheck} />
        <Kpi
          label="Receita de IA (30d)"
          value={ai.revenue.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
          icon={Euro}
        />
      </div>
    </div>
  );
}

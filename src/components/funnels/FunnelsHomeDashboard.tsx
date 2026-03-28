import { Eye, Target, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAllVerticalKPIs } from "@/hooks/useVerticalLandingAnalytics";
import { useFunnels } from "@/hooks/useFunnels";
import { useFunnelInstances } from "@/hooks/useFunnelInstances";

interface AggregatedKPI {
  label: string;
  value: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  trend?: { direction: "up" | "down" | "stable"; value: number };
}

export function FunnelsHomeDashboard() {
  const { data: kpis } = useAllVerticalKPIs();
  const { data: funnels } = useFunnels();
  const { data: instances = [] } = useFunnelInstances();

  // Aggregate across all funnels
  let totalViews = 0;
  let totalSubmissions = 0;

  if (kpis) {
    for (const k of Object.values(kpis)) {
      totalViews += k.views;
      totalSubmissions += k.submissions;
    }
  }

  const avgConversion = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0;
  const totalFunnels = (funnels?.length || 0) + instances.length;
  const publishedCount = (funnels?.filter(f => f.is_published).length || 0) +
    instances.filter(f => f.status === "published").length;

  const cards: AggregatedKPI[] = [
    {
      label: "Total Views",
      value: totalViews.toLocaleString(),
      icon: Eye,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Leads Captados",
      value: totalSubmissions.toLocaleString(),
      icon: Users,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: "Conversão Média",
      value: `${avgConversion.toFixed(1)}%`,
      icon: Target,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      label: "Funis Activos",
      value: `${publishedCount}/${totalFunnels}`,
      icon: TrendingUp,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function FunnelPerformanceRanking() {
  const { data: kpis } = useAllVerticalKPIs();

  if (!kpis) return null;

  const ranked = Object.values(kpis)
    .filter(k => k.views > 0)
    .sort((a, b) => b.conversionRate - a.conversionRate);

  if (ranked.length === 0) return null;

  const top3 = ranked.slice(0, 3);
  const worst3 = ranked.length > 3 ? ranked.slice(-3).reverse() : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Performers */}
      <Card className="border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold">Top Performers</span>
          </div>
          <div className="space-y-2">
            {top3.map((k, i) => (
              <div key={k.slug} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-500 w-5">{i + 1}.</span>
                  <span className="truncate max-w-[140px]">/{k.slug}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{k.views} views</span>
                  <span className="font-semibold text-emerald-500">{k.conversionRate.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Needs Attention */}
      {worst3.length > 0 && (
        <Card className="border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownRight className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">Precisam de Atenção</span>
            </div>
            <div className="space-y-2">
              {worst3.map((k, i) => (
                <div key={k.slug} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-500 w-5">{i + 1}.</span>
                    <span className="truncate max-w-[140px]">/{k.slug}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{k.views} views</span>
                    <span className="font-semibold text-amber-500">{k.conversionRate.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

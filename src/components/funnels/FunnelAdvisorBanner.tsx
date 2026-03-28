import { useState } from "react";
import { Brain, X, AlertTriangle, Lightbulb, TrendingUp, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAllVerticalKPIs } from "@/hooks/useVerticalLandingAnalytics";
import { useFunnels } from "@/hooks/useFunnels";

interface Advice {
  icon: "warning" | "opportunity" | "growth";
  text: string;
}

const ICONS = {
  warning: AlertTriangle,
  opportunity: Lightbulb,
  growth: TrendingUp,
};
const COLORS = {
  warning: "text-amber-400",
  opportunity: "text-emerald-400",
  growth: "text-blue-400",
};

export function FunnelAdvisorBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: kpis } = useAllVerticalKPIs();
  const { data: funnels } = useFunnels();

  if (dismissed) return null;

  const advices: Advice[] = [];

  // No published funnels
  const publishedCount = funnels?.filter(f => f.is_published).length || 0;
  if (publishedCount === 0 && (funnels?.length || 0) > 0) {
    advices.push({
      icon: "warning",
      text: "Nenhum funil publicado — publica o primeiro para começar a captar leads.",
    });
  }

  if (kpis) {
    const allKpis = Object.values(kpis);

    // High bounce (low conversion)
    for (const k of allKpis) {
      if (k.views > 20 && k.conversionRate < 2) {
        advices.push({
          icon: "warning",
          text: `O funil /${k.slug} tem ${k.views} views mas apenas ${k.conversionRate.toFixed(1)}% de conversão — otimiza o headline e CTA.`,
        });
        break;
      }
    }

    // Good performer — scale it
    for (const k of allKpis) {
      if (k.conversionRate > 5 && k.views > 10) {
        advices.push({
          icon: "growth",
          text: `O funil /${k.slug} tem ${k.conversionRate.toFixed(1)}% de conversão — está acima da média. Investe em tráfego para escalar.`,
        });
        break;
      }
    }

    // No traffic
    const noTraffic = allKpis.filter(k => k.views === 0);
    if (noTraffic.length > 0) {
      advices.push({
        icon: "opportunity",
        text: `${noTraffic.length} funil(is) sem tráfego. Partilha os links ou ativa campanhas.`,
      });
    }
  }

  if (advices.length === 0) {
    // Generic tip
    advices.push({
      icon: "opportunity",
      text: "Cria um funil com IA para começares a captar leads automaticamente.",
    });
  }

  return (
    <Card className="border-l-4 border-l-primary border-border/50 bg-card/80">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Recomendações IA</span>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Auto</Badge>
            </div>
            {advices.slice(0, 3).map((a, i) => {
              const Icon = ICONS[a.icon];
              return (
                <div key={i} className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${COLORS[a.icon]}`} />
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.text}</p>
                </div>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setDismissed(true)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

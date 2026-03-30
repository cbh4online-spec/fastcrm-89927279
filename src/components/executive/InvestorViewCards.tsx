import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Gauge, AlertTriangle, Rocket, BarChart3 } from "lucide-react";

interface Props {
  snapshot: any;
}

export function InvestorViewCards({ snapshot }: Props) {
  if (!snapshot) return null;

  const revenueActual = Number(snapshot.revenue_actual) || 0;
  const revenueTarget = Number(snapshot.revenue_target) || 1;
  const growthPct = revenueTarget > 0 ? Math.round((revenueActual / revenueTarget) * 100) : 0;

  const cards = [
    {
      icon: TrendingUp,
      title: "Crescimento vs Meta",
      value: `${growthPct}%`,
      desc: `${revenueActual.toLocaleString("pt-PT")}€ de ${revenueTarget.toLocaleString("pt-PT")}€`,
      color: growthPct >= 80 ? "text-green-600" : growthPct >= 50 ? "text-yellow-600" : "text-destructive",
    },
    {
      icon: BarChart3,
      title: "Previsibilidade",
      value: `${Math.round((snapshot.confidence || 0.5) * 100)}%`,
      desc: "Confiança do forecast",
      color: (snapshot.confidence || 0.5) >= 0.7 ? "text-green-600" : "text-yellow-600",
    },
    {
      icon: Gauge,
      title: "Eficiência Operacional",
      value: `${snapshot.execution_health || 50}/100`,
      desc: "Saúde de execução",
      color: (snapshot.execution_health || 50) >= 70 ? "text-green-600" : (snapshot.execution_health || 50) >= 50 ? "text-yellow-600" : "text-destructive",
    },
    {
      icon: AlertTriangle,
      title: "Risco de Execução",
      value: snapshot.risk_level || "medium",
      desc: "Nível de risco atual",
      color: snapshot.risk_level === "low" ? "text-green-600" : snapshot.risk_level === "high" || snapshot.risk_level === "critical" ? "text-destructive" : "text-yellow-600",
    },
    {
      icon: Rocket,
      title: "Readiness to Scale",
      value: `${Math.round(((snapshot.strategic_health || 50) + (snapshot.context_health || 50)) / 2)}/100`,
      desc: "Saúde estratégica + contexto",
      color: ((snapshot.strategic_health || 50) + (snapshot.context_health || 50)) / 2 >= 70 ? "text-green-600" : "text-yellow-600",
    },
    {
      icon: Shield,
      title: "Confiança do Forecast",
      value: `${Math.round((snapshot.confidence || 0.5) * 100)}%`,
      desc: "Grau de confiança dos dados",
      color: (snapshot.confidence || 0.5) >= 0.7 ? "text-green-600" : "text-yellow-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <c.icon className="h-4 w-4 text-muted-foreground" />
              {c.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

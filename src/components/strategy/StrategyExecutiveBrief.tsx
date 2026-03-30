import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Target, Lightbulb, ShieldAlert } from "lucide-react";

interface Props {
  snapshot: any;
  recommendations: any[];
}

const growthModeLabels: Record<string, string> = {
  acquisition: "Aquisição",
  conversion: "Conversão",
  retention: "Retenção",
  recovery: "Recuperação",
  stabilization: "Estabilização",
};

const bottleneckLabels: Record<string, string> = {
  lead_generation: "Geração de Leads",
  follow_up: "Follow-up",
  conversion: "Conversão",
  delivery: "Entrega",
  context_gap: "Lacuna de Contexto",
  execution_overload: "Sobrecarga de Execução",
  retention_risk: "Risco de Retenção",
};

export default function StrategyExecutiveBrief({ snapshot, recommendations }: Props) {
  if (!snapshot) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Sem dados estratégicos. Clique em "Atualizar Estratégia" para gerar.
        </CardContent>
      </Card>
    );
  }

  const highPriorityRecs = recommendations.filter((r) => r.priority === "high" && r.status === "pending");
  const leveragePoints = (snapshot.top_leverage_points ?? []) as string[];
  const constraints = (snapshot.top_constraints ?? []) as string[];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-primary" />
          Briefing Estratégico Executivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Growth focus */}
        <div className="flex items-start gap-3">
          <Target className="h-4 w-4 mt-1 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">Foco Recomendado</p>
            <p className="text-sm text-muted-foreground">{snapshot.strategic_focus || "—"}</p>
            <Badge variant="outline" className="mt-1">
              {growthModeLabels[snapshot.growth_mode] ?? snapshot.growth_mode}
            </Badge>
          </div>
        </div>

        {/* Constraint */}
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 mt-1 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium">Principal Gargalo</p>
            <p className="text-sm text-muted-foreground">
              {bottleneckLabels[snapshot.bottleneck_type] ?? snapshot.bottleneck_type}
              {snapshot.primary_constraint ? ` — ${snapshot.primary_constraint}` : ""}
            </p>
          </div>
        </div>

        {/* Leverage */}
        {leveragePoints.length > 0 && (
          <div className="flex items-start gap-3">
            <TrendingUp className="h-4 w-4 mt-1 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Maior Alavanca</p>
              <p className="text-sm text-muted-foreground">{leveragePoints[0]}</p>
            </div>
          </div>
        )}

        {/* Risk */}
        {snapshot.main_revenue_risk && (
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 mt-1 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Risco Estratégico</p>
              <p className="text-sm text-muted-foreground">{snapshot.main_revenue_risk}</p>
            </div>
          </div>
        )}

        {/* High priority recommendations */}
        {highPriorityRecs.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Ações Prioritárias ({highPriorityRecs.length})</p>
            <ul className="space-y-1">
              {highPriorityRecs.slice(0, 3).map((r) => (
                <li key={r.id} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                  {r.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence */}
        <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Confiança: {Math.round((snapshot.confidence ?? 0.5) * 100)}%</span>
          <span>
            Alinhamento Contexto: {snapshot.context_alignment_score ?? 50}% | Execução: {snapshot.execution_alignment_score ?? 50}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

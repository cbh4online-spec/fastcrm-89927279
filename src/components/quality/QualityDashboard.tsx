import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { useConversationQualityReviews } from "@/hooks/useConversationQuality";

export function QualityDashboard() {
  const { data: reviews = [], isLoading } = useConversationQualityReviews({ limit: 100 });

  const total = reviews.length;
  const avg = (key: keyof typeof reviews[0]) => {
    const xs = reviews.map((r) => r[key] as number).filter((v) => typeof v === "number");
    return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
  };
  const avgScore = avg("overall_score");
  const risks = reviews.filter((r) => (r.compliance_risk_score ?? 0) >= 50).length;
  const lowScores = reviews.filter((r) => (r.overall_score ?? 0) < 60).length;

  const objectionCounts: Record<string, number> = {};
  reviews.forEach((r) => {
    (r.objections_detected ?? []).forEach((o) => {
      objectionCounts[o.objection_type] = (objectionCounts[o.objection_type] ?? 0) + 1;
    });
  });
  const topObjections = Object.entries(objectionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> Qualidade da Conversa
        </h2>
        <p className="text-sm text-muted-foreground">
          Análises construtivas para apoiar a melhoria contínua. Não substitui julgamento humano.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Análises" value={String(total)} hint="conversas + tickets" />
        <Kpi label="Score médio" value={String(avgScore)} hint="0-100" color={avgScore >= 70 ? "emerald" : avgScore >= 50 ? "amber" : "rose"} />
        <Kpi label="Score baixo" value={String(lowScores)} hint="< 60 pontos" />
        <Kpi label="Sinais de risco" value={String(risks)} hint="análises com risco ≥ 50" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" /> Médias por dimensão
          </div>
          <div className="space-y-2">
            {[
              ["Clareza", avg("clarity_score")],
              ["Empatia", avg("empathy_score")],
              ["Comercial", avg("commercial_score")],
              ["Resolução", avg("resolution_score")],
              ["Follow-up", avg("followup_score")],
              ["Objeções", avg("objection_handling_score")],
              ["Profissionalismo", avg("professionalism_score")],
            ].map(([label, val]) => (
              <div key={label as string}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span>{label}</span><span className="font-semibold">{val as number}</span>
                </div>
                <Progress value={val as number} className="h-1" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Objeções mais frequentes
          </div>
          {topObjections.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem objeções detetadas ainda.</div>
          ) : (
            <div className="space-y-2">
              {topObjections.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{type}</Badge>
                  <span className="font-semibold">×{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Análises recentes</div>
        {isLoading && <div className="text-sm text-muted-foreground">A carregar…</div>}
        {!isLoading && reviews.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
            Ainda não existem análises de qualidade. Comece por analisar uma conversa ou ticket.
          </div>
        )}
        <div className="space-y-1.5">
          {reviews.slice(0, 10).map((r) => (
            <div key={r.id} className="flex items-center justify-between border rounded p-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{r.review_type}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-PT")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={(r.overall_score ?? 0) >= 70 ? "default" : "secondary"}>
                  {Math.round(r.overall_score ?? 0)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground italic text-center">
        Esta análise é uma sugestão IA. Apoio à melhoria, não avaliação isolada.
      </p>
    </div>
  );
}

function Kpi({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: "emerald" | "amber" | "rose" }) {
  const cls = color === "emerald" ? "text-emerald-600" : color === "amber" ? "text-amber-600" : color === "rose" ? "text-rose-600" : "";
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

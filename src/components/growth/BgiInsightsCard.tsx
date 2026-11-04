import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import type { IndicatorDefinition } from "@/lib/bgi/indicatorCatalog";
import { useBgiInsights } from "@/hooks/useBgiInsights";
import type { BgiPeriod } from "@/hooks/useBgiIndicators";

const SECTIONS = [
  { key: "highlights", title: "Destaques" },
  { key: "alerts", title: "Alertas" },
  { key: "objectives_at_risk", title: "Objetivos em risco" },
  { key: "actions", title: "Ações recomendadas" },
] as const;

export function BgiInsightsCard({ period, periodStart, anchor, indicators, canManage }: {
  period: BgiPeriod; periodStart: string; anchor: string | null; indicators: IndicatorDefinition[]; canManage: boolean;
}) {
  const { data, isLoading, error, generate } = useBgiInsights(period, periodStart, anchor);
  const names = new Map(indicators.map((i) => [i.id, i.name]));

  const run = () => generate.mutate(undefined, {
    onSuccess: (r) => toast.success(`Análise gerada. Restam ${r.remaining} hoje.`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao gerar"),
  });

  return (
    <IXCard title="Análise IA">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {data ? `Gerada em ${new Date(data.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}` : "Leitura executiva dos indicadores do período."}
          </p>
          {canManage && (
            <Button size="sm" variant={data ? "outline" : "default"} onClick={run} disabled={generate.isPending}>
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {data ? "Atualizar análise" : "Gerar análise"}
            </Button>
          )}
        </div>
        {generate.isPending && <p className="text-sm text-muted-foreground">A analisar os indicadores…</p>}
        {generate.error && <p role="alert" className="text-sm text-destructive">{(generate.error as Error).message}</p>}
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />}
        {error && <p className="text-sm text-destructive">Não foi possível carregar a análise.</p>}
        {!isLoading && !data && !error && (
          <p className="text-sm text-muted-foreground">{canManage ? "Ainda não há análise para este período. Gere a primeira (máximo 3 por dia)." : "Ainda não há análise para este período."}</p>
        )}
        {data && (
          <>
            <p className="text-sm text-foreground leading-relaxed">{data.content.summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {SECTIONS.map((s) => data.content[s.key].length > 0 && (
                <div key={s.key} className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.title}</p>
                  <ul className="space-y-1.5">
                    {data.content[s.key].map((x, n) => (
                      <li key={n} className="text-sm text-foreground">
                        {x.text} <span className="text-xs text-muted-foreground">· {names.get(x.indicator_id) ?? x.indicator_id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Gerado por IA a partir dos indicadores do período; confirme antes de decidir.</p>
          </>
        )}
      </div>
    </IXCard>
  );
}

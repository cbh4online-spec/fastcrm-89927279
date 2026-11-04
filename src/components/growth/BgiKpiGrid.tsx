import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveWorkspaceIndicators, type BusinessTemplateId, type IndicatorDefinition } from "@/lib/bgi/indicatorCatalog";
import { computeDelta, formatIndicatorValue, isSupportedFormula } from "@/lib/bgi/formatIndicator";
import { useBgiIndicators, type BgiPeriod } from "@/hooks/useBgiIndicators";

type Choice = "this_month" | "last_month" | "quarter" | "year";
const CHOICES: { key: Choice; label: string }[] = [
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês anterior" },
  { key: "quarter", label: "Trimestre" },
  { key: "year", label: "Ano" },
];
const KIND_LABEL: Record<string, string> = { invoiced: "Faturado", received: "Recebido", pipeline: "Pipeline", forecast: "Previsão" };
const GROUPS: { title: string; match: (i: IndicatorDefinition) => boolean }[] = [
  { title: "Faturação", match: (i) => i.source === "invoices" || i.source === "invoice_payments" || i.source === "subscriptions" },
  { title: "Comercial", match: (i) => i.source === "leads" || i.source === "opportunities" },
  { title: "Operação e setor", match: () => true },
];

function lisbonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}
function resolve(choice: Choice): { period: BgiPeriod; anchor: string | null } {
  if (choice === "last_month") {
    const [y, m] = lisbonToday().split("-").map(Number);
    const py = m === 1 ? y - 1 : y; const pm = m === 1 ? 12 : m - 1;
    return { period: "month", anchor: `${py}-${String(pm).padStart(2, "0")}-01` };
  }
  return { period: choice === "quarter" ? "quarter" : choice === "year" ? "year" : "month", anchor: null };
}

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">{label}: —</span>;
  const cls = value > 0 ? "text-primary" : value < 0 ? "text-destructive" : "text-muted-foreground";
  return <span className={`text-xs ${cls}`}>{label}: {value > 0 ? "+" : ""}{value.toLocaleString("pt-PT")}%</span>;
}

export function BgiKpiGrid({ templateIds }: { templateIds: BusinessTemplateId[] }) {
  const [choice, setChoice] = useState<Choice>("this_month");
  const { period, anchor } = resolve(choice);
  const indicators = useMemo(() => resolveWorkspaceIndicators(templateIds) ?? [], [templateIds]);
  const { data, isLoading, error } = useBgiIndicators(period, anchor, indicators.length > 0);

  const grouped = useMemo(() => {
    const used = new Set<string>();
    return GROUPS.map((g) => {
      const items = indicators.filter((i) => !used.has(i.id) && g.match(i));
      items.forEach((i) => used.add(i.id));
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [indicators]);

  if (indicators.length === 0) {
    return <IXCard><p className="text-sm text-muted-foreground">Guarde pelo menos um modelo de negócio para ver os indicadores.</p></IXCard>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {CHOICES.map((c) => (
          <Button key={c.key} size="sm" variant={choice === c.key ? "default" : "outline"} className="rounded-full"
            aria-pressed={choice === c.key} onClick={() => setChoice(c.key)}>{c.label}</Button>
        ))}
        {data && <span className="self-center text-xs text-muted-foreground">{data.start} a {data.end} (exclusive)</span>}
      </div>

      {isLoading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />}
      {error && <IXCard><p className="text-sm text-destructive">Não foi possível calcular os indicadores: {(error as Error).message}</p></IXCard>}

      {data && grouped.map((g) => (
        <IXCard key={g.title} title={g.title}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {g.items.map((i) => {
              const supported = isSupportedFormula(i.formula);
              const cur = supported ? data.current?.[i.formula] ?? null : null;
              return (
                <div key={i.id} className="rounded-xl border border-border p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{i.name}</p>
                    {i.kind && KIND_LABEL[i.kind] && <Badge variant="outline" className="text-[10px]">{KIND_LABEL[i.kind]}</Badge>}
                  </div>
                  {supported ? (
                    <>
                      <p className="text-2xl font-bold text-foreground">{formatIndicatorValue(cur, i.unit)}</p>
                      <div className="flex flex-col">
                        <Delta value={computeDelta(cur, data.previous?.[i.formula])} label="vs período anterior" />
                        <Delta value={computeDelta(cur, data.yoy?.[i.formula])} label="vs ano anterior" />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground pt-2">Em breve</p>
                  )}
                </div>
              );
            })}
          </div>
        </IXCard>
      ))}
    </div>
  );
}

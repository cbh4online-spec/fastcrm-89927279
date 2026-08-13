import { Skeleton } from "@/components/ui/skeleton";
import { IXCard } from "@/components/entity/ix/IXCard";
import { formatEur } from "../lib/collectionsFormat";
import { useCollectionsKPIs } from "../hooks/useCollectionsKPIs";

export function CollectionsKPIStrip() {
  const { data, isLoading, error } = useCollectionsKPIs();

  if (error) return null;

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const kpis = [
    { label: "Em dívida", value: formatEur(data.totalOpen), hint: `${data.casesOpen} casos abertos` },
    { label: "Recuperado (30d)", value: formatEur(data.recovered30d), hint: "Pagamentos registados" },
    { label: "Atraso médio", value: `${data.avgOverdueDays} dias`, hint: "Casos em aberto" },
    {
      label: "Comunicações (30d)",
      value: String(data.actionsSent30d),
      hint: data.actionsFailed30d ? `${data.actionsFailed30d} falhadas` : "Sem falhas",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <IXCard key={k.label} contentClassName="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{k.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{k.hint}</p>
          </IXCard>
        ))}
      </div>

      <IXCard contentClassName="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Antiguidade da dívida
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {data.aging.map((b) => {
            const pct = data.totalOpen > 0 ? (b.amount / data.totalOpen) * 100 : 0;
            return (
              <div key={b.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{b.label}</span>
                  <span className="text-xs text-muted-foreground">{b.count}</span>
                </div>
                <p className="text-sm font-semibold">{formatEur(b.amount)}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </IXCard>
    </div>
  );
}

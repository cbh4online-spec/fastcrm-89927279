import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBgiCustomerBehavior } from "@/hooks/useBgiExecutiveDiagnostics";
import {
  TICKET_LABEL, dormantRisk, entityPath, isOverdueVsHabit, smallTicketRisk, type RiskLevel,
} from "@/lib/bgi/executiveDiagnostics";

const eur = (v: number | null) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);
const date = (d: string) => new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon" }).format(new Date(`${d}T12:00:00Z`));
const RISK: Record<RiskLevel, { label: string; variant: "outline" | "secondary" | "destructive" }> = {
  ok: { label: "Saudável", variant: "outline" }, warning: { label: "Atenção", variant: "secondary" }, critical: { label: "Crítico", variant: "destructive" },
};
const RiskBadge = ({ level }: { level: RiskLevel }) => <Badge variant={RISK[level].variant}>{RISK[level].label}</Badge>;

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-1">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function BgiCustomerBehavior({ start, end, totalNet }: { start: string; end: string; totalNet: number }) {
  const { data, isLoading, error, refetch } = useBgiCustomerBehavior(start, end);

  if (isLoading) return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> A analisar comportamento de compra…
    </div>
  );
  if (error || !data) return (
    <IXCard>
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-destructive">Não foi possível analisar o comportamento de compra.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    </IXCard>
  );

  const maxBucket = Math.max(1, ...data.tickets.buckets.map((b) => b.count));

  return (
    <>
      <IXCard title="Clientes que deixaram de comprar" description="Clientes com 2 ou mais compras nos últimos 2 anos e sem faturas há mais de 60 dias."
        actions={<RiskBadge level={dormantRisk(data.dormant.value_at_risk, totalNet)} />}>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Clientes parados" value={String(data.dormant.count)} />
            <Kpi label="61–90 dias" value={String(data.dormant.d61_90)} />
            <Kpi label="91–180 dias" value={String(data.dormant.d91_180)} />
            <Kpi label="Mais de 180 dias" value={String(data.dormant.d180_plus)} />
            <Kpi label="Valor anual em risco" value={eur(data.dormant.value_at_risk)} hint="Faturação dos 12 meses até à última compra" />
          </div>
          <p className="text-sm text-muted-foreground">
            Clientes habituais: {data.frequency.recurring_customers}. Intervalo típico entre compras: {data.frequency.median_gap_days != null ? `${data.frequency.median_gap_days} dias` : "—"}.
          </p>
          {data.dormant.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente habitual parado. Bom sinal.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-2 pr-3">Cliente</th><th className="py-2 pr-3">Última compra</th><th className="py-2 pr-3 text-right">Parado há</th><th className="py-2 pr-3 text-right">Costuma comprar a cada</th><th className="py-2 text-right">Valor anual</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.dormant.top.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-3"><Link className="text-primary hover:underline" to={entityPath(c.type, c.id)}>{c.name}</Link></td>
                      <td className="py-2 pr-3 tabular-nums">{date(c.last_date)}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums ${isOverdueVsHabit(c.idle_days, c.avg_gap_days) ? "text-destructive" : ""}`}>{c.idle_days} dias</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c.avg_gap_days != null ? `${c.avg_gap_days} dias` : "—"}</td>
                      <td className="py-2 text-right tabular-nums">{eur(c.value12)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </IXCard>

      <IXCard title="Valor das faturas" description="Distribuição das faturas do período por valor (com IVA)."
        actions={<RiskBadge level={smallTicketRisk(data.tickets)} />}>
        {data.tickets.count === 0 ? (
          <p className="text-sm text-muted-foreground">Sem faturas neste período.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Kpi label="Faturas" value={data.tickets.count.toLocaleString("pt-PT")} />
              <Kpi label="Valor médio" value={eur(data.tickets.avg)} />
              <Kpi label="Valor mediano" value={eur(data.tickets.median)} hint="Metade das faturas fica abaixo deste valor" />
            </div>
            <ul className="space-y-3">
              {data.tickets.buckets.map((b) => (
                <li key={b.key} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                  <span>{TICKET_LABEL[b.key]}</span>
                  <Progress value={(100 * b.count) / maxBucket} className="h-2" aria-label={`${TICKET_LABEL[b.key]}: ${b.count} faturas`} />
                  <span className="tabular-nums text-right text-muted-foreground">
                    {b.count} ({Math.round((100 * b.count) / data.tickets.count)}%) · {eur(b.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </IXCard>
    </>
  );
}

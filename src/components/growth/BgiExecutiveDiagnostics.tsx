import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBgiExecutiveDiagnostics } from "@/hooks/useBgiExecutiveDiagnostics";
import { BgiCustomerBehavior } from "@/components/growth/BgiCustomerBehavior";
import {
  DIAG_RANGES, agingRisk, collectionRisk, concentrationRisk, entityPath, resolveDiagRange,
  type DiagRange, type RiskLevel,
} from "@/lib/bgi/executiveDiagnostics";

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);
const pct = (v: number | null) => (v == null ? "—" : `${v.toLocaleString("pt-PT")}%`);
const lisbonToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());

const RISK: Record<RiskLevel, { label: string; variant: "outline" | "secondary" | "destructive" }> = {
  ok: { label: "Saudável", variant: "outline" },
  warning: { label: "Atenção", variant: "secondary" },
  critical: { label: "Crítico", variant: "destructive" },
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

export function BgiExecutiveDiagnostics() {
  const [range, setRange] = useState<DiagRange>("ytd");
  const { start, end } = useMemo(() => resolveDiagRange(range, lisbonToday()), [range]);
  const { data, isLoading, error, refetch } = useBgiExecutiveDiagnostics(start, end);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período do diagnóstico">
        {DIAG_RANGES.map((r) => (
          <Button key={r.key} size="sm" variant={range === r.key ? "default" : "outline"} className="rounded-full"
            aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Button>
        ))}
      </div>

      {isLoading && (
        <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> A preparar o diagnóstico…
        </div>
      )}
      {error && (
        <IXCard>
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-destructive">Não foi possível calcular o diagnóstico. Tente novamente.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        </IXCard>
      )}

      {data && (
        <>
          <IXCard title="Concentração de clientes" actions={<RiskBadge level={concentrationRisk(data.concentration.top3_share)} />}>
            {data.concentration.customers === 0 ? (
              <p className="text-sm text-muted-foreground">Sem faturação com cliente identificado neste período.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Kpi label="Faturação líquida" value={eur(data.concentration.total_net)} hint={`${data.concentration.customers} clientes`} />
                  <Kpi label="Peso do top 3" value={pct(data.concentration.top3_share)} />
                  <Kpi label="Peso do top 10" value={pct(data.concentration.top10_share)} hint={`Top 20: ${pct(data.concentration.top20_share)}`} />
                  <Kpi label="Clientes que fazem 80%" value={data.concentration.customers_for_80pct?.toString() ?? "—"}
                    hint={data.concentration.customers_for_80pct ? `${Math.round(100 * data.concentration.customers_for_80pct / data.concentration.customers)}% da carteira` : undefined} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Cliente</th><th className="py-2 pr-3 text-right">Faturado</th><th className="py-2 pr-3 w-40">Peso</th><th className="py-2 text-right">Em aberto</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.concentration.top.map((c, i) => (
                        <tr key={c.id}>
                          <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 pr-3"><Link className="text-primary hover:underline" to={entityPath(c.type, c.id)}>{c.name}</Link></td>
                          <td className="py-2 pr-3 text-right tabular-nums">{eur(c.net)}</td>
                          <td className="py-2 pr-3"><div className="flex items-center gap-2"><Progress value={c.share ?? 0} className="h-1.5" aria-label={`Peso de ${c.name}`} /><span className="text-xs tabular-nums w-12 text-right">{pct(c.share)}</span></div></td>
                          <td className={`py-2 text-right tabular-nums ${c.open > 0 ? "text-destructive" : "text-muted-foreground"}`}>{eur(c.open)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </IXCard>

          <IXCard title="Cobrança do período" actions={<RiskBadge level={collectionRisk(data.collection.rate)} />}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Kpi label="Faturado (c/ IVA)" value={eur(data.collection.invoiced_gross)} />
              <Kpi label="Já recebido" value={eur(data.collection.paid_gross)} />
              <Kpi label="Taxa de cobrança" value={pct(data.collection.rate)} />
            </div>
          </IXCard>

          <IXCard title="Antiguidade dos saldos em aberto (hoje)" actions={<RiskBadge level={agingRisk(data.aging)} />}>
            {data.aging.total === 0 ? (
              <p className="text-sm text-muted-foreground">Não há faturas em aberto.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <Kpi label="Total em aberto" value={eur(data.aging.total)} hint={`${data.aging.invoices} faturas`} />
                  <Kpi label="Não vencido" value={eur(data.aging.not_due)} />
                  <Kpi label="1–30 dias" value={eur(data.aging.d1_30)} />
                  <Kpi label="31–60 dias" value={eur(data.aging.d31_60)} />
                  <Kpi label="61–90 dias" value={eur(data.aging.d61_90)} />
                  <Kpi label="Mais de 90 dias" value={eur(data.aging.d90_plus)} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr><th className="py-2 pr-3">Maiores devedores</th><th className="py-2 pr-3 text-right">Saldo</th><th className="py-2 pr-3 text-right">Faturas</th><th className="py-2 text-right">Maior atraso</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.aging.top_debtors.map((d) => (
                        <tr key={d.id}>
                          <td className="py-2 pr-3"><Link className="text-primary hover:underline" to={entityPath(d.type, d.id)}>{d.name}</Link></td>
                          <td className="py-2 pr-3 text-right tabular-nums">{eur(d.balance)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{d.invoices}</td>
                          <td className={`py-2 text-right tabular-nums ${d.max_overdue_days > 60 ? "text-destructive" : ""}`}>{d.max_overdue_days > 0 ? `${d.max_overdue_days} dias` : "Não vencido"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </IXCard>

          <BgiCustomerBehavior start={start} end={end} totalNet={data.concentration.total_net} />
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Search, RefreshCw, ExternalLink, X, Euro, TrendingUp,
  Users as UsersIcon, AlertTriangle, Sparkles, Activity, Calendar,
  Hash, Receipt, ShieldCheck,
} from "lucide-react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import {
  PageHeader, StatTile, StatusPill, ErrorBanners, TableSkeleton, EmptyState, fmtDate,
} from "@/components/backoffice-v2/_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useBillingAdmin, type BillingRow, PLAN_LABEL, PLAN_PRICE_EUR,
} from "@/hooks/useBillingAdmin";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const fmtEur = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/** Badge de estado específico para subscrições (mais granular). */
function SubStatusPill({ status, cancelAtEnd }: { status: string; cancelAtEnd?: boolean | null }) {
  const map: Record<string, string> = {
    active: "bg-success/10 text-success ring-success/20",
    trialing: "bg-cyan/10 text-cyan ring-cyan/30",
    past_due: "bg-warning/15 text-warning-foreground ring-warning/30",
    canceled: "bg-destructive/10 text-destructive ring-destructive/20",
    paused: "bg-navy-100 text-navy-500 ring-navy-200",
    incomplete: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  const label: Record<string, string> = {
    active: "Ativo",
    trialing: "Trial",
    past_due: "Past due",
    canceled: "Cancelado",
    paused: "Pausado",
    incomplete: "Incompleto",
  };
  if (cancelAtEnd && status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning-foreground ring-1 ring-inset ring-warning/30">
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        Cancela no fim do período
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        map[status] ?? map.paused
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label[status] ?? status}
    </span>
  );
}

function PlanPill({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-navy-100 text-navy-500 ring-navy-200",
    basic: "bg-cyan/10 text-cyan ring-cyan/30",
    pro: "bg-brand/10 text-brand ring-brand/30",
    agency: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        styles[plan] ?? styles.free
      )}
    >
      {PLAN_LABEL[plan] ?? plan}
    </span>
  );
}

/** Donut SVG leve para o mix de planos. */
function PlanDonut({ items }: { items: Array<{ plan: string; count: number }> }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  const colors: Record<string, string> = {
    free: "hsl(215, 22%, 62%)",
    basic: "hsl(192, 100%, 50%)",
    pro: "hsl(218, 100%, 54%)",
    agency: "hsl(265, 80%, 60%)",
  };
  let acc = 0;
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(214 40% 92%)" strokeWidth="14" />
        {items.map((i) => {
          const frac = i.count / total;
          const dash = frac * circ;
          const el = (
            <motion.circle
              key={i.plan}
              cx="70" cy="70" r={radius}
              fill="none"
              stroke={colors[i.plan] ?? "hsl(215 22% 62%)"}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-acc}
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          );
          acc += dash;
          return el;
        })}
      </svg>
      <div className="space-y-1.5 text-sm">
        {items.map((i) => (
          <div key={i.plan} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: colors[i.plan] ?? "hsl(215 22% 62%)" }}
            />
            <span className="font-medium text-navy">{PLAN_LABEL[i.plan] ?? i.plan}</span>
            <span className="text-navy-300">· {i.count}</span>
          </div>
        ))}
        {items.length === 0 && <div className="text-xs text-navy-300">Sem dados</div>}
      </div>
    </div>
  );
}

export default function BackofficeSubscriptionsV2() {
  const { data, isLoading, isError, error, refetch, isFetching } = useBillingAdmin();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<BillingRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (planFilter !== "all" && r.plan !== planFilter) return false;
      if (!q) return true;
      return (
        r.workspace_name.toLowerCase().includes(q) ||
        (r.workspace_slug ?? "").toLowerCase().includes(q) ||
        (r.stripe_customer_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [data?.rows, search, status, planFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Próximas renovações (≤30 dias, ativos) — top 6
  const upcoming = useMemo(() => {
    const now = Date.now();
    const horizon = now + 30 * 24 * 3600 * 1000;
    return (data?.rows ?? [])
      .filter((r) => {
        if (r.status !== "active" && r.status !== "trialing") return false;
        const t = r.current_period_end ? new Date(r.current_period_end).getTime() : 0;
        return t > now && t < horizon;
      })
      .sort(
        (a, b) =>
          new Date(a.current_period_end!).getTime() -
          new Date(b.current_period_end!).getTime()
      )
      .slice(0, 6);
  }, [data?.rows]);

  // Top workspaces por MRR
  const topMrr = useMemo(
    () =>
      [...(data?.rows ?? [])]
        .filter((r) => r.mrr_eur > 0)
        .sort((a, b) => b.mrr_eur - a.mrr_eur)
        .slice(0, 5),
    [data?.rows]
  );

  // Alertas
  const alerts = useMemo(() => {
    const list: Array<{ tone: "amber" | "rose" | "sky"; title: string; hint: string }> = [];
    const t = data?.totals;
    if (!t) return list;
    if (t.pastDue > 0) {
      list.push({
        tone: "rose",
        title: `${t.pastDue} subscrição(ões) com pagamento em atraso`,
        hint: "Reconciliar com o Stripe para evitar churn involuntário.",
      });
    }
    const trialEnding = (data?.rows ?? []).filter((r) => {
      if (r.status !== "trialing" || !r.trial_ends_at) return false;
      const days = (new Date(r.trial_ends_at).getTime() - Date.now()) / 86_400_000;
      return days >= 0 && days <= 7;
    }).length;
    if (trialEnding > 0) {
      list.push({
        tone: "sky",
        title: `${trialEnding} trial(s) terminam nos próximos 7 dias`,
        hint: "Boa janela para acionar onboarding e conversão.",
      });
    }
    const cancelAtEnd = (data?.rows ?? []).filter(
      (r) => r.cancel_at_period_end && r.status === "active"
    ).length;
    if (cancelAtEnd > 0) {
      list.push({
        tone: "amber",
        title: `${cancelAtEnd} subscrição(ões) marcadas para cancelar no fim do período`,
        hint: "Considerar contacto de retenção antes do término.",
      });
    }
    if (t.risk > 0) {
      list.push({
        tone: "amber",
        title: `${fmtEur(t.risk)} de MRR potencialmente em risco`,
        hint: "Soma de subscrições past_due ou marcadas para cancelar.",
      });
    }
    return list;
  }, [data]);

  return (
    <BackofficeShellV2>
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 md:px-8">
        <ErrorBanners isError={isError} error={error} partialErrors={data?.partialErrors} />

        <PageHeader
          badge={<><CreditCard className="h-3 w-3 text-[hsl(220,90%,56%)]" /> Backoffice · Billing</>}
          title="Subscrições"
          subtitle="Visão financeira e operacional read-only sobre a monetização da plataforma"
          right={
            <Button
              variant="outline"
              className="h-9 gap-2 border-slate-200"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> Atualizar
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label="MRR estimado"
            value={isLoading ? "…" : fmtEur(data?.totals.mrr ?? 0)}
            accent="bg-gradient-to-br from-[hsl(220,90%,56%)] to-[hsl(190,95%,50%)]"
            icon={Euro}
          />
          <StatTile
            label="Subscrições ativas"
            value={isLoading ? "…" : (data?.totals.active ?? 0)}
            accent="bg-emerald-500"
            icon={Activity}
          />
          <StatTile
            label="ARPA médio"
            value={isLoading ? "…" : fmtEur(Math.round(data?.totals.arpa ?? 0))}
            accent="bg-violet-500"
            icon={TrendingUp}
          />
          <StatTile
            label="Workspaces em trial"
            value={isLoading ? "…" : (data?.totals.trialing ?? 0)}
            accent="bg-sky-500"
            icon={Sparkles}
          />
          <StatTile
            label="Cancelamentos"
            value={isLoading ? "…" : (data?.totals.canceled ?? 0)}
            accent="bg-rose-500"
            icon={UsersIcon}
          />
          <StatTile
            label="MRR em risco"
            value={isLoading ? "…" : fmtEur(data?.totals.risk ?? 0)}
            accent="bg-amber-500"
            icon={AlertTriangle}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500">
          <ShieldCheck className="mr-1.5 inline h-3 w-3 text-emerald-500" />
          Modo read-only · MRR estimado a partir de uma tabela de preços por plano
          (Free €0 · Basic €{PLAN_PRICE_EUR.basic} · Pro €{PLAN_PRICE_EUR.pro} · Agency €{PLAN_PRICE_EUR.agency}).
          Sem ações destrutivas nesta vista.
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4 text-sm",
                  a.tone === "rose" && "border-rose-200 bg-rose-50 text-rose-800",
                  a.tone === "amber" && "border-amber-200 bg-amber-50 text-amber-900",
                  a.tone === "sky" && "border-sky-200 bg-sky-50 text-sky-900"
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs opacity-80">{a.hint}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Visualizações */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Mix de planos</div>
              <span className="text-[11px] text-slate-400">{data?.rows.length ?? 0} subs</span>
            </div>
            <PlanDonut items={(data?.planMix ?? []).map((p) => ({ plan: p.plan, count: p.count }))} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Top workspaces por MRR</div>
              <TrendingUp className="h-4 w-4 text-[hsl(220,90%,56%)]" />
            </div>
            {topMrr.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">Sem dados de receita.</div>
            ) : (
              <ul className="space-y-2.5">
                {topMrr.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {r.workspace_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        <PlanPill plan={r.plan} />
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {fmtEur(r.mrr_eur)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Próximas renovações</div>
              <Calendar className="h-4 w-4 text-[hsl(220,90%,56%)]" />
            </div>
            {upcoming.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Sem renovações nos próximos 30 dias.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {r.workspace_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {fmtDate(r.current_period_end)}
                      </div>
                    </div>
                    <SubStatusPill status={r.status} cancelAtEnd={r.cancel_at_period_end} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Filtros + Tabela */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Pesquisar workspace, slug ou customer Stripe…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-9 pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="past_due">Past due</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Plano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Workspace</th>
                  <th className="px-4 py-2.5 font-medium">Plano</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium text-right">MRR</th>
                  <th className="px-4 py-2.5 font-medium">Renovação</th>
                  <th className="px-4 py-2.5 font-medium">Trial até</th>
                  <th className="px-4 py-2.5 font-medium">Atualizado</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton cols={8} rows={8} />
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon={Receipt}
                        title="Ainda não existem subscrições registadas."
                        hint="Quando os workspaces começarem a ter planos ativos, os dados de billing aparecerão aqui."
                      />
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/60"
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{r.workspace_name}</div>
                        {r.workspace_slug && (
                          <div className="text-[11px] text-slate-400">/{r.workspace_slug}</div>
                        )}
                      </td>
                      <td className="px-4 py-3"><PlanPill plan={r.plan} /></td>
                      <td className="px-4 py-3">
                        <SubStatusPill status={r.status} cancelAtEnd={r.cancel_at_period_end} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {fmtEur(r.mrr_eur)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(r.current_period_end)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(r.trial_ends_at)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(r.updated_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900"
                          onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                        >
                          Ver detalhe
                        </Button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <div>
                {filtered.length} resultado(s) · página {safePage} de {pageCount}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" className="h-7" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Seguinte</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 36 }}
              className="fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Subscrição
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {selected.workspace_name}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <PlanPill plan={selected.plan} />
                    <SubStatusPill status={selected.status} cancelAtEnd={selected.cancel_at_period_end} />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-5 p-5 text-sm">
                <section>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Receita
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="text-2xl font-semibold text-slate-900">
                      {fmtEur(selected.mrr_eur)}<span className="ml-1 text-xs font-normal text-slate-400">/ mês</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      MRR estimado a partir do plano (sem ligação direta ao Stripe nesta vista).
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Identificadores
                  </div>
                  <Field icon={Hash} label="Workspace ID" value={selected.workspace_id} mono />
                  <Field icon={Hash} label="Subscription ID" value={selected.id} mono />
                  <Field
                    icon={CreditCard}
                    label="Stripe customer"
                    value={selected.stripe_customer_id ?? "—"}
                    mono
                  />
                </section>

                <section className="space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Ciclo
                  </div>
                  <Field icon={Calendar} label="Próxima renovação" value={fmtDate(selected.current_period_end)} />
                  <Field icon={Sparkles} label="Trial até" value={fmtDate(selected.trial_ends_at)} />
                  <Field icon={Calendar} label="Criado em" value={fmtDate(selected.created_at)} />
                  <Field icon={Calendar} label="Atualizado em" value={fmtDate(selected.updated_at)} />
                </section>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="h-9 justify-center gap-2 border-slate-200"
                    asChild
                  >
                    <a href={`/super-admin?ws=${selected.workspace_id}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /> Abrir no backoffice clássico
                    </a>
                  </Button>
                  <p className="text-center text-[11px] text-slate-400">
                    Ações destrutivas (cancelar, alterar plano, reembolsar) só estão disponíveis na shell clássica.
                  </p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </BackofficeShellV2>
  );
}

function Field({
  icon: Icon, label, value, mono,
}: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-slate-400">{label}</div>
        <div className={cn("truncate text-slate-700", mono && "font-mono text-[12px]")}>{value}</div>
      </div>
    </div>
  );
}

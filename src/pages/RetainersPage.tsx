import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { matchesSearch } from "@/lib/search/normalize";
import { IXCard } from "@/components/entity/ix/IXCard";
import { useRetainers, useRetainerEntries, type ServiceRetainer } from "@/hooks/useRetainers";
import { computeRetainerUsage } from "@/lib/retainers/retainerUsage";
import { lisbonMonthKey } from "@/lib/dates/currentMonth";
import { RetainerUsageBar } from "@/components/retainers/RetainerUsageSummary";
import { RetainerFormDialog } from "@/components/retainers/RetainerFormDialog";

const STATUS: Record<string, string> = { active: "Ativa", paused: "Pausada", ended: "Terminada" };
const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

function RetainerRow({ r, monthKey }: { r: ServiceRetainer; monthKey: string }) {
  const { data: entries = [], isLoading } = useRetainerEntries(r.id, monthKey);
  const usage = computeRetainerUsage(entries, Number(r.included_hours), Number(r.overage_hourly_rate));
  return (
    <Link to={`/dashboard/retainers/${r.id}`} className="grid gap-3 px-2 py-4 hover:bg-muted/50 md:grid-cols-[1.5fr_1fr_2fr] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{r.name}</p>
        <p className="truncate text-sm text-muted-foreground">{r.companies?.name ?? "Sem empresa"}</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline">{STATUS[r.status]}</Badge>
        <span className="text-muted-foreground">{eur(Number(r.monthly_fee))}/mês · {Number(r.included_hours)}h</span>
      </div>
      {isLoading ? <div className="h-3 animate-pulse rounded-full bg-muted" /> : <RetainerUsageBar usage={usage} compact />}
    </Link>
  );
}

export default function RetainersPage() {
  const { data: retainers = [], isLoading, error } = useRetainers();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const monthKey = lisbonMonthKey();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "ended" | "all">("active");
  const counts = { active: 0, paused: 0, ended: 0, all: retainers.length } as Record<string, number>;
  retainers.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
  const shown = retainers.filter((r) => (status === "all" || r.status === status)
    && (!q.trim() || matchesSearch([r.name, r.companies?.name ?? ""], q)));

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Avenças</h1>
          <p className="mt-1 text-muted-foreground">Horas incluídas, tempo gasto em projetos e suporte, e horas extra a faturar neste mês.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova avença</Button>
      </div>

      {retainers.length > 0 && (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar avença ou empresa" aria-label="Pesquisar avenças" className="h-12 rounded-full pl-10" />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            {(["active", "paused", "ended", "all"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setStatus(k)} aria-pressed={status === k}
                className={`rounded-full border px-3 py-1 text-sm ${status === k ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {k === "all" ? "Todas" : k === "active" ? "Ativas" : k === "paused" ? "Pausadas" : "Terminadas"} ({counts[k] ?? 0})
              </button>
            ))}
          </div>
        </div>
      )}

      <IXCard>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar...</p>
          : error ? <p className="text-sm text-destructive">Não foi possível carregar as avenças.</p>
          : retainers.length === 0 ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">Ainda não há avenças. Crie a primeira para começar a controlar as horas.</p>
              <Button variant="outline" onClick={() => setOpen(true)}>Criar avença</Button>
            </div>
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma avença corresponde à pesquisa ou ao filtro.</p>
          ) : (
            <div className="divide-y divide-border">{shown.map((r) => <RetainerRow key={r.id} r={r} monthKey={monthKey} />)}</div>
          )}
      </IXCard>

      <RetainerFormDialog open={open} onOpenChange={setOpen} onSaved={(id) => navigate(`/dashboard/retainers/${id}`)} />
    </div>
  );
}

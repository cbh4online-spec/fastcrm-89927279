import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Search, ArrowLeft, Smartphone } from "lucide-react";
import { useStockCounts, STATUS_LABELS, SCOPE_LABELS, type StockCountStatus } from "@/hooks/useStockCounts";
import { NewStockCountDialog } from "@/components/products/stock-counts/NewStockCountDialog";

const statusVariant: Record<StockCountStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  counting: "default",
  review: "secondary",
  closed: "secondary",
  cancelled: "destructive",
};

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function StockCountsPage() {
  const navigate = useNavigate();
  const { data: counts = [], isLoading } = useStockCounts();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | StockCountStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return counts.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [counts, search, status]);

  return (
    <DashboardLayout>
      <Helmet>
        <title>Contagens de stock | FastCRM</title>
        <meta name="description" content="Faça contagens de inventário físico e acerte o stock com total rastreabilidade." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/stock-valuation")} aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Contagens de stock</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Inventário físico com folha de contagem, modo telemóvel e ajuste automático das divergências.
              </p>
            </div>
          </div>
          <Button className="rounded-full h-11 gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nova contagem
          </Button>
        </div>

        <IXCard title="Contagens">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar contagem..."
                className="pl-9 h-10 w-full sm:max-w-xs rounded-full"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="h-10 rounded-full w-full sm:w-44 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {(Object.keys(STATUS_LABELS) as StockCountStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 space-y-3">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {counts.length === 0 ? "Ainda não existem contagens de stock." : "Nenhuma contagem corresponde aos filtros."}
              </p>
              {counts.length === 0 && (
                <Button variant="outline" className="rounded-full" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Criar primeira contagem
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => {
                const progress = c.total_items ? Math.round((c.counted_items / c.total_items) * 100) : 0;
                return (
                  <li key={c.id}>
                    <Link
                      to={`/dashboard/stock-counts/${c.id}`}
                      className="flex flex-wrap items-center gap-3 py-4 hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{c.name}</span>
                          <Badge variant={statusVariant[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {SCOPE_LABELS[c.scope_type]}
                          {c.scope_category ? ` · ${c.scope_category}` : ""} · criada em {fmtDate(c.created_at)}
                        </p>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <div className="text-sm font-medium tabular-nums">
                          {c.counted_items}/{c.total_items}
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted mt-1 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      {c.status !== "closed" && c.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full gap-1"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/dashboard/stock-counts/${c.id}/count`);
                          }}
                        >
                          <Smartphone className="h-3.5 w-3.5" /> Contar
                        </Button>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </IXCard>
      </div>

      <NewStockCountDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}

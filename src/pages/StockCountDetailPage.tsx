import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, Lock, RefreshCw, Search, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useStockCount, useStockCountItems, useStockCountProgress, useSubmitStockCountItem,
  useRegenerateStockCountItems, useCloseStockCount, STATUS_LABELS, SCOPE_LABELS,
} from "@/hooks/useStockCounts";

const fmtEur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

type ItemFilter = "all" | "pending" | "counted" | "variance";

export default function StockCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: count, isLoading } = useStockCount(id);
  const { data: items = [], isLoading: itemsLoading } = useStockCountItems(id);
  const stats = useStockCountProgress(items);
  const { submit } = useSubmitStockCountItem(id);
  const regenerate = useRegenerateStockCountItems(id);
  const closeCount = useCloseStockCount(id);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [confirmClose, setConfirmClose] = useState(false);

  const isClosed = count?.status === "closed" || count?.status === "cancelled";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (q && !(i.product_name.toLowerCase().includes(q) || (i.sku || "").toLowerCase().includes(q))) return false;
      if (filter === "pending" && i.counted_qty !== null) return false;
      if (filter === "counted" && i.counted_qty === null) return false;
      if (filter === "variance" && (i.counted_qty === null || i.counted_qty === i.expected_qty)) return false;
      return true;
    });
  }, [items, search, filter]);

  const exportCsv = () => {
    const headers = ["SKU", "Produto", "Categoria", "Esperado", "Contado", "Divergência", "Custo unit.", "Impacto"];
    const lines = filtered.map((i) => {
      const variance = i.counted_qty === null ? "" : i.counted_qty - i.expected_qty;
      const impact = i.counted_qty === null ? "" : ((i.counted_qty - i.expected_qty) * Number(i.unit_cost || 0)).toFixed(2);
      return [
        i.sku || "",
        `"${i.product_name.replace(/"/g, '""')}"`,
        i.category || "",
        i.expected_qty,
        i.counted_qty ?? "",
        variance,
        Number(i.unit_cost || 0).toFixed(2),
        impact,
      ].join(";");
    });
    const blob = new Blob([[headers.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contagem-${count?.name || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = async () => {
    try {
      const res = await closeCount.mutateAsync();
      toast.success(`Contagem fechada · ${res?.adjustments ?? 0} ajustes de stock`);
      setConfirmClose(false);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível fechar a contagem");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!count) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 space-y-3">
          <p className="text-muted-foreground">Contagem não encontrada.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/stock-counts")}>Voltar às contagens</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet><title>{count.name} | Contagem de stock</title></Helmet>

      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/stock-counts")} aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight truncate">{count.name}</h1>
                <Badge variant={count.status === "closed" ? "secondary" : "default"}>{STATUS_LABELS[count.status]}</Badge>
                {count.blind_count && !isClosed && <Badge variant="outline">Contagem cega</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {SCOPE_LABELS[count.scope_type]}{count.scope_category ? ` · ${count.scope_category}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isClosed && (
              <>
                <Button variant="outline" className="rounded-full gap-2" onClick={() => regenerate.mutate()}>
                  <RefreshCw className={`h-4 w-4 ${regenerate.isPending ? "animate-spin" : ""}`} /> Atualizar linhas
                </Button>
                <Button className="rounded-full gap-2" onClick={() => navigate(`/dashboard/stock-counts/${id}/count`)}>
                  <Smartphone className="h-4 w-4" /> Modo contagem
                </Button>
                <Button variant="secondary" className="rounded-full gap-2" onClick={() => setConfirmClose(true)}>
                  <Lock className="h-4 w-4" /> Fechar e acertar
                </Button>
              </>
            )}
            <Button variant="outline" className="rounded-full gap-2" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <IXCard contentClassName="py-4">
            <p className="text-xs uppercase text-muted-foreground">Progresso</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.progress}%</p>
            <p className="text-xs text-muted-foreground">{stats.counted} de {stats.total} itens</p>
          </IXCard>
          <IXCard contentClassName="py-4">
            <p className="text-xs uppercase text-muted-foreground">Por contar</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.pending}</p>
          </IXCard>
          <IXCard contentClassName="py-4">
            <p className="text-xs uppercase text-muted-foreground">Divergências</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.variances}</p>
          </IXCard>
          <IXCard contentClassName="py-4">
            <p className="text-xs uppercase text-muted-foreground">Impacto a custo</p>
            <p className={`text-2xl font-semibold tabular-nums ${stats.varianceValue < 0 ? "text-destructive" : ""}`}>
              {fmtEur(isClosed ? Number(count.variance_value) : stats.varianceValue)}
            </p>
          </IXCard>
        </div>

        <IXCard title="Linhas de contagem" contentClassName="px-0 pb-2">
          <div className="flex flex-col sm:flex-row gap-2 px-6 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou SKU..."
                className="pl-9 h-10 w-full sm:max-w-xs rounded-full"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as ItemFilter)}>
              <SelectTrigger className="h-10 rounded-full w-full sm:w-48 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Por contar</SelectItem>
                <SelectItem value="counted">Contados</SelectItem>
                <SelectItem value="variance">Com divergência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {itemsLoading ? (
            <div className="px-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Nenhuma linha para mostrar.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">Produto / SKU</TableHead>
                    {(!count.blind_count || isClosed) && <TableHead className="text-right">Sistema</TableHead>}
                    <TableHead className="text-right w-32">Contado</TableHead>
                    <TableHead className="text-right">Divergência</TableHead>
                    <TableHead className="text-right">Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => {
                    const variance = i.counted_qty === null ? null : i.counted_qty - i.expected_qty;
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="font-medium leading-snug line-clamp-2">{i.product_name}</div>
                          {i.sku && (
                            <code className="font-mono text-[11px] text-muted-foreground bg-muted/70 rounded px-1.5 py-0.5 mt-1 inline-block">
                              {i.sku}
                            </code>
                          )}
                        </TableCell>
                        {(!count.blind_count || isClosed) && (
                          <TableCell className="text-right tabular-nums">{i.expected_qty}</TableCell>
                        )}
                        <TableCell className="text-right">
                          {isClosed ? (
                            <span className="tabular-nums">{i.counted_qty ?? "—"}</span>
                          ) : (
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              defaultValue={i.counted_qty ?? ""}
                              className="h-9 w-24 ml-auto text-right tabular-nums"
                              aria-label={`Quantidade contada de ${i.product_name}`}
                              onBlur={(e) => {
                                const raw = e.target.value;
                                if (raw === "") return;
                                const qty = Math.max(0, Math.trunc(Number(raw)));
                                if (Number.isNaN(qty) || qty === i.counted_qty) return;
                                void submit({ productId: i.product_id, qty });
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {variance === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : variance === 0 ? (
                            <span className="text-muted-foreground">0</span>
                          ) : (
                            <span className={variance < 0 ? "text-destructive font-medium" : "text-emerald-600 font-medium"}>
                              {variance > 0 ? `+${variance}` : variance}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {variance === null ? "—" : fmtEur(variance * Number(i.unit_cost || 0))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </IXCard>
      </div>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar contagem e acertar stock?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão criados {stats.variances} ajustes de stock ({fmtEur(stats.varianceValue)} a custo).
              {stats.pending > 0 && ` ${stats.pending} itens ficam por contar e não serão alterados.`}
              {" "}Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleClose(); }} disabled={closeCount.isPending}>
              {closeCount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Fechar e acertar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, TrendingUp, AlertTriangle, Coins, Download, RefreshCw, Search, Layers, ArrowLeft,
} from "lucide-react";
import { useInventoryValuation, type InventoryValuationRow } from "@/hooks/useInventoryValuation";
import { toast } from "sonner";

const fmt = (n: number, currency = true) =>
  currency
    ? new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0)
    : new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(n || 0);

type SortKey = "name" | "stock" | "cost_value" | "sale_value" | "margin" | "margin_pct";

export default function StockValuationPage() {
  const navigate = useNavigate();
  const { rows, summary, isLoading, isFetching, refetch } = useInventoryValuation();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refetch();
      toast.success("Dados actualizados");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao actualizar");
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard/products");
  };
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("cost_value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.category && set.add(r.category));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (category !== "all" && r.category !== category) return false;
        if (!q) return true;
        return (
          r.product_name?.toLowerCase().includes(q) ||
          r.sku?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        const get = (r: InventoryValuationRow) => {
          switch (sortKey) {
            case "name": return r.product_name?.toLowerCase() || "";
            case "stock": return r.current_stock;
            case "cost_value": return r.total_cost_value;
            case "sale_value": return r.total_sale_value;
            case "margin": return r.latent_margin;
            case "margin_pct": return r.latent_margin_pct;
          }
        };
        const av = get(a), bv = get(b);
        if (typeof av === "string") return (av as string).localeCompare(bv as string) * dir;
        return ((av as number) - (bv as number)) * dir;
      });
  }, [rows, search, category, sortKey, sortDir]);

  const exportCsv = () => {
    const headers = [
      "SKU", "Produto", "Categoria", "Stock", "Stock mínimo",
      "Custo unit.", "Custo operacional unit.", "Custo total unit.",
      "Valor stock a custo",
      "Base s/IVA actual", "Base s/IVA sugerido",
      "PVP unit.", "Valor a PVP",
      "Margem €", "Markup % s/Custo",
    ];
    const lines = filtered.map((r) => [
      r.sku || "",
      `"${(r.product_name || "").replace(/"/g, '""')}"`,
      r.category || "",
      r.current_stock,
      r.low_stock_threshold ?? 0,
      r.fifo_avg_cost.toFixed(4),
      r.operational_cost_unit.toFixed(4),
      r.total_unit_cost.toFixed(4),
      r.total_cost_value.toFixed(2),
      r.unit_sale_price.toFixed(2),
      r.suggested_base_price != null ? r.suggested_base_price.toFixed(2) : "",
      r.unit_sale_price.toFixed(2),
      r.total_sale_value.toFixed(2),
      r.latent_margin.toFixed(2),
      r.markup_pct.toFixed(2),
    ].join(";"));
    const csv = [headers.join(";"), ...lines].join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-valorizado-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Helmet>
        <title>Stock Valorizado (FIFO) | FastCRM</title>
        <meta name="description" content="Valorização de inventário pelo método FIFO com KPIs de custo, PVP e margem latente." />
      </Helmet>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-3 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Coins className="h-7 w-7 text-primary" />
            Stock Valorizado
          </h1>
          <p className="text-muted-foreground mt-1">
            Valorização do inventário em tempo real pelo método FIFO (First-In, First-Out)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Valor a Custo"
          value={fmt(summary?.total_cost_value || 0)}
          icon={<Coins className="h-5 w-5" />}
          loading={isLoading}
          hint={`${fmt(summary?.total_units || 0, false)} unidades`}
        />
        <KpiCard
          title="Valor a PVP"
          value={fmt(summary?.total_sale_value || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
          hint={`${summary?.total_products || 0} produtos`}
        />
        <KpiCard
          title="Margem Latente"
          value={fmt(summary?.total_latent_margin || 0)}
          icon={<Layers className="h-5 w-5" />}
          loading={isLoading}
          hint={`${(summary?.avg_margin_pct || 0).toFixed(1)}% média`}
          accent={(summary?.total_latent_margin || 0) >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          title="Alertas"
          value={`${summary?.zero_stock_count || 0} sem stock`}
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={isLoading}
          hint={`${summary?.negative_margin_count || 0} com margem negativa`}
          accent={(summary?.negative_margin_count || 0) > 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Filtros + Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Inventário valorizado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Procurar produto ou SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop / tablet: tabela completa */}
          <div className="rounded-md border overflow-x-auto hidden md:block">
            <Table className="text-xs [&_th]:h-9 [&_th]:px-2 [&_td]:p-2 [&_td]:align-top table-fixed w-full min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer w-[34%]" onClick={() => toggleSort("name")}>
                    Produto / SKU
                  </TableHead>
                  <TableHead className="text-right cursor-pointer w-[90px]" onClick={() => toggleSort("stock")} title="Stock actual / mínimo">
                    Stock
                  </TableHead>
                  <TableHead className="text-right w-[110px] bg-amber-50/40 dark:bg-amber-950/20" title="Custo Total = P.Custo FIFO + Custo Operacional">
                    Custo un.
                  </TableHead>
                  <TableHead className="text-right cursor-pointer w-[110px] bg-amber-50/40 dark:bg-amber-950/20 border-r" onClick={() => toggleSort("cost_value")} title="Stock × Custo Total">
                    Valor custo
                  </TableHead>
                  <TableHead className="text-right w-[120px] bg-blue-50/40 dark:bg-blue-950/20" title="Preço actual e sugerido (s/IVA)">
                    PVP un.
                  </TableHead>
                  <TableHead className="text-right cursor-pointer w-[110px] bg-blue-50/40 dark:bg-blue-950/20 border-r" onClick={() => toggleSort("sale_value")}>
                    Valor PVP
                  </TableHead>
                  <TableHead className="text-right cursor-pointer w-[100px] bg-emerald-50/40 dark:bg-emerald-950/20" onClick={() => toggleSort("margin")} title="Stock × (PVP − Custo Total)">
                    € lucro
                  </TableHead>
                  <TableHead className="text-right cursor-pointer w-[80px] bg-emerald-50/40 dark:bg-emerald-950/20" onClick={() => toggleSort("margin_pct")} title="(PVP − Custo) ÷ Custo">
                    Markup
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      Sem produtos para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const suggested = r.suggested_base_price;
                    const delta = suggested != null ? r.unit_sale_price - suggested : null;
                    const belowMin = r.low_stock_threshold > 0 && r.current_stock <= r.low_stock_threshold;
                    return (
                      <TableRow key={r.product_id}>
                        <TableCell>
                          <div className="font-medium leading-snug line-clamp-2 break-words whitespace-normal" title={r.product_name}>{r.product_name}</div>
                          {r.sku && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.sku}</div>}
                        </TableCell>

                        <TableCell className="text-right">
                          {r.current_stock <= 0 ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5">0</Badge>
                          ) : (
                            <span className={belowMin ? "text-amber-600 font-medium" : ""}>
                              {fmt(r.current_stock, false)}
                            </span>
                          )}
                          {r.low_stock_threshold > 0 && (
                            <div className="text-[10px] text-muted-foreground">min {fmt(r.low_stock_threshold, false)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{fmt(r.total_unit_cost)}</div>
                          {r.operational_cost_unit > 0 && (
                            <div className="text-[10px] text-muted-foreground">+{fmt(r.operational_cost_unit)} op.</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium border-r">{fmt(r.total_cost_value)}</TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{fmt(r.unit_sale_price)}</div>
                          {suggested != null && delta != null && Math.abs(delta) >= 0.01 && (
                            <div className={`text-[10px] ${delta < 0 ? "text-destructive" : "text-emerald-600"}`}>
                              sug. {fmt(suggested)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium border-r">{fmt(r.total_sale_value)}</TableCell>
                        <TableCell className={`text-right font-medium ${r.latent_margin < 0 ? "text-destructive" : "text-emerald-600"}`}>
                          {fmt(r.latent_margin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={r.markup_pct < 0 ? "destructive" : r.markup_pct < 15 ? "secondary" : "default"} className="text-[10px] px-1.5">
                            {r.markup_pct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-md border p-3"><Skeleton className="h-16 w-full" /></div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 border rounded-md text-sm">
                Sem produtos para mostrar
              </div>
            ) : (
              filtered.map((r) => {
                const suggested = r.suggested_base_price;
                const delta = suggested != null ? r.unit_sale_price - suggested : null;
                const belowMin = r.low_stock_threshold > 0 && r.current_stock <= r.low_stock_threshold;
                return (
                  <div key={r.product_id} className="rounded-md border p-3 bg-card">
                    <div className="font-medium text-sm leading-snug break-words" title={r.product_name}>
                      {r.product_name}
                    </div>
                    {r.sku && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.sku}</div>}

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Stock</span>
                      <span className="flex items-center gap-2">
                        {r.current_stock <= 0 ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5">0</Badge>
                        ) : (
                          <span className={belowMin ? "text-amber-600 font-medium" : "font-medium"}>
                            {fmt(r.current_stock, false)}
                          </span>
                        )}
                        {r.low_stock_threshold > 0 && (
                          <span className="text-[10px] text-muted-foreground">min {fmt(r.low_stock_threshold, false)}</span>
                        )}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-amber-50/60 dark:bg-amber-950/20 p-2">
                        <div className="text-[10px] text-muted-foreground">Custo un.</div>
                        <div className="font-medium">{fmt(r.total_unit_cost)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Valor: {fmt(r.total_cost_value)}</div>
                      </div>
                      <div className="rounded bg-blue-50/60 dark:bg-blue-950/20 p-2">
                        <div className="text-[10px] text-muted-foreground">PVP un.</div>
                        <div className="font-medium">{fmt(r.unit_sale_price)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Valor: {fmt(r.total_sale_value)}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t">
                      <span className="text-muted-foreground">Lucro</span>
                      <span className="flex items-center gap-2">
                        <span className={`font-medium ${r.latent_margin < 0 ? "text-destructive" : "text-emerald-600"}`}>
                          {fmt(r.latent_margin)}
                        </span>
                        <Badge
                          variant={r.markup_pct < 0 ? "destructive" : r.markup_pct < 15 ? "secondary" : "default"}
                          className="text-[10px] px-1.5"
                        >
                          {r.markup_pct.toFixed(1)}%
                        </Badge>
                      </span>
                    </div>

                    {suggested != null && delta != null && Math.abs(delta) >= 0.01 && (
                      <div className={`mt-1 text-[10px] text-right ${delta < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        PVP sugerido: {fmt(suggested)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>



          {!isLoading && filtered.length > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
              <span>{filtered.length} produtos</span>
              <span>
                Total a custo: <strong className="text-foreground">{fmt(filtered.reduce((s, r) => s + r.total_cost_value, 0))}</strong>
                {" · "}
                Total a PVP: <strong className="text-foreground">{fmt(filtered.reduce((s, r) => s + r.total_sale_value, 0))}</strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title, value, icon, hint, loading, accent = "neutral",
}: {
  title: string; value: string; icon: React.ReactNode; hint?: string; loading?: boolean;
  accent?: "neutral" | "positive" | "negative";
}) {
  const accentClass =
    accent === "positive" ? "text-emerald-600" : accent === "negative" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
        )}
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Package, TrendingUp, AlertTriangle, Coins, Download, RefreshCw, Search, Layers,
  ArrowLeft, SlidersHorizontal, Mic, MicOff, Sparkles, X, ChevronLeft, ChevronRight, Loader2, MoreHorizontal,
} from "lucide-react";
import { useInventoryValuation, type InventoryValuationRow } from "@/hooks/useInventoryValuation";
import { useStockEnrichment } from "@/hooks/useStockEnrichment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { IXCard } from "@/components/entity/ix/IXCard";

const fmt = (n: number, currency = true) =>
  currency
    ? new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0)
    : new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(n || 0);

type SortKey = "name" | "stock" | "cost_value" | "sale_value" | "margin" | "margin_pct";
type StockState = "all" | "zero" | "low" | "normal" | "excess";
type MarkupBand = "all" | "negative" | "low" | "mid" | "high";

interface Filters {
  search: string;
  category: string;
  stockState: StockState;
  markupBand: MarkupBand;
  costMin: number | null;
  costMax: number | null;
  saleMin: number | null;
  saleMax: number | null;
  suppliers: string[];
  brands: string[];
}

const emptyFilters: Filters = {
  search: "",
  category: "all",
  stockState: "all",
  markupBand: "all",
  costMin: null,
  costMax: null,
  saleMin: null,
  saleMax: null,
  suppliers: [],
  brands: [],
};

const PAGE_SIZES = [25, 50, 100, 200];

export default function StockValuationPage() {
  const navigate = useNavigate();
  const { rows, summary, isLoading, isFetching, refetch } = useInventoryValuation();
  const { data: enrichment } = useStockEnrichment();
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sortKey, setSortKey] = useState<SortKey>("cost_value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // AI search state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Voice
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const handleBack = () => navigate("/dashboard/products");

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.category && set.add(r.category));
    return Array.from(set).sort();
  }, [rows]);

  const suppliers = enrichment?.suppliers || [];
  const brands = enrichment?.brands || [];

  const bounds = useMemo(() => {
    let maxCost = 0;
    let maxSale = 0;
    rows.forEach((r) => {
      if (r.total_cost_value > maxCost) maxCost = r.total_cost_value;
      if (r.total_sale_value > maxSale) maxSale = r.total_sale_value;
    });
    return {
      maxCost: Math.ceil(maxCost / 100) * 100 || 1000,
      maxSale: Math.ceil(maxSale / 100) * 100 || 1000,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const enrichMap = enrichment?.byProduct;

    return rows
      .filter((r) => {
        if (filters.category !== "all" && r.category !== filters.category) return false;
        if (tokens.length) {
          const hay = `${r.product_name || ""} ${r.sku || ""}`.toLowerCase();
          if (!tokens.every((t) => hay.includes(t))) return false;
        }
        const min = r.low_stock_threshold || 0;
        switch (filters.stockState) {
          case "zero": if (r.current_stock > 0) return false; break;
          case "low": if (!(min > 0 && r.current_stock > 0 && r.current_stock <= min)) return false; break;
          case "normal":
            if (r.current_stock <= 0) return false;
            if (min > 0 && (r.current_stock <= min || r.current_stock > min * 3)) return false;
            break;
          case "excess": if (!(min > 0 && r.current_stock > min * 3)) return false; break;
        }
        const mk = r.markup_pct;
        switch (filters.markupBand) {
          case "negative": if (!(mk < 0)) return false; break;
          case "low": if (!(mk >= 0 && mk < 15)) return false; break;
          case "mid": if (!(mk >= 15 && mk <= 50)) return false; break;
          case "high": if (!(mk > 50)) return false; break;
        }
        if (filters.costMin != null && r.total_cost_value < filters.costMin) return false;
        if (filters.costMax != null && r.total_cost_value > filters.costMax) return false;
        if (filters.saleMin != null && r.total_sale_value < filters.saleMin) return false;
        if (filters.saleMax != null && r.total_sale_value > filters.saleMax) return false;
        if (filters.suppliers.length || filters.brands.length) {
          const e = enrichMap?.get(r.product_id);
          if (filters.suppliers.length) {
            if (!e?.supplier_id || !filters.suppliers.includes(e.supplier_id)) return false;
          }
          if (filters.brands.length) {
            if (!e?.brand || !filters.brands.includes(e.brand)) return false;
          }
        }
        return true;
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
  }, [rows, filters, sortKey, sortDir, enrichment]);

  useEffect(() => { setPage(1); }, [filters, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pageTotals = useMemo(() => {
    let cost = 0, sale = 0;
    filtered.forEach((r) => { cost += r.total_cost_value; sale += r.total_sale_value; });
    return { cost, sale };
  }, [filtered]);

  const activeFilterCount =
    (filters.category !== "all" ? 1 : 0) +
    (filters.stockState !== "all" ? 1 : 0) +
    (filters.markupBand !== "all" ? 1 : 0) +
    (filters.costMin != null || filters.costMax != null ? 1 : 0) +
    (filters.saleMin != null || filters.saleMax != null ? 1 : 0) +
    (filters.suppliers.length ? 1 : 0) +
    (filters.brands.length ? 1 : 0);

  const startListening = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Reconhecimento de voz não suportado neste browser. Use Chrome ou Edge.");
      return;
    }
    const rec = new SR();
    rec.lang = "pt-PT";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0]?.transcript || "").join(" ").trim();
      if (transcript) setAiPrompt((prev) => (prev ? prev + " " : "") + transcript);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") toast.error(`Erro de voz: ${e.error}`);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };
  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  };

  const runAiFilter = async (text: string) => {
    const prompt = text.trim();
    if (!prompt) { toast.error("Escreva ou dite o que pretende encontrar"); return; }
    setAiLoading(true);
    setAiExplanation(null);
    try {
      const { data, error } = await supabase.functions.invoke("stock-ai-filter", {
        body: { prompt, categories, suppliers: suppliers.map((s) => s.name), brands },
      });
      if (error) throw error;
      if (data?.error && !data?.fallback) { toast.error(data.error); return; }
      const f = data?.filters;
      if (!f) { toast.error("Não foi possível interpretar o pedido"); return; }
      const supByName = new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id]));
      const supplierIds = (f.suppliers || [])
        .map((n: string) => supByName.get(String(n).toLowerCase()))
        .filter(Boolean) as string[];
      const catMatch = (f.categories || []).find((c: string) => categories.includes(c));
      setFilters({
        search: f.search || "",
        category: catMatch || "all",
        stockState: (f.stock_state as StockState) || "all",
        markupBand: (f.markup_band as MarkupBand) || "all",
        costMin: typeof f.cost_min === "number" ? f.cost_min : null,
        costMax: typeof f.cost_max === "number" ? f.cost_max : null,
        saleMin: typeof f.sale_min === "number" ? f.sale_min : null,
        saleMax: typeof f.sale_max === "number" ? f.sale_max : null,
        suppliers: supplierIds,
        brands: (f.brands || []).filter((b: string) => brands.includes(b)),
      });
      setAiExplanation(f.explanation || null);
      toast.success("Filtros aplicados pela IA");
    } catch (e: any) {
      toast.error(e?.message || "Falha na pesquisa IA");
    } finally {
      setAiLoading(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "SKU", "Produto", "Categoria", "Stock", "Stock mínimo",
      "Custo unit.", "Custo operacional unit.", "Custo total unit.",
      "Valor stock a custo", "PVP unit.", "Valor a PVP",
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

  const clearAll = () => {
    setFilters(emptyFilters);
    setAiPrompt("");
    setAiExplanation(null);
  };

  return (
    <DashboardLayout>
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Helmet>
        <title>Stock Valorizado (FIFO) | FastCRM</title>
        <meta name="description" content="Valorização de inventário pelo método FIFO com filtros avançados e pesquisa por IA." />
      </Helmet>

      {/* Header IX */}
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Stock Valorizado</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Valorização do inventário em tempo real pelo método FIFO (First-In, First-Out).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={exportCsv} disabled={!filtered.length} className="rounded-full">
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRefresh} disabled={refreshing || isFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || isFetching ? "animate-spin" : ""}`} />
                Atualizar dados
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao catálogo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* KPIs neutros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          title="Valor a Custo"
          value={fmt(summary?.total_cost_value || 0)}
          icon={Coins}
          loading={isLoading}
          hint={`${fmt(summary?.total_units || 0, false)} unidades`}
        />
        <KpiTile
          title="Valor a PVP"
          value={fmt(summary?.total_sale_value || 0)}
          icon={TrendingUp}
          loading={isLoading}
          hint={`${summary?.total_products || 0} produtos`}
        />
        <KpiTile
          title="Margem Latente"
          value={fmt(summary?.total_latent_margin || 0)}
          icon={Layers}
          loading={isLoading}
          hint={`${(summary?.avg_margin_pct || 0).toFixed(1)}% média`}
          valueTone={(summary?.total_latent_margin || 0) >= 0 ? "default" : "danger"}
        />
        <KpiTile
          title="Alertas"
          value={`${summary?.zero_stock_count || 0} sem stock`}
          icon={AlertTriangle}
          loading={isLoading}
          hint={`${summary?.negative_margin_count || 0} com margem negativa`}
          valueTone={(summary?.negative_margin_count || 0) > 0 ? "danger" : "default"}
        />
      </div>

      {/* Pesquisa por IA */}
      <IXCard
        title="Pesquisa por IA"
        description="Descreva por funcionalidade, marca, intervalo de preço ou estado de stock."
      >
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Sparkles className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder='ex: "terminais de presença com stock baixo e margem < 15%"'
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !aiLoading) runAiFilter(aiPrompt); }}
              className="pl-10 pr-12 h-12 rounded-full"
              disabled={aiLoading}
            />
            <Button
              type="button"
              size="icon"
              variant={listening ? "destructive" : "ghost"}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              onClick={listening ? stopListening : startListening}
              title={listening ? "Parar gravação" : "Falar (pt-PT)"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            onClick={() => runAiFilter(aiPrompt)}
            disabled={aiLoading || !aiPrompt.trim()}
            className="rounded-full h-12 px-5"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Aplicar
          </Button>
        </div>
        {listening && (
          <div className="text-xs text-destructive flex items-center gap-1.5 mt-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
            </span>
            A ouvir… fale agora
          </div>
        )}
        {aiExplanation && (
          <div className="text-xs text-muted-foreground flex items-start gap-1.5 mt-3">
            <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
            <span>{aiExplanation}</span>
          </div>
        )}
      </IXCard>

      {/* Inventário valorizado */}
      <IXCard
        title="Inventário valorizado"
        description={filtered.length ? `${filtered.length} produtos · custo ${fmt(pageTotals.cost)} · PVP ${fmt(pageTotals.sale)}` : undefined}
      >
        {/* Toolbar */}
        <div className="flex gap-2 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Procurar nome ou SKU..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 pr-10 h-12 rounded-full"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
            <SelectTrigger className="w-[180px] h-12 rounded-full"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <AdvancedFiltersSheet
            filters={filters}
            setFilters={setFilters}
            bounds={bounds}
            suppliers={suppliers}
            brands={brands}
            activeCount={activeFilterCount}
          />

          {activeFilterCount > 0 && (
            <Button variant="ghost" className="rounded-full h-12" onClick={clearAll}>
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* Desktop / tablet */}
        <div className="rounded-xl border border-border overflow-x-auto hidden md:block">
          <Table className="text-xs [&_th]:h-9 [&_th]:px-2 [&_td]:p-2 [&_td]:align-top table-fixed w-full min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer w-[34%]" onClick={() => toggleSort("name")}>Produto / SKU</TableHead>
                <TableHead className="text-right cursor-pointer w-[90px]" onClick={() => toggleSort("stock")}>Stock</TableHead>
                <TableHead className="text-right w-[110px]">Custo un.</TableHead>
                <TableHead className="text-right cursor-pointer w-[110px] border-r border-border" onClick={() => toggleSort("cost_value")}>Valor custo</TableHead>
                <TableHead className="text-right w-[120px]">PVP un.</TableHead>
                <TableHead className="text-right cursor-pointer w-[110px] border-r border-border" onClick={() => toggleSort("sale_value")}>Valor PVP</TableHead>
                <TableHead className="text-right cursor-pointer w-[100px]" onClick={() => toggleSort("margin")}>€ lucro</TableHead>
                <TableHead className="text-right cursor-pointer w-[80px]" onClick={() => toggleSort("margin_pct")}>Markup</TableHead>
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
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    Sem produtos para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => {
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
                          <Badge variant="outline" className="text-[10px] px-1.5 border-destructive/40 text-destructive">0</Badge>
                        ) : (
                          <span className={belowMin ? "text-foreground font-medium" : ""}>{fmt(r.current_stock, false)}</span>
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
                      <TableCell className="text-right font-medium border-r border-border">{fmt(r.total_cost_value)}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{fmt(r.unit_sale_price)}</div>
                        {suggested != null && delta != null && Math.abs(delta) >= 0.01 && (
                          <div className={`text-[10px] ${delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            sug. {fmt(suggested)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium border-r border-border">{fmt(r.total_sale_value)}</TableCell>
                      <TableCell className={`text-right font-medium ${r.latent_margin < 0 ? "text-destructive" : "text-foreground"}`}>
                        {fmt(r.latent_margin)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            r.markup_pct < 0
                              ? "text-[10px] px-1.5 border-destructive/40 text-destructive"
                              : r.markup_pct < 15
                              ? "text-[10px] px-1.5 border-border text-muted-foreground"
                              : "text-[10px] px-1.5 border-primary/30 text-primary"
                          }
                        >
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

        {/* Mobile */}
        <div className="md:hidden space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-3"><Skeleton className="h-16 w-full" /></div>
            ))
          ) : pageRows.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 border border-border rounded-xl text-sm">
              Sem produtos para mostrar
            </div>
          ) : (
            pageRows.map((r) => {
              const suggested = r.suggested_base_price;
              const delta = suggested != null ? r.unit_sale_price - suggested : null;
              const belowMin = r.low_stock_threshold > 0 && r.current_stock <= r.low_stock_threshold;
              return (
                <div key={r.product_id} className="rounded-xl border border-border p-3 bg-card">
                  <div className="font-medium text-sm leading-snug break-words" title={r.product_name}>{r.product_name}</div>
                  {r.sku && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.sku}</div>}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Stock</span>
                    <span className="flex items-center gap-2">
                      {r.current_stock <= 0 ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 border-destructive/40 text-destructive">0</Badge>
                      ) : (
                        <span className={belowMin ? "font-medium" : "font-medium"}>{fmt(r.current_stock, false)}</span>
                      )}
                      {r.low_stock_threshold > 0 && (
                        <span className="text-[10px] text-muted-foreground">min {fmt(r.low_stock_threshold, false)}</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/60 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Custo un.</div>
                      <div className="font-medium">{fmt(r.total_unit_cost)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Valor: {fmt(r.total_cost_value)}</div>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">PVP un.</div>
                      <div className="font-medium">{fmt(r.unit_sale_price)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Valor: {fmt(r.total_sale_value)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-border">
                    <span className="text-muted-foreground">Lucro</span>
                    <span className="flex items-center gap-2">
                      <span className={`font-medium ${r.latent_margin < 0 ? "text-destructive" : "text-foreground"}`}>{fmt(r.latent_margin)}</span>
                      <Badge
                        variant="outline"
                        className={
                          r.markup_pct < 0
                            ? "text-[10px] px-1.5 border-destructive/40 text-destructive"
                            : r.markup_pct < 15
                            ? "text-[10px] px-1.5 border-border text-muted-foreground"
                            : "text-[10px] px-1.5 border-primary/30 text-primary"
                        }
                      >
                        {r.markup_pct.toFixed(1)}%
                      </Badge>
                    </span>
                  </div>
                  {suggested != null && delta != null && Math.abs(delta) >= 0.01 && (
                    <div className={`mt-1 text-[10px] text-right ${delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      PVP sugerido: {fmt(suggested)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Paginação */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-4 mt-4 border-t border-border text-sm">
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span> produtos
              {" · "}
              <span className="hidden sm:inline">Total custo: </span>
              <strong className="text-foreground">{fmt(pageTotals.cost)}</strong>
              {" · "}
              <span className="hidden sm:inline">Total PVP: </span>
              <strong className="text-foreground">{fmt(pageTotals.sale)}</strong>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} / página</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </IXCard>
    </div>
    </DashboardLayout>
  );
}

// ===== Painel de filtros avançados =====
function AdvancedFiltersSheet({
  filters, setFilters, bounds, suppliers, brands, activeCount,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  bounds: { maxCost: number; maxSale: number };
  suppliers: { id: string; name: string }[];
  brands: string[];
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Filters>(filters);
  useEffect(() => { if (open) setLocal(filters); }, [open, filters]);

  const apply = () => { setFilters(local); setOpen(false); };
  const reset = () => setLocal({ ...local,
    stockState: "all", markupBand: "all",
    costMin: null, costMax: null, saleMin: null, saleMax: null,
    suppliers: [], brands: [],
  });

  const costMin = local.costMin ?? 0;
  const costMax = local.costMax ?? bounds.maxCost;
  const saleMin = local.saleMin ?? 0;
  const saleMax = local.saleMax ?? bounds.maxSale;

  const toggleSupplier = (id: string) => {
    setLocal({
      ...local,
      suppliers: local.suppliers.includes(id)
        ? local.suppliers.filter((x) => x !== id)
        : [...local.suppliers, id],
    });
  };
  const toggleBrand = (name: string) => {
    setLocal({
      ...local,
      brands: local.brands.includes(name)
        ? local.brands.filter((x) => x !== name)
        : [...local.brands, name],
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full h-12">
          <SlidersHorizontal className="h-4 w-4" /> Filtros
          {activeCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Filtros avançados</SheetTitle>
          <SheetDescription>Afine a lista por stock, valor, margem, fornecedor ou marca.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 my-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado de stock</Label>
              <Select value={local.stockState} onValueChange={(v: StockState) => setLocal({ ...local, stockState: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="zero">Sem stock (0)</SelectItem>
                  <SelectItem value="low">Abaixo do mínimo</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="excess">Excesso (&gt; 3× mínimo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Banda de markup</Label>
              <Select value={local.markupBand} onValueChange={(v: MarkupBand) => setLocal({ ...local, markupBand: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="negative">Margem negativa</SelectItem>
                  <SelectItem value="low">Baixa (&lt; 15%)</SelectItem>
                  <SelectItem value="mid">Média (15–50%)</SelectItem>
                  <SelectItem value="high">Alta (&gt; 50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Valor a custo (€)</Label>
                <span className="text-xs text-muted-foreground">{fmt(costMin)} – {fmt(costMax)}</span>
              </div>
              <Slider
                min={0} max={bounds.maxCost} step={Math.max(1, Math.round(bounds.maxCost / 200))}
                value={[costMin, costMax]}
                onValueChange={(v) => setLocal({
                  ...local,
                  costMin: v[0] > 0 ? v[0] : null,
                  costMax: v[1] < bounds.maxCost ? v[1] : null,
                })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Valor a PVP (€)</Label>
                <span className="text-xs text-muted-foreground">{fmt(saleMin)} – {fmt(saleMax)}</span>
              </div>
              <Slider
                min={0} max={bounds.maxSale} step={Math.max(1, Math.round(bounds.maxSale / 200))}
                value={[saleMin, saleMax]}
                onValueChange={(v) => setLocal({
                  ...local,
                  saleMin: v[0] > 0 ? v[0] : null,
                  saleMax: v[1] < bounds.maxSale ? v[1] : null,
                })}
              />
            </div>

            {suppliers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Fornecedor {local.suppliers.length > 0 && <span className="text-xs text-muted-foreground">({local.suppliers.length})</span>}
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {suppliers.map((s) => {
                    const active = local.suppliers.includes(s.id);
                    return (
                      <Badge
                        key={s.id}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleSupplier(s.id)}
                      >
                        {s.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {brands.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Marca {local.brands.length > 0 && <span className="text-xs text-muted-foreground">({local.brands.length})</span>}
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {brands.map((b) => {
                    const active = local.brands.includes(b);
                    return (
                      <Badge
                        key={b}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleBrand(b)}
                      >
                        {b}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={reset}>Limpar</Button>
          <Button onClick={apply}>Aplicar filtros</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ===== KPI tile neutro =====
function KpiTile({
  title, value, icon: Icon, hint, loading, valueTone = "default",
}: {
  title: string; value: string; icon: any; hint?: string; loading?: boolean;
  valueTone?: "default" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className={`text-2xl font-bold ${valueTone === "danger" ? "text-destructive" : "text-foreground"}`}>{value}</p>
          )}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Coins, ExternalLink, Search, ShieldAlert, Loader2, Check } from "lucide-react";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { usePricingRules, getMarginStatus } from "@/hooks/useProductPricingIntelligence";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";
import type { Product } from "@/types/product";

const ACTION_KEY = "product_market_research";

type RowState = "idle" | "running" | "ready" | "blocked" | "none" | "error";

interface Row {
  product: Product;
  state: RowState;
  /** PVP sugerido, com IVA */
  suggestedGross?: number;
  /** Equivalente sem IVA */
  suggestedNet?: number;
  marketMin?: number;
  marginPct?: number | null;
  marginBlocked?: boolean;
  topStoreUrl?: string;
  topStoreName?: string;
  error?: string;
  selected: boolean;
}

type FilterKey = "all" | "ready" | "blocked" | "none";

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const fmt = (v?: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

interface BulkMarketPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  workspaceId?: string;
  onComplete?: () => void;
}

export function BulkMarketPricingDialog({
  open,
  onOpenChange,
  products,
  workspaceId,
  onComplete,
}: BulkMarketPricingDialogProps) {
  const qc = useQueryClient();
  const { balance, getCost } = useCreditWallet();
  const { data: pricingRules = [] } = usePricingRules();

  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [applying, setApplying] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  // Só artigos com referência (SKU) podem ser pesquisados sem risco de falsos positivos.
  const eligible = useMemo(() => products.filter((p) => !!p.sku?.trim()), [products]);
  const skipped = products.length - eligible.length;
  const unitCost = getCost(ACTION_KEY) || 1;
  const totalCost = eligible.length * unitCost;
  const notEnough = balance < totalCost;

  const reset = useCallback(() => {
    setRows([]);
    setDone(0);
    setFilter("all");
  }, []);

  const runResearch = useCallback(async () => {
    if (!workspaceId || eligible.length === 0) return;
    if (notEnough) {
      triggerNoCreditsDialog({ actionLabel: "Análise de mercado em massa", creditsNeeded: totalCost });
      return;
    }

    setRunning(true);
    setDone(0);
    const initial: Row[] = eligible.map((p) => ({ product: p, state: "idle", selected: false }));
    setRows(initial);

    const setRow = (id: string, patch: Partial<Row>) =>
      setRows((prev) => prev.map((r) => (r.product.id === id ? { ...r, ...patch } : r)));

    // Fila com concorrência limitada para não esgotar limites de rede nem do fornecedor.
    const queue = [...eligible];
    const CONCURRENCY = 2;

    const worker = async () => {
      while (queue.length > 0) {
        const p = queue.shift();
        if (!p) break;
        setRow(p.id, { state: "running" });
        try {
          const vatRate = p.tax_rate_estimate_pct ?? 23;
          const marginRule = getMarginStatus(p.base_price, p.direct_cost, pricingRules, p.category);
          const { data, error } = await supabase.functions.invoke("ai-market-price-research", {
            body: {
              product_id: p.id,
              workspace_id: workspaceId,
              product_name: p.name,
              sku: p.sku ?? undefined,
              brand: (p as unknown as { brand?: string }).brand,
              barcode: (p as unknown as { barcode?: string }).barcode,
              category: p.category ?? undefined,
              cost_price: p.direct_cost ?? undefined,
              min_margin_pct: marginRule.minMargin || 15,
              vat_rate: vatRate,
            },
          });

          if (error) {
            const ctx = (error as { context?: { body?: unknown } }).context;
            const body = typeof ctx?.body === "string" ? safeParse(ctx.body) : (ctx?.body as any);
            if (body?.code === "insufficient_credits") {
              queue.length = 0;
              triggerNoCreditsDialog({
                actionLabel: "Análise de mercado em massa",
                creditsNeeded: unitCost,
              });
              setRow(p.id, { state: "error", error: "Créditos insuficientes" });
              break;
            }
            throw new Error(error.message);
          }
          if ((data as any)?.code === "insufficient_credits") {
            queue.length = 0;
            triggerNoCreditsDialog({
              actionLabel: "Análise de mercado em massa",
              creditsNeeded: unitCost,
            });
            setRow(p.id, { state: "error", error: "Créditos insuficientes" });
            break;
          }
          if ((data as any)?.error) throw new Error((data as any).error);

          const res = data as {
            grounded?: boolean;
            market_min_price?: number;
            suggested_price?: number;
            suggested_price_net?: number;
            suggested_margin_pct?: number | null;
            margin_blocked?: boolean;
            competitors?: Array<{ name?: string; url?: string; price?: number }>;
          };

          if (!res?.grounded || !res.suggested_price) {
            setRow(p.id, { state: "none", selected: false });
          } else {
            const net =
              res.suggested_price_net ??
              Math.round((res.suggested_price / (1 + vatRate / 100)) * 100) / 100;
            const top = res.competitors?.[0];
            setRow(p.id, {
              state: res.margin_blocked ? "blocked" : "ready",
              suggestedGross: res.suggested_price,
              suggestedNet: net,
              marketMin: res.market_min_price,
              marginPct: res.suggested_margin_pct ?? null,
              marginBlocked: !!res.margin_blocked,
              topStoreUrl: top?.url,
              topStoreName: top?.name || hostOf(top?.url),
              // Margem travada fica desmarcada por defeito — exige decisão consciente.
              selected: !res.margin_blocked,
            });
          }
        } catch (e) {
          setRow(p.id, {
            state: "error",
            error: e instanceof Error ? e.message : "Erro na pesquisa",
            selected: false,
          });
        } finally {
          setDone((d) => d + 1);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, eligible.length) }, worker));

    qc.invalidateQueries({ queryKey: ["credit-wallet"] });
    qc.invalidateQueries({ queryKey: ["credit-ledger"] });
    setRunning(false);
  }, [workspaceId, eligible, notEnough, totalCost, unitCost, pricingRules, qc]);

  const selectedRows = rows.filter((r) => r.selected && r.suggestedNet != null);

  const applyPrices = useCallback(async () => {
    if (selectedRows.length === 0) return;
    setApplying(true);
    let ok = 0;
    for (const row of selectedRows) {
      const p = row.product;
      // Respeita o modo de preço do artigo: com IVA guarda o PVP, sem IVA guarda o líquido.
      const value = p.tax_included ? row.suggestedGross! : row.suggestedNet!;
      const { error } = await supabase
        .from("products")
        .update({ base_price: value })
        .eq("id", p.id);
      if (!error) ok++;
    }
    setApplying(false);
    qc.invalidateQueries({ queryKey: ["products"] });
    if (ok > 0) toast.success(`${ok} preço${ok > 1 ? "s" : ""} atualizado${ok > 1 ? "s" : ""}.`);
    if (ok < selectedRows.length) toast.error(`${selectedRows.length - ok} não foram atualizados.`);
    onComplete?.();
    onOpenChange(false);
    reset();
  }, [selectedRows, qc, onComplete, onOpenChange, reset]);

  const counts = {
    all: rows.length,
    ready: rows.filter((r) => r.state === "ready").length,
    blocked: rows.filter((r) => r.state === "blocked").length,
    none: rows.filter((r) => r.state === "none" || r.state === "error").length,
  };

  const visibleRows = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "ready") return r.state === "ready";
    if (filter === "blocked") return r.state === "blocked";
    return r.state === "none" || r.state === "error";
  });

  const progress = rows.length > 0 ? Math.round((done / rows.length) * 100) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (running || applying) return;
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Análise de mercado em massa
          </DialogTitle>
          <DialogDescription>
            Procura o preço de lojas reais pela referência de cada artigo. Nunca estima preços. Os
            preços encontrados são PVP com IVA incluído e nada é alterado sem a sua confirmação.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span>
              {eligible.length} artigo{eligible.length !== 1 ? "s" : ""} com referência ={" "}
              <strong>
                {totalCost} crédito{totalCost !== 1 ? "s" : ""}
              </strong>
            </span>
            <Badge variant={notEnough ? "destructive" : "secondary"} className="ml-auto text-xs">
              Saldo: {balance}
            </Badge>
          </div>
          {skipped > 0 && (
            <p className="text-xs text-muted-foreground">
              {skipped} artigo{skipped !== 1 ? "s" : ""} sem referência ficam de fora — sem código
              não é possível confirmar a loja certa.
            </p>
          )}
          {notEnough && (
            <p className="text-xs text-destructive">
              Saldo insuficiente para analisar todos os artigos selecionados.
            </p>
          )}
        </div>

        {rows.length > 0 && (
          <div className="space-y-2">
            {running && <Progress value={progress} className="h-2" />}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["all", `Todos (${counts.all})`],
                  ["ready", `Prontos a aplicar (${counts.ready})`],
                  ["blocked", `Margem travada (${counts.blocked})`],
                  ["none", `Sem concorrente (${counts.none})`],
                ] as Array<[FilterKey, string]>
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  className="rounded-full h-7 text-xs"
                  onClick={() => setFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto rounded-lg border">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Ainda não foi feita nenhuma análise. Carregue em «Analisar preços» para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço atual</TableHead>
                  <TableHead>Loja mais barata</TableHead>
                  <TableHead className="text-right">PVP sugerido</TableHead>
                  <TableHead className="text-right">Sem IVA</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => {
                  const p = row.product;
                  const vatRate = p.tax_rate_estimate_pct ?? 23;
                  const currentGross = p.tax_included
                    ? p.base_price
                    : Math.round(p.base_price * (1 + vatRate / 100) * 100) / 100;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          disabled={row.suggestedNet == null}
                          onCheckedChange={(v) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.product.id === p.id ? { ...r, selected: !!v } : r,
                              ),
                            )
                          }
                          aria-label={`Aplicar preço a ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {fmt(currentGross)}
                        <span className="block text-[11px] text-muted-foreground">c/ IVA</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.state === "running" && (
                          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> A procurar…
                          </span>
                        )}
                        {row.state === "idle" && (
                          <span className="text-xs text-muted-foreground">Em fila</span>
                        )}
                        {row.state === "none" && (
                          <span className="text-xs text-muted-foreground">
                            Sem lojas com esta referência
                          </span>
                        )}
                        {row.state === "error" && (
                          <span className="text-xs text-destructive">{row.error}</span>
                        )}
                        {(row.state === "ready" || row.state === "blocked") && row.topStoreUrl && (
                          <a
                            href={row.topStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {row.topStoreName} {fmt(row.marketMin)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {fmt(row.suggestedGross)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(row.suggestedNet)}</TableCell>
                      <TableCell className="text-right">
                        {row.marginPct != null && (
                          <Badge
                            variant={row.marginBlocked ? "outline" : "secondary"}
                            className="text-xs"
                          >
                            {row.marginBlocked && <ShieldAlert className="h-3 w-3 mr-1" />}
                            {row.marginPct.toFixed(1)}%
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {counts.blocked > 0 && (
          <p className="text-[11px] text-amber-600 flex items-start gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-[1px]" />
            {counts.blocked} artigo{counts.blocked !== 1 ? "s" : ""} ficaria
            {counts.blocked !== 1 ? "m" : ""} abaixo da margem mínima. O preço foi travado no mínimo
            seguro e a linha ficou desmarcada.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running || applying}
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={runResearch}
            disabled={running || applying || eligible.length === 0 || notEnough}
            className="gap-2"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {running ? `A analisar ${done}/${rows.length}` : "Analisar preços"}
          </Button>
          <Button
            type="button"
            onClick={applyPrices}
            disabled={applying || running || selectedRows.length === 0}
            className="gap-2"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Aplicar preços ({selectedRows.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

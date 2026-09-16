import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { ProductStoreData } from "./useStoreAdminProducts";
import { useAutoPriceSettings } from "./useAutoPriceSettings";
import { computeUndercutPrice, totalProductCost, DEFAULT_MIN_MARGIN_PCT } from "@/lib/pricing/undercutPricing";

interface PricingIntelligenceSectionProps {
  products: ProductStoreData[];
  isLoading: boolean;
  loadingPrices: Record<string, boolean>;
  bulkProgress: { current: number; total: number } | null;
  onUpdateSinglePrice: (productId: string) => void;
  onUpdateAllPrices: () => void;
}

const eur = (v: number) => `€${v.toFixed(2)}`;

const dateLabel = (value: string | null | undefined) => {
  if (!value) return "Nunca verificado";
  return new Date(value).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export function PricingIntelligenceSection({ products, isLoading, loadingPrices, bulkProgress, onUpdateSinglePrice, onUpdateAllPrices }: PricingIntelligenceSectionProps) {
  const { settings, isLoading: settingsLoading, saveSettings, toggleExcluded } = useAutoPriceSettings();
  const [undercutDraft, setUndercutDraft] = useState<string>("");

  const undercutPct = Number(settings?.undercut_pct ?? 1);
  const minMarginPct = Number(settings?.default_min_margin_pct ?? DEFAULT_MIN_MARGIN_PCT);
  const maxDropPct = Number(settings?.max_drop_pct ?? 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Custos, margens e comparação com a concorrência.</p>
        <Button variant="outline" onClick={onUpdateAllPrices} disabled={!!bulkProgress} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${bulkProgress ? "animate-spin" : ""}`} />
          Atualizar Todos os Preços
        </Button>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="auto-price-enabled" className="text-sm font-medium">
              Ajuste automático abaixo da concorrência
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando ligado, o preço desce para {undercutPct}% abaixo da menor referência válida, sem nunca passar
              a margem mínima de {minMarginPct}% nem descer mais de {maxDropPct}% de uma só vez.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="undercut-pct" className="text-xs text-muted-foreground">Abaixo (%)</Label>
              <Input
                id="undercut-pct"
                type="number"
                min={0}
                max={50}
                step={0.5}
                className="h-8 w-20"
                value={undercutDraft !== "" ? undercutDraft : String(undercutPct)}
                onChange={(e) => setUndercutDraft(e.target.value)}
                onBlur={() => {
                  const value = Number(undercutDraft);
                  if (undercutDraft !== "" && Number.isFinite(value) && value >= 0 && value <= 50 && value !== undercutPct) {
                    saveSettings.mutate({ undercut_pct: value });
                  }
                  setUndercutDraft("");
                }}
              />
            </div>
            <Switch
              id="auto-price-enabled"
              checked={!!settings?.enabled}
              onCheckedChange={(checked) => saveSettings.mutate({ enabled: checked })}
            />
          </div>
        </div>

        {settings?.paused_reason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{settings.paused_reason}</AlertDescription>
          </Alert>
        )}

        {settings?.last_run_at && (
          <p className="text-xs text-muted-foreground">Última execução: {dateLabel(settings.last_run_at)}</p>
        )}
      </div>

      {bulkProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>A pesquisar preços da concorrência...</span>
            <span>{bulkProgress.current}/{bulkProgress.total}</span>
          </div>
          <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
        </div>
      )}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14" />
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-center">Margem</TableHead>
              <TableHead className="text-right">Concorrência</TableHead>
              <TableHead className="text-center">Δ%</TableHead>
              <TableHead className="text-right">Preço proposto</TableHead>
              <TableHead className="text-center">Automático</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sem produtos ativos</TableCell></TableRow>
            ) : (
              products.map((product) => {
                const imgIdx = product.primary_image_index ?? 0;
                const img = product.images?.[imgIdx] || product.images?.[0];
                const isLoadingPrice = loadingPrices[product.id];
                const refsCount = product.competitor_refs_count ?? 0;
                const decision = computeUndercutPrice({
                  currentPrice: product.base_price,
                  competitorLowest: product.competitor_price_low,
                  competitorRefsCount: product.competitor_refs_count,
                  totalCost: totalProductCost(product.direct_cost, product.operational_cost),
                  minMarginPct,
                  undercutPct,
                  maxDropPct,
                  taxIncluded: product.tax_included,
                  vatRatePct: product.tax_rate_estimate_pct,
                  priceOnRequest: product.price_on_request,
                  autoPriceExcluded: product.auto_price_excluded,
                });

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden">
                        {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : (
                          <div className="h-full w-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/30" /></div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{product.name}</p>
                      {product.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">{eur(product.base_price)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {product.direct_cost != null ? eur(product.direct_cost) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {product.direct_cost != null && product.base_price > 0 ? (() => {
                        const margin = ((product.base_price - product.direct_cost) / product.base_price) * 100;
                        return (
                          <Badge
                            variant={margin > 30 ? "default" : margin < 15 ? "destructive" : "secondary"}
                            className={`text-xs ${margin > 30 ? "bg-green-600 hover:bg-green-700" : margin >= 15 ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                          >
                            {margin.toFixed(0)}%
                          </Badge>
                        );
                      })() : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <div className="flex items-center justify-end gap-1">
                        {product.competitor_price_low != null && refsCount > 0 ? (
                          <div className="text-right">
                            <span className="font-medium">{eur(product.competitor_price_low)}</span>
                            {product.competitor_source && (
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={product.competitor_source}>{product.competitor_source}</p>
                            )}
                            <p className="text-[11px] text-muted-foreground">
                              {refsCount} ref. · {dateLabel(product.competitor_checked_at)}
                            </p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-muted-foreground">—</span>
                            <p className="text-[11px] text-muted-foreground">{dateLabel(product.competitor_checked_at)}</p>
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={() => onUpdateSinglePrice(product.id)} disabled={isLoadingPrice} title="Pesquisar preços da concorrência">
                          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingPrice ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {product.competitor_price_low != null && refsCount > 0 ? (() => {
                        const diff = ((product.base_price - product.competitor_price_low) / product.competitor_price_low) * 100;
                        return (
                          <Badge variant={diff > 0 ? "destructive" : diff < 0 ? "default" : "secondary"} className="text-xs">
                            {diff > 0 ? "+" : ""}{diff.toFixed(0)}%
                          </Badge>
                        );
                      })() : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {decision.shouldApply && decision.proposedPrice != null ? (
                        <div className="text-right">
                          <span className="font-medium text-green-600">{eur(decision.proposedPrice)}</span>
                          {decision.limitedByMargin && (
                            <p className="text-[11px] text-amber-600">Limitado pela margem</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {decision.reason === "no_cost"
                            ? "Sem custo"
                            : decision.reason === "no_valid_reference"
                              ? "Sem referências"
                              : decision.reason === "insufficient_margin"
                                ? "Margem insuficiente"
                                : decision.reason === "drop_too_large"
                                  ? "Descida excessiva"
                                  : decision.reason === "excluded"
                                    ? "Excluído"
                                    : decision.reason === "price_on_request"
                                      ? "Sob consulta"
                                      : "Já abaixo"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={!product.auto_price_excluded}
                        onCheckedChange={(checked) =>
                          toggleExcluded.mutate({ productId: product.id, excluded: !checked })
                        }
                        aria-label="Incluir no ajuste automático de preço"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

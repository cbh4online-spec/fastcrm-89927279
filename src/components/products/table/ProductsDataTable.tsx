import { RefObject, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Table, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, MoreHorizontal, Edit, Archive, RotateCcw, Package,
  Loader2, Eye, Trash2, ImageOff, TrendingDown, Search,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  productStatusLabels,
  type Product,
} from "@/types/product";
import { PRODUCT_COLUMNS } from "../hooks/useProductsListState";
import { InlinePriceEditor } from "./InlinePriceEditor";
import { InlineFieldEditor } from "./InlineFieldEditor";
import { MarginStatusBadge } from "../pricing/MarginStatusBadge";
import { usePricingRules } from "@/hooks/useProductPricingIntelligence";
import { calcMarginPct, calcMarkupPct, getNetPrice, getRecommendedNetPrice, getRecommendedDelta } from "@/utils/productPricing";

interface ProductsDataTableProps {
  products: Product[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onOpenDetail: (product: Product) => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  onDelete: (product: Product) => void;
  onCreate: () => void;
  columnOrder: string[];
  visibleColumns: Set<string>;
  colWidths: {
    getWidth: (id: string) => number;
    startResize: (id: string, x: number) => void;
    autoFitColumn: (id: string, ref: RefObject<HTMLTableElement | null>) => void;
  };
  tableRef: RefObject<HTMLTableElement | null>;
  getProductTypeLabel: (code: string) => string;
  getBillingTypeLabel: (code: string) => string;
  formatCurrency: (value: number, currency?: string) => string;
  toggleStorePublished: { mutate: (args: { id: string; published: boolean }) => void };
  onInlinePriceUpdate?: (id: string, field: string, value: string | number | null) => void;
  /** True when search/filters are active but returned 0 results */
  isFilteredEmpty?: boolean;
  onClearFilters?: () => void;
  pricingRules?: import("@/hooks/useProductPricingIntelligence").PricingRule[];
}

function RenderProductCell({
  product,
  columnId,
  helpers,
}: {
  product: Product;
  columnId: string;
  helpers: Pick<ProductsDataTableProps, "onOpenDetail" | "getProductTypeLabel" | "getBillingTypeLabel" | "formatCurrency" | "toggleStorePublished" | "onInlinePriceUpdate" | "pricingRules">;
}) {
  const { onOpenDetail, getProductTypeLabel, getBillingTypeLabel, formatCurrency, toggleStorePublished, onInlinePriceUpdate } = helpers;

  switch (columnId) {
    case "name": {
      const hasNoPrice = !product.base_price || product.base_price === 0;
      const hasNegativeMargin = product.direct_cost && product.direct_cost > product.base_price;
      const hasLowMargin = product.base_price && product.direct_cost && product.base_price > 0 &&
        (() => { const m = ((product.base_price - product.direct_cost!) / product.base_price) * 100; return m > 0 && m < 15; })();
      return (
        <button
          type="button"
          onClick={() => onOpenDetail(product)}
          className="flex items-center gap-2 font-medium text-left hover:text-primary hover:underline transition-colors"
        >
          {(product.images?.[0] || (product as any).product_images?.[0]?.url) ? (
            <img src={product.images?.[0] || (product as any).product_images?.[0]?.url} alt={product.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          <span className="truncate">{product.name}</span>
          {hasNoPrice && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-destructive" title="Sem preço definido" />}
          {hasNegativeMargin && <span className="flex-shrink-0" title="Margem negativa"><TrendingDown className="h-3 w-3 text-destructive" /></span>}
          {hasLowMargin && !hasNegativeMargin && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-warning" title="Margem baixa (<15%)" />}
        </button>
      );
    }
    case "sku":
      return onInlinePriceUpdate ? (
        <InlineFieldEditor
          value={product.sku ?? ""}
          type="text"
          maxLength={64}
          inputWidthClass="w-28"
          onSave={(v) => onInlinePriceUpdate(product.id, "sku", v)}
        />
      ) : product.sku ? (
        <button type="button" onClick={() => onOpenDetail(product)} className="text-muted-foreground hover:text-primary hover:underline transition-colors">
          {product.sku}
        </button>
      ) : <span>-</span>;
    case "product_type":
      return <Badge variant="outline">{getProductTypeLabel(product.product_type)}</Badge>;
    case "category":
      return onInlinePriceUpdate ? (
        <InlineFieldEditor
          value={product.category ?? ""}
          type="text"
          maxLength={64}
          inputWidthClass="w-32"
          onSave={(v) => onInlinePriceUpdate(product.id, "category", v)}
        />
      ) : product.category ? (
        <button type="button" onClick={() => onOpenDetail(product)} className="hover:text-primary hover:underline transition-colors">
          {product.category}
        </button>
      ) : <span>-</span>;
    case "base_price":
      return onInlinePriceUpdate ? (
        <InlinePriceEditor
          value={product.base_price}
          currency={product.currency}
          formatCurrency={formatCurrency}
          onSave={(v) => onInlinePriceUpdate(product.id, "base_price", v)}
        />
      ) : (
        <span>{formatCurrency(product.base_price, product.currency)}</span>
      );
    case "direct_cost":
      if (!product.direct_cost && !onInlinePriceUpdate) return <span>-</span>;
      return onInlinePriceUpdate ? (
        <InlinePriceEditor
          value={product.direct_cost || 0}
          currency={product.currency}
          formatCurrency={formatCurrency}
          onSave={(v) => onInlinePriceUpdate(product.id, "direct_cost", v)}
        />
      ) : (
        <span>{product.direct_cost ? formatCurrency(product.direct_cost, product.currency) : "-"}</span>
      );
    case "operational_cost":
      return onInlinePriceUpdate ? (
        <InlineFieldEditor
          value={product.operational_cost ?? null}
          type="currency"
          currency={product.currency}
          formatCurrency={formatCurrency}
          onSave={(v) => onInlinePriceUpdate(product.id, "operational_cost", v)}
        />
      ) : (
        <span>{product.operational_cost ? formatCurrency(product.operational_cost, product.currency) : "-"}</span>
      );
    case "margin": {
      const margin = calcMarginPct(product);
      if (margin == null) return <span>-</span>;
      const net = getNetPrice(product);
      const cost = product.direct_cost || 0;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={margin >= 30 ? "text-green-600" : margin >= 15 ? "text-yellow-600" : "text-destructive"}>
                {margin.toFixed(2)}%
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>PVP s/IVA: {formatCurrency(net, product.currency)}</p>
              <p>PVP c/IVA: {formatCurrency(product.base_price || 0, product.currency)}</p>
              <p>Custo: {formatCurrency(cost, product.currency)}</p>
              <p>Lucro: {formatCurrency(net - cost, product.currency)}</p>
              <p className="pt-1 border-t mt-1">Markup: {calcMarkupPct(product)?.toFixed(1)}%</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    case "margin_status":
      return (
        <MarginStatusBadge
          price={getNetPrice(product)}
          cost={product.direct_cost}
          category={product.category}
          rules={helpers.pricingRules || []}
          compact={false}
        />
      );
    case "recommended_price": {
      const rec = getRecommendedNetPrice(product);
      if (rec == null) return <span className="text-muted-foreground">-</span>;
      const delta = getRecommendedDelta(product);
      const isBelow = delta && delta.delta < 0;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={isBelow ? "text-amber-600 font-medium" : "text-foreground"}>
                {formatCurrency(rec, product.currency)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>PVP recomendado (s/IVA)</p>
              {delta && (
                <p className={isBelow ? "text-amber-600" : "text-emerald-600"}>
                  {isBelow ? "Abaixo" : "Acima"} em {formatCurrency(Math.abs(delta.delta), product.currency)} ({delta.deltaPct.toFixed(1)}%)
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    case "billing_type":
      return <span>{getBillingTypeLabel(product.billing_type)}</span>;
    case "billing_frequency":
      return <span>{product.billing_frequency || "-"}</span>;
    case "status":
      return <Badge variant={product.status === "active" ? "default" : "secondary"}>{productStatusLabels[product.status]}</Badge>;
    case "store_published":
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={!!(product as any).store_published}
                  onCheckedChange={(checked) => toggleStorePublished.mutate({ id: product.id, published: checked })}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {(product as any).store_published ? "Visível na loja online — clique para ocultar" : "Oculto da loja online — clique para publicar"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case "b2b_published":
      return (product as any).b2b_published !== false ? (
        <Badge variant="outline" className="text-green-600 border-green-300">Publicado</Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">Oculto</Badge>
      );
    case "total_units":
      return onInlinePriceUpdate ? (
        <InlineFieldEditor
          value={product.total_units ?? null}
          type="integer"
          min={0}
          onSave={(v) => onInlinePriceUpdate(product.id, "total_units", v)}
        />
      ) : <span>{product.total_units ?? "-"}</span>;
    case "unit_duration":
      return onInlinePriceUpdate ? (
        <InlineFieldEditor
          value={product.unit_duration ?? null}
          type="integer"
          min={0}
          display={product.unit_duration ? `${product.unit_duration} min` : undefined}
          onSave={(v) => onInlinePriceUpdate(product.id, "unit_duration", v)}
        />
      ) : <span>{product.unit_duration ? `${product.unit_duration} min` : "-"}</span>;
    case "validity_days":
      return onInlinePriceUpdate ? (
        <InlineFieldEditor
          value={product.validity_days ?? null}
          type="integer"
          min={0}
          display={product.validity_days ? `${product.validity_days} dias` : undefined}
          onSave={(v) => onInlinePriceUpdate(product.id, "validity_days", v)}
        />
      ) : <span>{product.validity_days ? `${product.validity_days} dias` : "-"}</span>;
    case "tax_rate_estimate_pct":
      return onInlinePriceUpdate ? (
        <InlineFieldEditor
          value={product.tax_rate_estimate_pct ?? null}
          type="percent"
          min={0}
          max={100}
          onSave={(v) => onInlinePriceUpdate(product.id, "tax_rate_estimate_pct", v)}
        />
      ) : <span>{product.tax_rate_estimate_pct ? `${product.tax_rate_estimate_pct}%` : "-"}</span>;
    case "commission_default":
      return onInlinePriceUpdate ? (
        <InlineFieldEditor
          value={product.commission_default ?? null}
          type="percent"
          min={0}
          max={100}
          onSave={(v) => onInlinePriceUpdate(product.id, "commission_default", v)}
        />
      ) : <span>{product.commission_default ? `${product.commission_default}%` : "-"}</span>;
    case "delivery_mode":
      return <span>{product.delivery_mode || "-"}</span>;
    case "created_at":
      return <span>{format(new Date(product.created_at), "dd/MM/yyyy", { locale: pt })}</span>;
    case "updated_at":
      return <span>{format(new Date(product.updated_at), "dd/MM/yyyy", { locale: pt })}</span>;
    default:
      return <span>-</span>;
  }
}

function getCellTooltipText(
  product: Product,
  columnId: string,
  helpers: Pick<ProductsDataTableProps, "getProductTypeLabel" | "getBillingTypeLabel" | "formatCurrency">,
): string {
  const { getProductTypeLabel, getBillingTypeLabel, formatCurrency } = helpers;
  switch (columnId) {
    case "name": return product.name || "";
    case "sku": return product.sku || "";
    case "product_type": return getProductTypeLabel(product.product_type) || "";
    case "category": return product.category || "";
    case "base_price": return product.base_price != null ? formatCurrency(product.base_price, product.currency) : "";
    case "direct_cost": return product.direct_cost != null ? formatCurrency(product.direct_cost, product.currency) : "";
    case "operational_cost": return product.operational_cost != null ? formatCurrency(product.operational_cost, product.currency) : "";
    case "margin": {
      const m = calcMarginPct(product);
      return m == null ? "" : `${m.toFixed(2)}%`;
    }
    case "recommended_price": {
      const r = getRecommendedNetPrice(product);
      return r == null ? "" : formatCurrency(r, product.currency);
    }
    case "billing_type": return getBillingTypeLabel(product.billing_type) || "";
    case "billing_frequency": return product.billing_frequency || "";
    case "status": return productStatusLabels[product.status] || "";
    case "total_units": return product.total_units != null ? String(product.total_units) : "";
    case "unit_duration": return product.unit_duration ? `${product.unit_duration} min` : "";
    case "validity_days": return product.validity_days ? `${product.validity_days} dias` : "";
    case "tax_rate_estimate_pct": return product.tax_rate_estimate_pct ? `${product.tax_rate_estimate_pct}%` : "";
    case "commission_default": return product.commission_default ? `${product.commission_default}%` : "";
    case "delivery_mode": return product.delivery_mode || "";
    case "created_at": return format(new Date(product.created_at), "dd/MM/yyyy", { locale: pt });
    case "updated_at": return format(new Date(product.updated_at), "dd/MM/yyyy", { locale: pt });
    default: return "";
  }
}

const ROW_HEIGHT = 48;

export function ProductsDataTable({
  products,
  isLoading,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onOpenDetail,
  onEdit,
  onArchive,
  onDelete,
  onCreate,
  columnOrder,
  visibleColumns,
  colWidths,
  tableRef,
  getProductTypeLabel,
  getBillingTypeLabel,
  formatCurrency,
  toggleStorePublished,
  onInlinePriceUpdate,
  isFilteredEmpty,
  onClearFilters,
  pricingRules,
}: ProductsDataTableProps) {
  const visibleCols = columnOrder.filter((colId) => visibleColumns.has(colId));
  const helpers = { onOpenDetail, getProductTypeLabel, getBillingTypeLabel, formatCurrency, toggleStorePublished, onInlinePriceUpdate, pricingRules };

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <Card className="overflow-hidden flex-1 min-h-0 flex flex-col">
      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : !products?.length ? (
        <div className="p-12 text-center text-muted-foreground">
          {isFilteredEmpty ? (
            <>
              <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
              <p className="text-sm mb-4">Os filtros aplicados não retornaram resultados. Tenta ajustar os critérios de pesquisa.</p>
              {onClearFilters && (
                <Button variant="outline" onClick={onClearFilters}>
                  Limpar filtros
                </Button>
              )}
            </>
          ) : (
            <>
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Ainda não tens produtos.</h3>
              <p className="text-sm mb-4">Cria o primeiro produto para usares em propostas e negócios.</p>
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" /> Criar Produto
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Compute total width once for header + rows */}
          {(() => null)()}
          {/* Shared horizontal scroll wrapper for header + body */}
          <div className="flex-1 min-h-0 overflow-x-auto flex flex-col">
            {(() => {
              const dataColsWidth = visibleCols.reduce((sum, cid) => sum + colWidths.getWidth(cid), 0);
              const totalWidth = 50 + dataColsWidth + 56; // checkbox + cols + actions
              return (
                <>
                  {/* Sticky header */}
                  <Table
                    ref={tableRef}
                    style={{ tableLayout: "fixed", width: totalWidth, minWidth: "100%" }}
                    className="border-b border-border flex-shrink-0"
                  >
                    <TableHeader className="bg-background">
                      <TableRow className="hover:bg-transparent">
                        <TableHead
                          className="bg-background"
                          style={{ width: 50, minWidth: 50 }}
                        >
                          <Checkbox
                            checked={products.length > 0 && products.every((p) => selectedIds.includes(p.id))}
                            onCheckedChange={onSelectAll}
                            aria-label="Selecionar todos os produtos"
                          />
                        </TableHead>
                        {visibleCols.map((colId) => {
                          const col = PRODUCT_COLUMNS.find((c) => c.id === colId);
                          if (!col) return null;
                          const w = colWidths.getWidth(col.id);
                          return (
                            <TableHead
                              key={col.id}
                              data-col-id={col.id}
                              className="relative select-none bg-background"
                              style={{ width: w, minWidth: 60, maxWidth: 600 }}
                            >
                              <span className="truncate block pr-2">{col.label}</span>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group hover:bg-primary/20 z-10"
                                onMouseDown={(e) => { e.preventDefault(); colWidths.startResize(col.id, e.clientX); }}
                                onDoubleClick={() => colWidths.autoFitColumn(col.id, tableRef)}
                              >
                                <div className="absolute right-0 top-1/4 bottom-1/4 w-px bg-border group-hover:bg-primary transition-colors" />
                              </div>
                            </TableHead>
                          );
                        })}
                        <TableHead
                          scope="col"
                          className="sticky right-0 bg-background border-l border-border text-center shadow-[-4px_0_8px_-4px_hsl(var(--foreground)/0.12)]"
                          style={{ width: 56, minWidth: 56, maxWidth: 56, zIndex: 30 }}
                        >
                          <span className="sr-only">Ações</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>

                  {/* Virtualized body — vertical scroll only, horizontal handled by parent wrapper */}
                  <div
                    ref={parentRef}
                    className="flex-1 min-h-0 overflow-y-auto overflow-x-visible"
                    style={{ minHeight: 200, width: totalWidth, minWidth: "100%" }}
                  >
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
                      {virtualizer.getVirtualItems().map((virtualRow) => {
                        const product = products[virtualRow.index];
                        return (
                          <div
                            key={product.id}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            className="group/row flex items-center border-b border-border hover:bg-muted/50 transition-colors"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: totalWidth,
                              minWidth: "100%",
                              transform: `translateY(${virtualRow.start}px)`,
                              height: ROW_HEIGHT,
                              isolation: "isolate",
                            }}
                          >
                            <div className="flex items-center px-4 flex-shrink-0" style={{ width: 50, minWidth: 50 }}>
                              <Checkbox
                                checked={selectedIds.includes(product.id)}
                                onCheckedChange={(checked) => onSelectOne(product.id, checked as boolean)}
                                aria-label={`Selecionar ${product.name}`}
                              />
                            </div>
                            {visibleCols.map((colId) => {
                              const w = colWidths.getWidth(colId);
                              const tooltipText = getCellTooltipText(product, colId, helpers);
                              return (
                                <div
                                  key={colId}
                                  data-col-id={colId}
                                  className="flex items-center px-4 text-sm flex-shrink-0 min-w-0"
                                  style={{ width: w, maxWidth: w }}
                                  title={tooltipText || undefined}
                                >
                                  <div className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap [&>*]:max-w-full [&>*]:truncate">
                                    <RenderProductCell product={product} columnId={colId} helpers={helpers} />
                                  </div>
                                </div>
                              );
                            })}
                            <div
                              className="sticky right-0 ml-auto flex items-center justify-center bg-background group-hover/row:bg-muted/50 border-l border-border shadow-[-4px_0_8px_-4px_hsl(var(--foreground)/0.12)] flex-shrink-0 transition-colors"
                              style={{ width: 56, minWidth: 56, maxWidth: 56, height: ROW_HEIGHT, zIndex: 20 }}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Ações para ${product.name}`}
                                    className="h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
                                  >
                                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => onOpenDetail(product)}>
                                    <Eye className="h-4 w-4 mr-2" aria-hidden="true" /> Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onEdit(product)}>
                                    <Edit className="h-4 w-4 mr-2" aria-hidden="true" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onArchive(product)}>
                                    {product.status === "active" ? (
                                      <><Archive className="h-4 w-4 mr-2" aria-hidden="true" /> Arquivar</>
                                    ) : (
                                      <><RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" /> Reativar</>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onDelete(product)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" /> Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Row count footer */}
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
            {products.length} produto{products.length !== 1 ? "s" : ""}
            {selectedIds.length > 0 && ` · ${selectedIds.length} selecionado${selectedIds.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      )}
    </Card>
  );
}

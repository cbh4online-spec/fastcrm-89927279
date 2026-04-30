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
import { MarginStatusBadge } from "../pricing/MarginStatusBadge";
import { usePricingRules } from "@/hooks/useProductPricingIntelligence";

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
  onInlinePriceUpdate?: (id: string, field: "base_price" | "direct_cost", value: number) => void;
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
      return product.sku ? (
        <button type="button" onClick={() => onOpenDetail(product)} className="text-muted-foreground hover:text-primary hover:underline transition-colors">
          {product.sku}
        </button>
      ) : <span>-</span>;
    case "product_type":
      return <Badge variant="outline">{getProductTypeLabel(product.product_type)}</Badge>;
    case "category":
      return product.category ? (
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
      return <span>{product.operational_cost ? formatCurrency(product.operational_cost, product.currency) : "-"}</span>;
    case "margin":
      if (product.base_price && product.direct_cost) {
        const margin = ((product.base_price - product.direct_cost) / product.base_price) * 100;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={margin >= 30 ? "text-green-600" : margin >= 15 ? "text-yellow-600" : "text-destructive"}>
                  {margin.toFixed(1)}%
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preço: {formatCurrency(product.base_price, product.currency)}</p>
                <p>Custo: {formatCurrency(product.direct_cost, product.currency)}</p>
                <p>Lucro: {formatCurrency(product.base_price - product.direct_cost, product.currency)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return <span>-</span>;
    case "margin_status":
      return (
        <MarginStatusBadge
          price={product.base_price}
          cost={product.direct_cost}
          category={product.category}
          rules={helpers.pricingRules || []}
          compact={false}
        />
      );
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
      return <span>{product.total_units ?? "-"}</span>;
    case "unit_duration":
      return <span>{product.unit_duration ? `${product.unit_duration} min` : "-"}</span>;
    case "validity_days":
      return <span>{product.validity_days ? `${product.validity_days} dias` : "-"}</span>;
    case "tax_rate_estimate_pct":
      return <span>{product.tax_rate_estimate_pct ? `${product.tax_rate_estimate_pct}%` : "-"}</span>;
    case "commission_default":
      return <span>{product.commission_default ? `${product.commission_default}%` : "-"}</span>;
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
          {/* Shared horizontal scroll wrapper for header + body */}
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex flex-col">
          {/* Sticky header */}
          <Table ref={tableRef} style={{ tableLayout: "fixed", width: "auto", minWidth: "100%" }}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]" style={{ width: 50 }}>
                  <Checkbox
                    checked={products.length > 0 && products.every((p) => selectedIds.includes(p.id))}
                    onCheckedChange={onSelectAll}
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
                      className="relative select-none"
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
                  className="sticky right-0 bg-background z-20 border-l border-border shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]"
                  style={{ width: 56, minWidth: 56, maxWidth: 56 }}
                />
              </TableRow>
            </TableHeader>
          </Table>

          {/* Virtualized body — uses same horizontal scroll as header (parent wrapper) */}
          <div
            ref={parentRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            style={{ minHeight: 200, width: "max-content", minWidth: "100%" }}
          >
            <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const product = products[virtualRow.index];
                // Compute total width of data columns to position the sticky-action column correctly
                const dataColsWidth = visibleCols.reduce((sum, cid) => sum + colWidths.getWidth(cid), 0);
                const rowWidth = 50 + dataColsWidth + 56; // checkbox + cols + actions
                return (
                  <div
                    key={product.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="flex items-center border-b border-border hover:bg-muted/50 transition-colors relative"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: rowWidth,
                      minWidth: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      height: ROW_HEIGHT,
                    }}
                  >
                    <div className="flex items-center px-4 flex-shrink-0" style={{ width: 50, minWidth: 50 }}>
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onCheckedChange={(checked) => onSelectOne(product.id, checked as boolean)}
                      />
                    </div>
                    {visibleCols.map((colId) => {
                      const w = colWidths.getWidth(colId);
                      return (
                        <div
                          key={colId}
                          data-col-id={colId}
                          className="flex items-center px-4 text-sm flex-shrink-0"
                          style={{ width: w, maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          <RenderProductCell product={product} columnId={colId} helpers={helpers} />
                        </div>
                      );
                    })}
                    <div
                      className="sticky right-0 ml-auto flex items-center justify-center bg-background border-l border-border shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] flex-shrink-0"
                      style={{ width: 56, minWidth: 56, maxWidth: 56, height: ROW_HEIGHT, zIndex: 10 }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenDetail(product)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(product)}>
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onArchive(product)}>
                            {product.status === "active" ? (
                              <><Archive className="h-4 w-4 mr-2" /> Arquivar</>
                            ) : (
                              <><RotateCcw className="h-4 w-4 mr-2" /> Reativar</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(product)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

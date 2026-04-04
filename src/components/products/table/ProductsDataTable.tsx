import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, MoreHorizontal, Edit, Archive, RotateCcw, Package,
  Loader2, Eye, Trash2, ImageOff, TrendingDown,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  productStatusLabels,
  type Product,
} from "@/types/product";
import { PRODUCT_COLUMNS } from "../hooks/useProductsListState";
import { InlinePriceEditor } from "./InlinePriceEditor";

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
  // columns
  columnOrder: string[];
  visibleColumns: Set<string>;
  colWidths: {
    getWidth: (id: string) => number;
    startResize: (id: string, x: number) => void;
    autoFitColumn: (id: string, ref: RefObject<HTMLTableElement | null>) => void;
  };
  tableRef: RefObject<HTMLTableElement | null>;
  // helpers
  getProductTypeLabel: (code: string) => string;
  getBillingTypeLabel: (code: string) => string;
  formatCurrency: (value: number, currency?: string) => string;
  toggleStorePublished: { mutate: (args: { id: string; published: boolean }) => void };
  // inline editing
  onInlinePriceUpdate?: (id: string, field: "base_price" | "direct_cost", value: number) => void;
}

function RenderProductCell({
  product,
  columnId,
  helpers,
}: {
  product: Product;
  columnId: string;
  helpers: Pick<ProductsDataTableProps, "onOpenDetail" | "getProductTypeLabel" | "getBillingTypeLabel" | "formatCurrency" | "toggleStorePublished" | "onInlinePriceUpdate">;
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
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
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
          <span className={margin >= 30 ? "text-green-600" : margin >= 15 ? "text-yellow-600" : "text-destructive"}>
            {margin.toFixed(1)}%
          </span>
        );
      }
      return <span>-</span>;
    case "billing_type":
      return <span>{getBillingTypeLabel(product.billing_type)}</span>;
    case "billing_frequency":
      return <span>{product.billing_frequency || "-"}</span>;
    case "status":
      return <Badge variant={product.status === "active" ? "default" : "secondary"}>{productStatusLabels[product.status]}</Badge>;
    case "store_published":
      return (
        <Switch
          checked={!!(product as any).store_published}
          onCheckedChange={(checked) => toggleStorePublished.mutate({ id: product.id, published: checked })}
        />
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
}: ProductsDataTableProps) {
  const visibleCols = columnOrder.filter((colId) => visibleColumns.has(colId));
  const helpers = { onOpenDetail, getProductTypeLabel, getBillingTypeLabel, formatCurrency, toggleStorePublished, onInlinePriceUpdate };

  return (
    <Card className="overflow-x-hidden">
      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : !products?.length ? (
        <div className="p-12 text-center text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">Ainda não tens produtos.</h3>
          <p className="text-sm mb-4">Cria o primeiro produto para usares em propostas e negócios.</p>
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" /> Criar Produto
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table ref={tableRef} style={{ tableLayout: "fixed", width: "auto" }}>
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
                <TableHead className="w-[50px]" style={{ width: 50 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell style={{ width: 50 }}>
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={(checked) => onSelectOne(product.id, checked as boolean)}
                    />
                  </TableCell>
                  {visibleCols.map((colId) => {
                    const w = colWidths.getWidth(colId);
                    return (
                      <TableCell
                        key={colId}
                        data-col-id={colId}
                        style={{ width: w, maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        <RenderProductCell product={product} columnId={colId} helpers={helpers} />
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

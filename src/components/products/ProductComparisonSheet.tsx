import { useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, ImageIcon } from "lucide-react";
import type { Product } from "@/types/product";

interface ProductComparisonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  formatCurrency: (value: number, currency?: string) => string;
  getProductTypeLabel: (code: string) => string;
  getBillingTypeLabel: (code: string) => string;
}

interface ComparisonRow {
  label: string;
  values: (string | number | null)[];
  highlight?: boolean;
  format?: "currency" | "percent" | "text";
}

export function ProductComparisonSheet({
  open, onOpenChange, products, formatCurrency,
  getProductTypeLabel, getBillingTypeLabel,
}: ProductComparisonSheetProps) {
  const rows = useMemo<ComparisonRow[]>(() => {
    if (products.length < 2) return [];

    const margin = (p: Product) => {
      if (!p.base_price || !p.direct_cost || p.base_price === 0) return null;
      return ((p.base_price - p.direct_cost) / p.base_price) * 100;
    };

    return [
      { label: "SKU", values: products.map(p => p.sku || "—"), format: "text" },
      { label: "Tipo", values: products.map(p => getProductTypeLabel(p.product_type)), format: "text" },
      { label: "Categoria", values: products.map(p => p.category || "—"), format: "text" },
      { label: "Preço", values: products.map(p => p.base_price ?? 0), format: "currency", highlight: true },
      { label: "Custo Direto", values: products.map(p => p.direct_cost ?? 0), format: "currency" },
      { label: "Custo Operacional", values: products.map(p => p.operational_cost ?? 0), format: "currency" },
      { label: "Margem", values: products.map(p => margin(p)), format: "percent", highlight: true },
      { label: "Cobrança", values: products.map(p => getBillingTypeLabel(p.billing_type)), format: "text" },
      { label: "Estado", values: products.map(p => p.status), format: "text" },
      { label: "Loja Online", values: products.map(p => (p as any).store_published ? "Sim" : "Não"), format: "text" },
      { label: "Imagens", values: products.map(p => p.images?.length ?? 0), format: "text" },
    ];
  }, [products, formatCurrency, getProductTypeLabel, getBillingTypeLabel]);

  const formatValue = (val: string | number | null, format?: string) => {
    if (val === null || val === undefined) return "—";
    if (format === "currency") return formatCurrency(val as number);
    if (format === "percent") return `${(val as number).toFixed(1)}%`;
    return String(val);
  };

  const isDifferent = (values: (string | number | null)[]) => {
    const normalized = values.map(v => String(v ?? ""));
    return new Set(normalized).size > 1;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Comparar Produtos ({products.length})
          </SheetTitle>
          <SheetDescription>
            Comparação lado-a-lado dos produtos selecionados
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground w-32">Campo</th>
                  {products.map(p => (
                    <th key={p.id} className="text-left py-3 px-2 font-semibold min-w-[160px]">
                      <div className="flex items-center gap-2">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="truncate max-w-[120px]">{p.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const diff = isDifferent(row.values);
                  return (
                    <tr
                      key={i}
                      className={`border-b transition-colors ${diff ? "bg-accent/30" : ""} ${row.highlight ? "font-medium" : ""}`}
                    >
                      <td className="py-2.5 px-2 text-muted-foreground text-xs uppercase tracking-wide">
                        {row.label}
                      </td>
                      {row.values.map((val, j) => (
                        <td key={j} className="py-2.5 px-2">
                          {row.label === "Margem" && val !== null ? (
                            <Badge variant={
                              (val as number) > 40 ? "default" :
                              (val as number) > 15 ? "secondary" :
                              (val as number) > 0 ? "outline" : "destructive"
                            }>
                              {formatValue(val, row.format)}
                            </Badge>
                          ) : row.label === "Estado" ? (
                            <Badge variant="outline">{String(val)}</Badge>
                          ) : (
                            <span>{formatValue(val, row.format)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

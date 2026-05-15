import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { PRODUCT_COLUMNS } from "./hooks/useProductsListState";
import { useCanViewCostMargin, COST_MARGIN_FIELDS } from "@/hooks/useCanViewCostMargin";
import type { Product } from "@/types/product";

interface ProductsExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  filteredProducts: Product[];
  formatCurrency: (value: number, currency?: string) => string;
  getProductTypeLabel: (code: string) => string;
  getBillingTypeLabel: (code: string) => string;
}

function escapeCsv(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ProductsExportDialog({
  open,
  onOpenChange,
  products,
  filteredProducts,
  formatCurrency,
  getProductTypeLabel,
  getBillingTypeLabel,
}: ProductsExportDialogProps) {
  const canViewCostMargin = useCanViewCostMargin();
  const exportableColumns = useMemo(
    () => canViewCostMargin
      ? PRODUCT_COLUMNS
      : PRODUCT_COLUMNS.filter(c => !COST_MARGIN_FIELDS.has(c.id)),
    [canViewCostMargin]
  );

  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [scope, setScope] = useState<"filtered" | "all">("filtered");
  const [selectedCols, setSelectedCols] = useState<Set<string>>(() =>
    new Set(exportableColumns.filter(c => c.defaultVisible).map(c => c.id))
  );
  const [exporting, setExporting] = useState(false);

  const toggleCol = (id: string) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sourceProducts = scope === "filtered" ? filteredProducts : products;

  const getCellValue = (product: Product, colId: string): string | number => {
    switch (colId) {
      case "name": return product.name;
      case "sku": return product.sku || "";
      case "product_type": return getProductTypeLabel(product.product_type);
      case "category": return product.category || "";
      case "base_price": return product.base_price || 0;
      case "direct_cost": return product.direct_cost || 0;
      case "operational_cost": return product.operational_cost || 0;
      case "margin":
        if (product.base_price && product.direct_cost)
          return Math.round(((product.base_price - product.direct_cost) / product.base_price) * 1000) / 10;
        return 0;
      case "billing_type": return getBillingTypeLabel(product.billing_type);
      case "billing_frequency": return product.billing_frequency || "";
      case "status": return product.status === "active" ? "Ativo" : "Arquivado";
      case "store_published": return (product as any).store_published ? "Sim" : "Não";
      case "b2b_published": return (product as any).b2b_published !== false ? "Sim" : "Não";
      case "total_units": return product.total_units ?? "";
      case "unit_duration": return product.unit_duration || "";
      case "validity_days": return product.validity_days || "";
      case "tax_rate_estimate_pct": return product.tax_rate_estimate_pct || "";
      case "commission_default": return product.commission_default || "";
      case "delivery_mode": return product.delivery_mode || "";
      case "created_at": return product.created_at ? new Date(product.created_at).toLocaleDateString("pt-PT") : "";
      case "updated_at": return product.updated_at ? new Date(product.updated_at).toLocaleDateString("pt-PT") : "";
      case "short_description": return product.short_description || "";
      case "commercial_description": return product.commercial_description || "";
      case "benefits": return Array.isArray(product.benefits) ? product.benefits.join(" | ") : "";
      case "conditions": return product.conditions || "";
      case "specifications":
        return product.specifications && typeof product.specifications === "object"
          ? Object.entries(product.specifications).map(([k, v]) => `${k}: ${v}`).join(" | ")
          : "";
      case "currency": return product.currency || "";
      case "setup_fee": return product.setup_fee || 0;
      case "recurring_fee": return product.recurring_fee || 0;
      case "target_margin_pct": return product.target_margin_pct || 0;
      case "unit_name": return product.unit_name || "";
      case "labor_hours": return product.labor_hours || 0;
      case "labor_hourly_rate": return product.labor_hourly_rate || 0;
      case "sheet_slug": return product.sheet_slug || "";
      case "demo_video_url": return product.demo_video_url || "";
      case "store_featured": return product.store_featured ? "Sim" : "Não";
      case "primary_image_url": {
        const imgs = Array.isArray(product.images) ? product.images : [];
        const idx = product.primary_image_index ?? 0;
        return imgs[idx] || imgs[0] || "";
      }
      case "margin_status": {
        if (!product.base_price || !product.direct_cost) return "";
        const pct = ((product.base_price - product.direct_cost) / product.base_price) * 100;
        if (pct < 10) return "Crítica";
        if (pct < 25) return "Baixa";
        if (pct < 50) return "Saudável";
        return "Excelente";
      }
      case "recommended_price": return (product as any).recommended_price || product.base_price || 0;
      default: return "";
    }
  };

  const handleExport = async () => {
    const cols = exportableColumns.filter(c => selectedCols.has(c.id));
    if (cols.length === 0) {
      toast.error("Seleciona pelo menos uma coluna");
      return;
    }

    setExporting(true);
    try {
      if (format === "xlsx") {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Produtos");

        // Header row
        const headerRow = ws.addRow(cols.map(c => c.label));
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
          cell.alignment = { horizontal: "left", vertical: "middle" };
          cell.border = {
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        });

        // Data rows
        for (const product of sourceProducts) {
          ws.addRow(cols.map(c => getCellValue(product, c.id)));
        }

        // Auto-width
        ws.columns.forEach((col) => {
          let maxLen = 12;
          col.eachCell?.({ includeEmpty: false }, (cell) => {
            const len = String(cell.value ?? "").length;
            if (len > maxLen) maxLen = Math.min(len, 50);
          });
          col.width = maxLen + 2;
        });

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `produtos_${new Date().toISOString().split("T")[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const csv = [
          cols.map(c => escapeCsv(c.label)).join(","),
          ...sourceProducts.map(p => cols.map(c => escapeCsv(getCellValue(p, c.id))).join(","))
        ].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `produtos_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`${sourceProducts.length} produtos exportados`);
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao exportar: " + (err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Exportar Produtos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Scope */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Âmbito</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as "filtered" | "all")}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="filtered" id="scope-filtered" />
                <Label htmlFor="scope-filtered" className="text-sm">
                  Produtos filtrados ({filteredProducts.length})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all" className="text-sm">
                  Todos os produtos ({products.length})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Format */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as "xlsx" | "csv")}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="xlsx" id="fmt-xlsx" />
                <Label htmlFor="fmt-xlsx" className="text-sm flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="csv" id="fmt-csv" />
                <Label htmlFor="fmt-csv" className="text-sm flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> CSV
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Colunas ({selectedCols.size})</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setSelectedCols(new Set(exportableColumns.map(c => c.id)))}>
                  Todas
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setSelectedCols(new Set(exportableColumns.filter(c => c.defaultVisible).map(c => c.id)))}>
                  Predefinidas
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border rounded-md p-2">
              {exportableColumns.map(col => (
                <label key={col.id} className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                  <Checkbox
                    checked={selectedCols.has(col.id)}
                    onCheckedChange={() => toggleCol(col.id)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={exporting || selectedCols.size === 0} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? "A exportar..." : "Exportar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

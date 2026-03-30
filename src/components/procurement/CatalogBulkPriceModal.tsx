import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { parseExcelFile } from "@/utils/excelUtils";

interface CatalogBulkPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
  onComplete: () => void;
}

interface ParsedPriceRow {
  supplier_name: string;
  product_name: string;
  sku?: string;
  new_price: number;
  valid: boolean;
  matched: boolean;
  supplier_product_id?: string;
}

export function CatalogBulkPriceModal({ open, onOpenChange, workspaceId, onComplete }: CatalogBulkPriceModalProps) {
  const { t } = useTranslation("procurement");
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ParsedPriceRow[]>([]);
  const [updatedCount, setUpdatedCount] = useState(0);

  const resetState = () => {
    setStep("upload");
    setRows([]);
    setUpdatedCount(0);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!workspaceId) return;

    let rawRows: Record<string, any>[] = [];
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      await new Promise<void>((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            rawRows = result.data as Record<string, any>[];
            resolve();
          },
        });
      });
    } else {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelFile(buffer);
      rawRows = result.rows as Record<string, any>[];
    }

    // Fetch existing catalog for matching
    const { data: catalog } = await supabase
      .from("supplier_products")
      .select("id, unit_price, supplier:suppliers(name), product:products(name, sku)")
      .eq("workspace_id", workspaceId);

    const catalogEntries = (catalog || []) as any[];

    const parsed: ParsedPriceRow[] = rawRows.map((raw) => {
      const supplier_name = (raw.supplier || raw.Supplier || raw.fornecedor || raw.Fornecedor || "").toString().trim();
      const product_name = (raw.product || raw.Product || raw.produto || raw.Produto || "").toString().trim();
      const sku = (raw.sku || raw.SKU || "").toString().trim();
      const priceStr = (raw.price || raw.Price || raw.preco || raw.Preço || raw.unit_price || "0").toString().replace(",", ".");
      const new_price = parseFloat(priceStr) || 0;

      // Try to match
      const match = catalogEntries.find((c) => {
        const nameMatch = c.supplier?.name?.toLowerCase() === supplier_name.toLowerCase();
        const productMatch = c.product?.name?.toLowerCase() === product_name.toLowerCase() ||
          (sku && c.product?.sku?.toLowerCase() === sku.toLowerCase());
        return nameMatch && productMatch;
      });

      return {
        supplier_name,
        product_name,
        sku: sku || undefined,
        new_price,
        valid: !!supplier_name && !!product_name && new_price > 0,
        matched: !!match,
        supplier_product_id: match?.id,
      };
    });

    setRows(parsed);
    setStep("preview");
  }, [workspaceId]);

  const handleImport = async () => {
    setStep("importing");
    const matchedRows = rows.filter(r => r.valid && r.matched && r.supplier_product_id);
    let count = 0;

    for (const row of matchedRows) {
      const { error } = await supabase
        .from("supplier_products")
        .update({ unit_price: row.new_price, updated_at: new Date().toISOString() })
        .eq("id", row.supplier_product_id!);
      if (!error) count++;
    }

    setUpdatedCount(count);
    setStep("done");
    toast.success(t("catalogPricesImported", { count }));
    onComplete();
  };

  const matchedCount = rows.filter(r => r.valid && r.matched).length;
  const unmatchedCount = rows.filter(r => r.valid && !r.matched).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("importCatalogPrices")}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t("importCatalogPricesDesc")}</p>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg border-border/50">
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">{t("dragDropHint")}</p>
            <p className="text-xs text-muted-foreground mb-4">{t("supportedFormats")}</p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="max-w-xs"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline">{t("rowsFound", { count: rows.length })}</Badge>
              <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">{t("matched")}: {matchedCount}</Badge>
              {unmatchedCount > 0 && <Badge variant="secondary">{t("unmatched")}: {unmatchedCount}</Badge>}
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>{t("supplier")}</TableHead>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("sku")}</TableHead>
                    <TableHead>{t("unitPrice")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((row, i) => (
                    <TableRow key={i} className={!row.matched ? "opacity-50" : ""}>
                      <TableCell>
                        {row.matched ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium">{row.supplier_name}</TableCell>
                      <TableCell>{row.product_name}</TableCell>
                      <TableCell>{row.sku || "—"}</TableCell>
                      <TableCell>€{row.new_price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">{t("importing")}</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-4" />
            <p className="text-sm font-medium">{t("importComplete")}</p>
            <p className="text-sm text-muted-foreground">{t("catalogPricesImported", { count: updatedCount })}</p>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>{t("cancel")}</Button>
              <Button onClick={handleImport} disabled={matchedCount === 0}>
                {t("commitImport")} ({matchedCount})
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => { resetState(); onOpenChange(false); }}>{t("closed")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
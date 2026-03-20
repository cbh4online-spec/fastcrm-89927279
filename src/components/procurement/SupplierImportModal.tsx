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
import * as XLSX from "xlsx";

interface SupplierImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
  onComplete: () => void;
}

interface ParsedRow {
  name: string;
  email?: string;
  vat_number?: string;
  phone?: string;
  category?: string;
  address?: string;
  valid: boolean;
  errors: string[];
}

export function SupplierImportModal({ open, onOpenChange, workspaceId, onComplete }: SupplierImportModalProps) {
  const { t } = useTranslation("procurement");
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  const resetState = () => {
    setStep("upload");
    setRows([]);
    setImportedCount(0);
  };

  const validateRow = (raw: Record<string, any>): ParsedRow => {
    const name = (raw.name || raw.Name || raw.nome || raw.Nome || raw.supplier || raw.Supplier || "").toString().trim();
    const email = (raw.email || raw.Email || "").toString().trim();
    const vat_number = (raw.vat_number || raw.nif || raw.NIF || raw.VAT || raw.vat || "").toString().trim();
    const phone = (raw.phone || raw.Phone || raw.telefone || raw.Telefone || "").toString().trim();
    const category = (raw.category || raw.Category || raw.categoria || raw.Categoria || "").toString().trim();
    const address = (raw.address || raw.Address || raw.morada || raw.Morada || "").toString().trim();

    const errors: string[] = [];
    if (!name) errors.push(t("nameRequired"));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(t("invalidEmail"));

    return { name, email: email || undefined, vat_number: vat_number || undefined, phone: phone || undefined, category: category || undefined, address: address || undefined, valid: errors.length === 0, errors };
  };

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const parsed = (result.data as Record<string, any>[]).map(validateRow);
          setRows(parsed);
          setStep("preview");
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[];
        const parsed = json.map(validateRow);
        setRows(parsed);
        setStep("preview");
      };
      reader.readAsArrayBuffer(file);
    }
  }, [t]);

  const handleImport = async () => {
    if (!workspaceId) return;
    setStep("importing");
    const validRows = rows.filter(r => r.valid);
    let count = 0;

    for (const row of validRows) {
      const { error } = await supabase.from("suppliers").insert({
        workspace_id: workspaceId,
        name: row.name,
        email: row.email,
        vat_number: row.vat_number,
        phone: row.phone,
        category: row.category,
        address: row.address,
        status: "active",
      });
      if (!error) count++;
    }

    setImportedCount(count);
    setStep("done");
    toast.success(t("suppliersImported", { count }));
    onComplete();
  };

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("importSuppliers")}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t("importSuppliersDesc")}</p>
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
              <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">{t("validRows", { count: validCount })}</Badge>
              {invalidCount > 0 && <Badge variant="destructive">{t("invalidRows", { count: invalidCount })}</Badge>}
            </div>
            <div className="max-h-[40vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("vatNumber")}</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>Morada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((row, i) => (
                    <TableRow key={i} className={!row.valid ? "bg-destructive/5" : ""}>
                      <TableCell>
                        {row.valid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                      </TableCell>
                      <TableCell className="font-medium">{row.name || "—"}</TableCell>
                      <TableCell>{row.email || "—"}</TableCell>
                      <TableCell>{row.vat_number || "—"}</TableCell>
                      <TableCell>{row.phone || "—"}</TableCell>
                      <TableCell>{row.category || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.address || "—"}</TableCell>
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
            <p className="text-sm text-muted-foreground">{t("suppliersImported", { count: importedCount })}</p>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>{t("cancel")}</Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                {t("importSuppliers")} ({validCount})
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
import { useState, useCallback, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertTriangle,
  Loader2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Papa from "papaparse";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  source: string;
  target: string;
}

const TARGET_FIELDS = [
  { value: "skip", label: "— Ignorar —" },
  { value: "name", label: "Nome *", required: true },
  { value: "sku", label: "SKU" },
  { value: "category", label: "Categoria" },
  { value: "base_price", label: "Preço" },
  { value: "direct_cost", label: "Custo Direto" },
  { value: "product_type", label: "Tipo de Produto" },
  { value: "billing_type", label: "Tipo de Cobrança" },
  { value: "short_description", label: "Descrição Curta" },
  { value: "unit", label: "Unidade" },
  { value: "tax_rate_estimate_pct", label: "Taxa IVA (%)" },
];

const AUTO_MAP: Record<string, string> = {
  nome: "name", name: "name", produto: "name", product: "name",
  sku: "sku", "código": "sku", code: "sku", ref: "sku", referência: "sku",
  categoria: "category", category: "category",
  preço: "base_price", preco: "base_price", price: "base_price", "preço base": "base_price",
  custo: "direct_cost", cost: "direct_cost", "custo direto": "direct_cost",
  tipo: "product_type", type: "product_type",
  cobrança: "billing_type", billing: "billing_type",
  descrição: "short_description", descricao: "short_description", description: "short_description",
  unidade: "unit", unit: "unit",
  iva: "tax_rate_estimate_pct", "taxa iva": "tax_rate_estimate_pct", tax: "tax_rate_estimate_pct",
};

function autoDetectMapping(headers: string[]): ColumnMapping[] {
  return headers.map(h => {
    const normalized = h.toLowerCase().trim();
    const target = AUTO_MAP[normalized] || "skip";
    return { source: h, target };
  });
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

function validateRows(rows: ParsedRow[], mappings: ColumnMapping[]): { valid: ParsedRow[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const nameMapping = mappings.find(m => m.target === "name");

  const valid = rows.filter((row, i) => {
    let isValid = true;

    if (nameMapping) {
      const name = row[nameMapping.source]?.trim();
      if (!name) {
        errors.push({ row: i + 1, field: "name", message: "Nome em falta" });
        isValid = false;
      }
    } else {
      errors.push({ row: i + 1, field: "name", message: "Coluna 'Nome' não mapeada" });
      isValid = false;
    }

    const priceMapping = mappings.find(m => m.target === "base_price");
    if (priceMapping) {
      const val = row[priceMapping.source]?.trim();
      if (val && isNaN(parseFloat(val.replace(",", ".")))) {
        errors.push({ row: i + 1, field: "base_price", message: `Preço inválido: "${val}"` });
        isValid = false;
      }
    }

    const costMapping = mappings.find(m => m.target === "direct_cost");
    if (costMapping) {
      const val = row[costMapping.source]?.trim();
      if (val && isNaN(parseFloat(val.replace(",", ".")))) {
        errors.push({ row: i + 1, field: "direct_cost", message: `Custo inválido: "${val}"` });
        isValid = false;
      }
    }

    return isValid;
  });

  return { valid, errors };
}

export function ProductImportWizard({ open, onOpenChange }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ inserted: number; errors: number } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setImportProgress(0);
    setImportResult(null);
    setValidationErrors([]);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "csv" || ext === "txt") {
        const text = await file.text();
        const result = Papa.parse<ParsedRow>(text, { header: true, skipEmptyLines: true });
        if (result.meta.fields && result.data.length > 0) {
          setHeaders(result.meta.fields);
          setRows(result.data);
          setMappings(autoDetectMapping(result.meta.fields));
          setStep("mapping");
        } else {
          toast.error("Ficheiro vazio ou sem colunas válidas");
        }
      } else if (ext === "xlsx" || ext === "xls") {
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet || sheet.rowCount < 2) {
          toast.error("Folha de cálculo vazia");
          return;
        }
        const headerRow = sheet.getRow(1);
        const colHeaders: string[] = [];
        headerRow.eachCell((cell, colNumber) => {
          colHeaders[colNumber - 1] = String(cell.value || `Coluna ${colNumber}`);
        });
        setHeaders(colHeaders.filter(Boolean));

        const parsedRows: ParsedRow[] = [];
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const obj: ParsedRow = {};
          row.eachCell((cell, colNumber) => {
            const h = colHeaders[colNumber - 1];
            if (h) obj[h] = String(cell.value ?? "");
          });
          if (Object.values(obj).some(v => v.trim())) parsedRows.push(obj);
        });
        setRows(parsedRows);
        setMappings(autoDetectMapping(colHeaders.filter(Boolean)));
        setStep("mapping");
      } else {
        toast.error("Formato não suportado. Use CSV ou Excel (.xlsx)");
      }
    } catch (err) {
      toast.error("Erro ao ler ficheiro: " + (err as Error).message);
    }
  }, []);

  const updateMapping = useCallback((sourceCol: string, target: string) => {
    setMappings(prev => prev.map(m => m.source === sourceCol ? { ...m, target } : m));
  }, []);

  const hasNameMapping = mappings.some(m => m.target === "name");

  const previewData = useMemo(() => {
    return rows.slice(0, 10);
  }, [rows]);

  const handleValidateAndPreview = useCallback(() => {
    const { errors } = validateRows(rows, mappings);
    setValidationErrors(errors);
    setStep("preview");
  }, [rows, mappings]);

  const handleImport = useCallback(async () => {
    if (!currentWorkspace || !user) return;
    setStep("importing");
    setImportProgress(0);

    const { valid } = validateRows(rows, mappings);
    const BATCH_SIZE = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const batch = valid.slice(i, i + BATCH_SIZE);
      const records = batch.map(row => {
        const record: Record<string, any> = {
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          status: "active",
          product_type: "simple",
          billing_type: "one_time",
          currency: "EUR",
        };
        mappings.forEach(m => {
          if (m.target === "skip") return;
          const val = row[m.source]?.trim();
          if (!val) return;
          if (m.target === "base_price" || m.target === "direct_cost" || m.target === "tax_rate_estimate_pct") {
            record[m.target] = parseFloat(val.replace(",", ".")) || 0;
          } else {
            record[m.target] = val;
          }
        });
        return record;
      });

      const { error } = await supabase.from("products").insert(records as any);
      if (error) {
        errors += batch.length;
        console.warn("Import batch error:", error);
      } else {
        inserted += batch.length;
      }
      setImportProgress(Math.round(((i + batch.length) / valid.length) * 100));
    }

    setImportResult({ inserted, errors });
    setStep("done");
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }, [rows, mappings, currentWorkspace, user, queryClient]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Produtos
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Carregue um ficheiro CSV ou Excel (.xlsx) com os seus produtos."}
            {step === "mapping" && `${rows.length} registos encontrados em "${fileName}". Mapeie as colunas.`}
            {step === "preview" && `Pré-visualização de ${Math.min(10, rows.length)} de ${rows.length} registos.`}
            {step === "importing" && "A importar produtos..."}
            {step === "done" && "Importação concluída."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="border-2 border-dashed rounded-xl p-8 text-center w-full max-w-md hover:border-primary/50 transition-colors">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Arraste um ficheiro ou clique para selecionar
                </p>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos suportados: CSV, Excel (.xlsx)
              </p>
            </div>
          )}

          {/* Step: Mapping */}
          {step === "mapping" && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-xs">
                  Mapeie cada coluna do ficheiro para o campo correspondente. Colunas com "Ignorar" serão descartadas.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                {mappings.map(m => (
                  <div key={m.source} className="flex items-center gap-3">
                    <span className="text-sm font-medium min-w-[140px] truncate">{m.source}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select value={m.target} onValueChange={val => updateMapping(m.source, val)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_FIELDS.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {m.target !== "skip" && (
                      <Badge variant="outline" className="text-[10px]">
                        Ex: {rows[0]?.[m.source] || "—"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              {!hasNameMapping && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    É obrigatório mapear pelo menos a coluna "Nome".
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-3">
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {validationErrors.length} erro{validationErrors.length > 1 ? "s" : ""} encontrado{validationErrors.length > 1 ? "s" : ""}. 
                    Linhas com erro serão ignoradas.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3 text-sm">
                <Badge variant="secondary">{rows.length} total</Badge>
                <Badge variant="default">{rows.length - validationErrors.length} válidos</Badge>
                {validationErrors.length > 0 && (
                  <Badge variant="destructive">{validationErrors.length} com erros</Badge>
                )}
              </div>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      {mappings.filter(m => m.target !== "skip").map(m => (
                        <TableHead key={m.source} className="text-xs">
                          {TARGET_FIELDS.find(f => f.value === m.target)?.label || m.target}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => {
                      const rowErrors = validationErrors.filter(e => e.row === i + 1);
                      return (
                        <TableRow key={i} className={rowErrors.length > 0 ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          {mappings.filter(m => m.target !== "skip").map(m => (
                            <TableCell key={m.source} className="text-xs max-w-[150px] truncate">
                              {row[m.source] || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              {validationErrors.length > 0 && validationErrors.length <= 10 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive">Detalhes dos erros:</p>
                  {validationErrors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      Linha {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">A importar produtos...</p>
              <Progress value={importProgress} className="w-64" />
              <p className="text-xs text-muted-foreground">{importProgress}%</p>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && importResult && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Check className="h-10 w-10 text-green-600" />
              <p className="text-lg font-medium">Importação concluída</p>
              <div className="flex gap-3">
                <Badge variant="default">{importResult.inserted} importados</Badge>
                {importResult.errors > 0 && (
                  <Badge variant="destructive">{importResult.errors} falharam</Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleValidateAndPreview} disabled={!hasNameMapping}>
                Pré-visualizar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleImport} disabled={rows.length - validationErrors.length === 0}>
                Importar {rows.length - validationErrors.length} produtos
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => { reset(); onOpenChange(false); }}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSupplierPriceImport } from "@/hooks/useSupplierPriceImport";
import { useSuppliers } from "@/hooks/useProcurement";
import { PricingRulesPanel } from "./PricingRulesPanel";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowRight, ArrowLeft, Check, Loader2, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Upload", icon: Upload },
  { label: "Mapeamento", icon: FileSpreadsheet },
  { label: "Preview", icon: AlertTriangle },
  { label: "Confirmar", icon: Check },
];

const IMPORTABLE_FIELDS = [
  { key: "supplier_sku", label: "SKU Fornecedor" },
  { key: "barcode", label: "Barcode / EAN" },
  { key: "product_name", label: "Nome do Produto" },
  { key: "net_price", label: "Preço Net" },
  { key: "rrp_price", label: "PVP / RRP" },
  { key: "discount_percent", label: "Desconto %" },
  { key: "pack_size", label: "Pack Size" },
  { key: "min_order_qty", label: "Qtd. Mínima" },
  { key: "lead_time_days", label: "Prazo Entrega (dias)" },
  { key: "category", label: "Categoria" },
  { key: "notes", label: "Notas" },
];

export function SupplierPriceImportWizard() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: suppliers } = useSuppliers(currentWorkspace?.id);
  const importHook = useSupplierPriceImport();

  const [step, setStep] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pricingMode, setPricingMode] = useState("NET_PRICE_ONLY");
  const [currency, setCurrency] = useState("EUR");
  const [globalDiscount, setGlobalDiscount] = useState<number | undefined>();
  const [marginPercent, setMarginPercent] = useState<number | undefined>();
  const [basePriceField, setBasePriceField] = useState("net_price");
  const [priceIsPerPack, setPriceIsPerPack] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Step 1: Upload
  const handleUpload = async () => {
    if (!file || !supplierId) return;
    await importHook.uploadAndParse(supplierId, file, pricingMode, currency, {
      globalDiscountPercent: globalDiscount,
      marginPercent,
      basePriceField,
      priceIsPerPack,
    });
    setStep(1);
  };

  // Step 2: Validate with mapping
  const handleValidate = async () => {
    await importHook.validate(mapping, pricingMode, {
      globalDiscountPercent: globalDiscount,
      marginPercent,
      basePriceField,
      priceIsPerPack,
    });
    setStep(2);
  };

  // Step 3 -> 4: Confirm
  const handleCommit = async () => {
    setStep(3);
    await importHook.commit();
  };

  const isLoading = ["uploading", "parsing", "validating", "committing"].includes(importHook.status);

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              i === step ? "bg-primary text-primary-foreground" :
              i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <s.icon className="h-4 w-4" />
              {s.label}
            </div>
            {i < STEPS.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Upload de Tabela de Preços</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Fornecedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  {(suppliers || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ficheiro (.xlsx ou .csv)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <PricingRulesPanel
              pricingMode={pricingMode}
              onPricingModeChange={setPricingMode}
              globalDiscount={globalDiscount}
              onGlobalDiscountChange={setGlobalDiscount}
              marginPercent={marginPercent}
              onMarginPercentChange={setMarginPercent}
              basePriceField={basePriceField}
              onBasePriceFieldChange={setBasePriceField}
              priceIsPerPack={priceIsPerPack}
              onPriceIsPerPackChange={setPriceIsPerPack}
            />

            <Button onClick={handleUpload} disabled={!file || !supplierId || isLoading} className="w-full">
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A processar...</> : "Upload e Detetar Colunas"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Column Mapping */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mapeamento de Colunas</CardTitle>
            <p className="text-sm text-muted-foreground">
              {importHook.totalRows} linhas detetadas • {importHook.columns.length} colunas
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {IMPORTABLE_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <Label className="text-sm min-w-[140px]">{field.label}</Label>
                  <Select
                    value={mapping[field.key] || "__none__"}
                    onValueChange={v => setMapping(m => ({ ...m, [field.key]: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="— Ignorar —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ignorar —</SelectItem>
                      {importHook.columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Sample rows preview */}
            {importHook.sampleRows.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm mb-2 block">Amostra (primeiras 5 linhas)</Label>
                <div className="border rounded overflow-auto max-h-48 text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        {importHook.columns.map(col => (
                          <th key={col} className="px-2 py-1 text-left font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importHook.sampleRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {importHook.columns.map(col => (
                            <td key={col} className="px-2 py-1 truncate max-w-[120px]">{String((row as any)[col] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button onClick={handleValidate} disabled={isLoading} className="flex-1">
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A validar...</> : "Validar e Fazer Matching"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview da Importação</CardTitle>
            {importHook.stats && (
              <div className="flex gap-3 mt-2">
                <Badge variant="default">{importHook.stats.matched} matched</Badge>
                <Badge variant="secondary">{importHook.stats.unmatched} sem match</Badge>
                <Badge variant="destructive">{importHook.stats.errors} erros</Badge>
                <Badge variant="outline">{importHook.stats.total} total</Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <ImportPreviewTable
              rows={importHook.previewRows}
              onMatchUpdate={importHook.updateRowMatch}
              workspaceId={currentWorkspace?.id || ""}
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button
                onClick={handleCommit}
                disabled={isLoading || (importHook.stats?.matched ?? 0) === 0}
                className="flex-1"
              >
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A importar...</> :
                  `Confirmar Importação (${importHook.stats?.matched ?? 0} produtos)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm / Done */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Resultado da Importação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {importHook.status === "committing" && (
              <div className="space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-center text-sm text-muted-foreground">A processar importação...</p>
                <Progress value={50} />
              </div>
            )}

            {importHook.status === "done" && importHook.commitStats && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Importação Concluída!</h3>
                <div className="flex justify-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{importHook.commitStats.created}</p>
                    <p className="text-xs text-muted-foreground">Criados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{importHook.commitStats.updated}</p>
                    <p className="text-xs text-muted-foreground">Atualizados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">{importHook.commitStats.errors}</p>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                </div>
                <Button onClick={() => { importHook.reset(); setStep(0); }} variant="outline">
                  Nova Importação
                </Button>
              </div>
            )}

            {importHook.status === "error" && (
              <div className="text-center space-y-3">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm text-destructive">Ocorreu um erro durante a importação.</p>
                <Button onClick={() => setStep(2)} variant="outline">Voltar ao Preview</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

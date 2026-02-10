import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Plus,
  ClipboardList,
  Pencil,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateProduct } from "@/hooks/useProducts";
import { PostCreationSuggestionsCard } from "./PostCreationSuggestionsCard";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface BatchSKUImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SKUResult {
  sku: string;
  status: "pending" | "processing" | "success" | "error";
  data?: {
    name?: string;
    commercialName?: string;
    technicalName?: string;
    description?: string;
    commercialDescription?: string;
    category?: string;
    suggestedPrice?: number;
    priceRange?: { min: number; max: number };
  };
  error?: string;
  selected?: boolean;
  editedName?: string;
  editedPrice?: string;
}

type DialogPhase = "input" | "processing" | "results" | "summary";

interface CreationSummary {
  successCount: number;
  errorCount: number;
  failedSkus: { sku: string; error: string }[];
  lastCreatedProductId?: string;
  lastCreatedProductName?: string;
}

const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 1000;

export function BatchSKUImportDialog({ open, onOpenChange }: BatchSKUImportDialogProps) {
  const [skuList, setSkuList] = useState<SKUResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [phase, setPhase] = useState<DialogPhase>("input");
  const [summary, setSummary] = useState<CreationSummary | null>(null);

  const createProduct = useCreateProduct();
  const { currentWorkspace } = useWorkspace();

  const parseSkusFromText = (text: string): string[] => {
    const lines = text.split(/[\r\n]+/).filter(Boolean);
    const skus = lines
      .map(line => line.split(/[,;|\t]/)[0]?.trim())
      .filter(sku => sku && sku.length >= 3);
    return [...new Set(skus)];
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n]+/).filter(Boolean);
      const startIndex = lines[0]?.toLowerCase().includes("sku") ? 1 : 0;
      const skus = lines.slice(startIndex)
        .map(line => line.split(/[,;|\t]/)[0]?.trim())
        .filter(sku => sku && sku.length >= 3);

      const uniqueSkus = [...new Set(skus)];
      setSkuList(uniqueSkus.map(sku => ({ sku, status: "pending", selected: true })));
      setPhase("processing");
      toast.success(`${uniqueSkus.length} SKUs carregados`);
    };

    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleManualSubmit = () => {
    const skus = parseSkusFromText(manualInput);
    if (skus.length === 0) {
      toast.error("Nenhum SKU válido encontrado");
      return;
    }
    setSkuList(skus.map(sku => ({ sku, status: "pending", selected: true })));
    setPhase("processing");
    toast.success(`${skus.length} SKUs carregados`);
  };

  const processSkus = async () => {
    setIsProcessing(true);

    const items = [...skuList];

    for (let batchStart = 0; batchStart < items.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, items.length);
      const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);

      // Mark batch as processing
      setSkuList(prev => prev.map((s, idx) =>
        batchIndices.includes(idx) ? { ...s, status: "processing" } : s
      ));

      const results = await Promise.allSettled(
        batchIndices.map(async (idx) => {
          const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
            body: { mode: "sku-search", sku: items[idx].sku },
          });
          if (error) throw error;
          return { idx, data };
        })
      );

      setSkuList(prev => {
        const next = [...prev];
        for (const result of results) {
          if (result.status === "fulfilled") {
            const { idx, data } = result.value;
            if (data.success && data.data?.found) {
              next[idx] = { ...next[idx], status: "success", data: data.data, selected: true };
            } else {
              next[idx] = { ...next[idx], status: "error", error: "Produto não encontrado", selected: false };
            }
          } else {
            const idx = batchIndices[results.indexOf(result)];
            next[idx] = {
              ...next[idx],
              status: "error",
              error: result.reason?.message || "Erro desconhecido",
              selected: false,
            };
          }
        }
        return next;
      });

      // Delay between batches
      if (batchEnd < items.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    setIsProcessing(false);
    setPhase("results");
  };

  const toggleSelection = (index: number) => {
    setSkuList(prev => prev.map((s, idx) =>
      idx === index ? { ...s, selected: !s.selected } : s
    ));
  };

  const selectAll = () => {
    setSkuList(prev => prev.map(s => ({ ...s, selected: s.status === "success" })));
  };

  const deselectAll = () => {
    setSkuList(prev => prev.map(s => ({ ...s, selected: false })));
  };

  const updateEditedName = (index: number, value: string) => {
    setSkuList(prev => prev.map((s, idx) =>
      idx === index ? { ...s, editedName: value } : s
    ));
  };

  const updateEditedPrice = (index: number, value: string) => {
    setSkuList(prev => prev.map((s, idx) =>
      idx === index ? { ...s, editedPrice: value } : s
    ));
  };

  const createSelectedProducts = async () => {
    const selected = skuList.filter(s => s.selected && s.status === "success" && s.data);

    if (selected.length === 0) {
      toast.error("Nenhum produto seleccionado");
      return;
    }

    setIsCreating(true);
    let successCount = 0;
    let errorCount = 0;
    const failedSkus: { sku: string; error: string }[] = [];
    let lastProductId: string | undefined;
    let lastProductName: string | undefined;

    for (const item of selected) {
      const finalName = item.editedName || item.data?.commercialName || item.data?.name || item.sku;
      const finalPrice = item.editedPrice ? parseFloat(item.editedPrice) : (item.data?.suggestedPrice || 0);

      try {
        const result = await createProduct.mutateAsync({
          name: finalName,
          sku: item.sku,
          short_description: item.data?.commercialDescription || item.data?.description,
          category: item.data?.category,
          base_price: finalPrice,
          product_type: "physical" as const,
          status: "active" as const,
        });
        successCount++;
        if (result?.id) {
          lastProductId = result.id;
          lastProductName = finalName;
        }
      } catch (err) {
        console.error("Failed to create product:", item.sku, err);
        errorCount++;
        failedSkus.push({
          sku: item.sku,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    // Also collect processing errors
    const processingErrors = skuList
      .filter(s => s.status === "error")
      .map(s => ({ sku: s.sku, error: s.error || "Erro na pesquisa" }));

    setIsCreating(false);
    setSummary({
      successCount,
      errorCount,
      failedSkus: [...failedSkus, ...processingErrors],
      lastCreatedProductId: lastProductId,
      lastCreatedProductName: lastProductName,
    });
    setPhase("summary");
  };

  const downloadTemplate = () => {
    const content = "SKU\nSF-IPD821WA-2PW\nHIK-DS-2CD2043G2-I\nDAH-IPC-HDW2431T-AS";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_skus.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrorReport = () => {
    if (!summary || summary.failedSkus.length === 0) return;
    const header = "SKU,Erro";
    const rows = summary.failedSkus.map(f => `"${f.sku}","${f.error}"`);
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "erros_importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetDialog = () => {
    setSkuList([]);
    setManualInput("");
    setPhase("input");
    setSummary(null);
  };

  const progress = skuList.length > 0
    ? ((skuList.filter(s => s.status !== "pending" && s.status !== "processing").length) / skuList.length) * 100
    : 0;

  const successCount = skuList.filter(s => s.status === "success").length;
  const errorCount = skuList.filter(s => s.status === "error").length;
  const selectedCount = skuList.filter(s => s.selected && s.status === "success").length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetDialog(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação em Lote de SKUs
          </DialogTitle>
          <DialogDescription>
            Carregue um CSV ou cole SKUs para pesquisar e criar produtos automaticamente com IA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Phase: Input */}
          {phase === "input" && (
            <Tabs defaultValue="paste" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="paste" className="flex-1 gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Colar SKUs
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex-1 gap-2">
                  <Upload className="h-4 w-4" />
                  Carregar CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-3 mt-3">
                <Textarea
                  placeholder={"Cole os SKUs aqui, um por linha:\n\nSF-IPD821WA-2PW\nHIK-DS-2CD2043G2-I\nDAH-IPC-HDW2431T-AS"}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <Button onClick={handleManualSubmit} disabled={!manualInput.trim()} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Carregar SKUs
                </Button>
              </TabsContent>

              <TabsContent value="csv" className="space-y-3 mt-3">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Clique para carregar ficheiro CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Uma coluna com SKUs, um por linha
                    </p>
                  </label>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descarregar Template CSV
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {/* Phase: Processing & Results */}
          {(phase === "processing" || phase === "results") && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {isProcessing ? (
                      <>A processar {skuList.filter(s => s.status === "processing").length} SKUs...</>
                    ) : (
                      <>Processados: {successCount + errorCount} de {skuList.length}</>
                    )}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {successCount}
                    </Badge>
                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      <XCircle className="h-3 w-3 mr-1" />
                      {errorCount}
                    </Badge>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} seleccionados para criar
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Seleccionar Todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Limpar Selecção
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-md">
                <div className="divide-y">
                  {skuList.map((item, idx) => (
                    <div key={item.sku} className="flex items-start gap-3 p-3 hover:bg-muted/50">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleSelection(idx)}
                        disabled={item.status !== "success"}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{item.sku}</span>
                          {item.status === "pending" && (
                            <Badge variant="outline" className="text-xs">Pendente</Badge>
                          )}
                          {item.status === "processing" && (
                            <Badge variant="outline" className="text-xs">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              A processar
                            </Badge>
                          )}
                          {item.status === "success" && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Encontrado
                            </Badge>
                          )}
                          {item.status === "error" && (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Erro
                            </Badge>
                          )}
                        </div>

                        {item.status === "success" && item.data && phase === "results" && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                              <Input
                                value={item.editedName ?? (item.data.commercialName || item.data.name || "")}
                                onChange={(e) => updateEditedName(idx, e.target.value)}
                                className="h-7 text-sm"
                                placeholder="Nome do produto"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-3 text-center">€</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.editedPrice ?? (item.data.suggestedPrice?.toString() || "")}
                                onChange={(e) => updateEditedPrice(idx, e.target.value)}
                                className="h-7 text-sm w-28"
                                placeholder="Preço"
                              />
                              {item.data.category && (
                                <Badge variant="outline" className="text-xs ml-auto">
                                  📁 {item.data.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {item.status === "success" && item.data && phase === "processing" && (
                          <div className="mt-1 space-y-1">
                            <p className="text-sm truncate">{item.data.commercialName || item.data.name}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {item.data.category && <span>📁 {item.data.category}</span>}
                              {item.data.suggestedPrice && <span>💰 €{item.data.suggestedPrice.toFixed(2)}</span>}
                            </div>
                          </div>
                        )}

                        {item.status === "error" && item.error && (
                          <p className="text-xs text-destructive mt-1">{item.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Phase: Summary */}
          {phase === "summary" && summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.successCount}</p>
                  <p className="text-xs text-green-600 dark:text-green-500">Produtos criados</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.errorCount + (summary.failedSkus.length - summary.errorCount)}</p>
                  <p className="text-xs text-red-600 dark:text-red-500">Falhas</p>
                </div>
              </div>

              {summary.failedSkus.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Relatório de Erros ({summary.failedSkus.length} SKUs)
                </Button>
              )}

              {summary.lastCreatedProductId && currentWorkspace?.id && (
                <PostCreationSuggestionsCard
                  productId={summary.lastCreatedProductId}
                  workspaceId={currentWorkspace.id}
                  productName={summary.lastCreatedProductName || ""}
                  onDismiss={() => {}}
                />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {phase === "input" && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
          )}

          {(phase === "processing" || phase === "results") && (
            <>
              <Button
                variant="outline"
                onClick={resetDialog}
                disabled={isProcessing || isCreating}
              >
                Limpar
              </Button>

              {phase === "processing" && !isProcessing && progress < 100 && (
                <Button onClick={processSkus} className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Iniciar Pesquisa IA
                </Button>
              )}

              {phase === "processing" && isProcessing && (
                <Button disabled className="flex-1">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A processar...
                </Button>
              )}

              {(phase === "results" || (phase === "processing" && progress === 100)) && (
                <Button
                  onClick={createSelectedProducts}
                  disabled={isCreating || selectedCount === 0}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A criar...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar {selectedCount} Produtos
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {phase === "summary" && (
            <Button onClick={() => { resetDialog(); onOpenChange(false); }} className="flex-1">
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

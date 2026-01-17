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
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateProduct } from "@/hooks/useProducts";

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
}

export function BatchSKUImportDialog({ open, onOpenChange }: BatchSKUImportDialogProps) {
  const [skuList, setSkuList] = useState<SKUResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  const createProduct = useCreateProduct();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n]+/).filter(Boolean);
      
      // Skip header if it looks like one
      const startIndex = lines[0]?.toLowerCase().includes("sku") ? 1 : 0;
      
      const skus = lines.slice(startIndex)
        .map(line => line.split(/[,;|\t]/)[0]?.trim())
        .filter(sku => sku && sku.length >= 3);

      const uniqueSkus = [...new Set(skus)];
      
      setSkuList(uniqueSkus.map(sku => ({
        sku,
        status: "pending",
        selected: true,
      })));
      
      toast.success(`${uniqueSkus.length} SKUs carregados`);
    };
    
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  }, []);

  const processSkus = async () => {
    setIsProcessing(true);
    
    for (let i = 0; i < skuList.length; i++) {
      setCurrentIndex(i);
      const item = skuList[i];
      
      // Update status to processing
      setSkuList(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "processing" } : s
      ));

      try {
        const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
          body: {
            mode: "sku-search",
            sku: item.sku,
          },
        });

        if (error) throw error;

        if (data.success && data.data?.found) {
          setSkuList(prev => prev.map((s, idx) => 
            idx === i ? { 
              ...s, 
              status: "success", 
              data: data.data,
              selected: true,
            } : s
          ));
        } else {
          setSkuList(prev => prev.map((s, idx) => 
            idx === i ? { 
              ...s, 
              status: "error", 
              error: "Produto não encontrado",
              selected: false,
            } : s
          ));
        }
      } catch (err) {
        setSkuList(prev => prev.map((s, idx) => 
          idx === i ? { 
            ...s, 
            status: "error", 
            error: err instanceof Error ? err.message : "Erro desconhecido",
            selected: false,
          } : s
        ));
      }

      // Small delay to avoid rate limiting
      if (i < skuList.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setIsProcessing(false);
  };

  const toggleSelection = (index: number) => {
    setSkuList(prev => prev.map((s, idx) => 
      idx === index ? { ...s, selected: !s.selected } : s
    ));
  };

  const selectAll = () => {
    setSkuList(prev => prev.map(s => ({ 
      ...s, 
      selected: s.status === "success" 
    })));
  };

  const deselectAll = () => {
    setSkuList(prev => prev.map(s => ({ ...s, selected: false })));
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

    for (const item of selected) {
      try {
        await createProduct.mutateAsync({
          name: item.data?.commercialName || item.data?.name || item.sku,
          sku: item.sku,
          short_description: item.data?.commercialDescription || item.data?.description,
          category: item.data?.category,
          base_price: item.data?.suggestedPrice || 0,
          product_type: "physical" as const,
          status: "active" as const,
        });
        successCount++;
      } catch (err) {
        console.error("Failed to create product:", item.sku, err);
        errorCount++;
      }
    }

    setIsCreating(false);

    if (successCount > 0) {
      toast.success(`${successCount} produtos criados com sucesso`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} produtos falharam`);
    }

    if (successCount > 0 && errorCount === 0) {
      onOpenChange(false);
      setSkuList([]);
    }
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

  const progress = skuList.length > 0 
    ? ((skuList.filter(s => s.status !== "pending" && s.status !== "processing").length) / skuList.length) * 100 
    : 0;

  const successCount = skuList.filter(s => s.status === "success").length;
  const errorCount = skuList.filter(s => s.status === "error").length;
  const selectedCount = skuList.filter(s => s.selected && s.status === "success").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação em Lote de SKUs
          </DialogTitle>
          <DialogDescription>
            Carregue um ficheiro CSV com SKUs para pesquisar automaticamente informações de todos os produtos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Upload Section */}
          {skuList.length === 0 && (
            <div className="space-y-4">
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

              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Descarregar Template CSV
              </Button>
            </div>
          )}

          {/* Processing Progress */}
          {skuList.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {isProcessing ? (
                      <>A processar SKU {currentIndex + 1} de {skuList.length}...</>
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

              {/* Results List */}
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
                    <div
                      key={item.sku}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleSelection(idx)}
                        disabled={item.status !== "success"}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            {item.sku}
                          </span>
                          {item.status === "pending" && (
                            <Badge variant="outline" className="text-xs">
                              Pendente
                            </Badge>
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
                        
                        {item.status === "success" && item.data && (
                          <div className="mt-1 space-y-1">
                            <p className="text-sm truncate">
                              {item.data.commercialName || item.data.name}
                            </p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {item.data.category && (
                                <span>📁 {item.data.category}</span>
                              )}
                              {item.data.suggestedPrice && (
                                <span>💰 €{item.data.suggestedPrice.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {item.status === "error" && item.error && (
                          <p className="text-xs text-destructive mt-1">
                            {item.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {skuList.length === 0 ? (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setSkuList([])}
                disabled={isProcessing || isCreating}
              >
                Limpar
              </Button>
              
              {!isProcessing && progress < 100 && (
                <Button
                  onClick={processSkus}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Loader2 className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : 'hidden'}`} />
                  Iniciar Pesquisa
                </Button>
              )}
              
              {progress === 100 && (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

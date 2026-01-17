import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  TrendingDown,
  TrendingUp,
  Store,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CompareSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSku?: string;
}

interface SourceResult {
  source: string;
  url: string;
  name?: string;
  price?: number;
  currency?: string;
  description?: string;
  imageUrl?: string;
  inStock?: boolean;
  rating?: number;
  reviews?: number;
}

interface CompareResult {
  sku: string;
  sources: SourceResult[];
  lowestPrice?: { source: string; price: number };
  highestPrice?: { source: string; price: number };
  averagePrice?: number;
}

const SOURCE_ICONS: Record<string, string> = {
  amazon: "🛒",
  aliexpress: "📦",
  kuantokusta: "🔍",
  ebay: "🏷️",
  pccomponentes: "💻",
  worten: "🔌",
  fnac: "📚",
  default: "🌐",
};

export function CompareSourcesDialog({
  open,
  onOpenChange,
  initialSku = "",
}: CompareSourcesDialogProps) {
  const [sku, setSku] = useState(initialSku);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  const searchSources = async () => {
    if (!sku || sku.length < 3) {
      toast.error("Introduza um SKU válido");
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "compare-sources",
          sku,
        },
      });

      if (error) throw error;

      if (data.success && data.data) {
        setResult(data.data);
        
        if (data.data.sources?.length === 0) {
          toast.info("Nenhuma fonte encontrada para este SKU");
        }
      } else {
        toast.error(data.error || "Falha na pesquisa");
      }
    } catch (err) {
      console.error("Compare sources error:", err);
      toast.error("Erro ao comparar fontes");
    } finally {
      setIsSearching(false);
    }
  };

  const getSourceIcon = (source: string) => {
    const lowerSource = source.toLowerCase();
    for (const [key, icon] of Object.entries(SOURCE_ICONS)) {
      if (lowerSource.includes(key)) return icon;
    }
    return SOURCE_ICONS.default;
  };

  const formatPrice = (price?: number, currency = "EUR") => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(price);
  };

  const getPriceComparison = (price?: number) => {
    if (!price || !result?.averagePrice) return null;
    
    const diff = ((price - result.averagePrice) / result.averagePrice) * 100;
    
    if (Math.abs(diff) < 5) return null;
    
    return {
      isLower: diff < 0,
      percentage: Math.abs(diff).toFixed(0),
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Comparar Fontes de Preço
          </DialogTitle>
          <DialogDescription>
            Pesquise o mesmo produto em múltiplas fontes para comparar preços, descrições e disponibilidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Introduza o SKU do produto..."
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchSources()}
              className="flex-1"
            />
            <Button onClick={searchSources} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A pesquisar...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Comparar
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {isSearching && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  A pesquisar em múltiplas fontes...
                </p>
              </div>
            </div>
          )}

          {result && !isSearching && (
            <>
              {/* Summary Cards */}
              {result.sources.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {result.lowestPrice && (
                    <Card className="p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-xs font-medium">Menor Preço</span>
                      </div>
                      <p className="text-lg font-bold mt-1">
                        {formatPrice(result.lowestPrice.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.lowestPrice.source}
                      </p>
                    </Card>
                  )}

                  {result.averagePrice && (
                    <Card className="p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <Store className="h-4 w-4" />
                        <span className="text-xs font-medium">Preço Médio</span>
                      </div>
                      <p className="text-lg font-bold mt-1">
                        {formatPrice(result.averagePrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.sources.filter(s => s.price).length} fontes
                      </p>
                    </Card>
                  )}

                  {result.highestPrice && (
                    <Card className="p-3 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-medium">Maior Preço</span>
                      </div>
                      <p className="text-lg font-bold mt-1">
                        {formatPrice(result.highestPrice.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.highestPrice.source}
                      </p>
                    </Card>
                  )}
                </div>
              )}

              {/* Sources Table */}
              <ScrollArea className="flex-1 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Fonte</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right w-[120px]">Preço</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.sources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhuma fonte encontrada para este SKU
                        </TableCell>
                      </TableRow>
                    ) : (
                      result.sources.map((source, idx) => {
                        const comparison = getPriceComparison(source.price);
                        const isLowest = result.lowestPrice?.source === source.source;
                        
                        return (
                          <TableRow key={idx} className={cn(isLowest && "bg-green-50/50 dark:bg-green-900/10")}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getSourceIcon(source.source)}</span>
                                <div>
                                  <p className="font-medium text-sm">{source.source}</p>
                                  {source.inStock !== undefined && (
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-xs",
                                        source.inStock 
                                          ? "bg-green-100 text-green-700 border-green-200" 
                                          : "bg-red-100 text-red-700 border-red-200"
                                      )}
                                    >
                                      {source.inStock ? "Em stock" : "Indisponível"}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-3">
                                {source.imageUrl && (
                                  <div className="h-12 w-12 rounded border bg-muted/50 overflow-hidden shrink-0">
                                    <img
                                      src={source.imageUrl}
                                      alt={source.name}
                                      className="h-full w-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium line-clamp-2">
                                    {source.name || "Nome não disponível"}
                                  </p>
                                  {source.rating && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      ⭐ {source.rating.toFixed(1)} 
                                      {source.reviews && ` (${source.reviews} reviews)`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="space-y-1">
                                <p className={cn(
                                  "font-bold",
                                  isLowest && "text-green-600 dark:text-green-400"
                                )}>
                                  {formatPrice(source.price, source.currency)}
                                </p>
                                {comparison && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      comparison.isLower 
                                        ? "bg-green-100 text-green-700" 
                                        : "bg-orange-100 text-orange-700"
                                    )}
                                  >
                                    {comparison.isLower ? "-" : "+"}
                                    {comparison.percentage}%
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

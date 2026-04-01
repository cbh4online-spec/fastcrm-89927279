import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, Loader2, RefreshCw } from "lucide-react";
import type { ProductStoreData } from "./useStoreAdminProducts";

interface PricingIntelligenceSectionProps {
  products: ProductStoreData[];
  isLoading: boolean;
  loadingPrices: Record<string, boolean>;
  bulkProgress: { current: number; total: number } | null;
  onUpdateSinglePrice: (productId: string) => void;
  onUpdateAllPrices: () => void;
}

export function PricingIntelligenceSection({ products, isLoading, loadingPrices, bulkProgress, onUpdateSinglePrice, onUpdateAllPrices }: PricingIntelligenceSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Custos, margens e comparação com a concorrência.</p>
        <Button variant="outline" onClick={onUpdateAllPrices} disabled={!!bulkProgress} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${bulkProgress ? "animate-spin" : ""}`} />
          Atualizar Todos os Preços
        </Button>
      </div>

      {bulkProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>A pesquisar preços da concorrência...</span>
            <span>{bulkProgress.current}/{bulkProgress.total}</span>
          </div>
          <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14" />
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-center">Margem</TableHead>
              <TableHead className="text-right">Concorrência</TableHead>
              <TableHead className="text-center">Δ%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem produtos ativos</TableCell></TableRow>
            ) : (
              products.map((product) => {
                const imgIdx = product.primary_image_index ?? 0;
                const img = product.images?.[imgIdx] || product.images?.[0];
                const isLoadingPrice = loadingPrices[product.id];
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden">
                        {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : (
                          <div className="h-full w-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/30" /></div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{product.name}</p>
                      {product.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">€{product.base_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {product.direct_cost != null ? `€${product.direct_cost.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {product.direct_cost != null && product.base_price > 0 ? (() => {
                        const margin = ((product.base_price - product.direct_cost) / product.base_price) * 100;
                        return (
                          <Badge
                            variant={margin > 30 ? "default" : margin < 15 ? "destructive" : "secondary"}
                            className={`text-xs ${margin > 30 ? "bg-green-600 hover:bg-green-700" : margin >= 15 ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                          >
                            {margin.toFixed(0)}%
                          </Badge>
                        );
                      })() : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <div className="flex items-center justify-end gap-1">
                        {product.competitor_price_low != null ? (
                          <div className="text-right">
                            <span className="font-medium">€{product.competitor_price_low.toFixed(2)}</span>
                            {product.competitor_source && (
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={product.competitor_source}>{product.competitor_source}</p>
                            )}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={() => onUpdateSinglePrice(product.id)} disabled={isLoadingPrice} title="Pesquisar preços da concorrência">
                          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingPrice ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {product.competitor_price_low != null ? (() => {
                        const diff = ((product.base_price - product.competitor_price_low) / product.competitor_price_low) * 100;
                        return (
                          <Badge variant={diff > 0 ? "destructive" : diff < 0 ? "default" : "secondary"} className="text-xs">
                            {diff > 0 ? "+" : ""}{diff.toFixed(0)}%
                          </Badge>
                        );
                      })() : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

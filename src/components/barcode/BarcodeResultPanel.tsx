import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Edit, ExternalLink, Loader2 } from "lucide-react";
import type { BarcodeLookupResult } from "@/hooks/useBarcodeLookup";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: BarcodeLookupResult | null;
  barcode: string;
  isLoading: boolean;
  onAddQty?: (productId: string) => void;
  onOpenProduct?: (productId: string) => void;
  onQuickCreate?: (barcode: string) => void;
}

export function BarcodeResultPanel({
  open,
  onOpenChange,
  result,
  barcode,
  isLoading,
  onAddQty,
  onOpenProduct,
  onQuickCreate,
}: Props) {
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">A procurar produto...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {result?.found ? "Produto Encontrado" : "Produto Não Encontrado"}
          </DialogTitle>
        </DialogHeader>

        {result?.found ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {result.images?.[0] ? (
                <img
                  src={result.images[0]}
                  alt={result.name || ""}
                  className="w-16 h-16 rounded-lg object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{result.name}</p>
                {result.sku && (
                  <p className="text-sm text-muted-foreground font-mono">{result.sku}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {result.base_price != null && (
                    <Badge variant="secondary">
                      €{Number(result.base_price).toFixed(2)}
                    </Badge>
                  )}
                  {result.stock_on_hand != null && (
                    <Badge variant="outline">Stock: {result.stock_on_hand}</Badge>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-mono">{barcode}</p>

            <div className="flex flex-col gap-2">
              {onAddQty && result.product_id && (
                <Button
                  className="w-full"
                  onClick={() => {
                    onAddQty(result.product_id!);
                    onOpenChange(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Adicionar +1
                </Button>
              )}
              {onOpenProduct && result.product_id && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onOpenProduct(result.product_id!);
                    onOpenChange(false);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir Produto
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">
                Nenhum produto encontrado com o código:
              </p>
              <p className="font-mono text-lg font-semibold mt-1">{barcode}</p>
            </div>

            {onQuickCreate && (
              <Button
                className="w-full"
                onClick={() => {
                  onQuickCreate(barcode);
                  onOpenChange(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Criar Produto Rápido
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

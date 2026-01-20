import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Medal,
  Check,
  X,
  ExternalLink,
  Plus,
  Video,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Product } from "@/types/product";
import { ProductVideoPreview } from "./ProductVideoPreview";

interface ProductComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onAddToProposal?: (product: Product) => void;
  currency?: string;
}

const SPEC_LABELS: Record<string, string> = {
  brand: "Marca",
  resolution: "Resolução",
  sensor: "Sensor",
  lens: "Lente",
  nightVision: "Visão Noturna",
  audio: "Áudio",
  connectivity: "Conectividade",
  storage: "Armazenamento",
  protection: "Proteção IP",
  wdr: "WDR",
  compression: "Compressão",
  temperature: "Temperatura",
  compatibility: "Compatibilidade",
  power: "Alimentação",
  warranty: "Garantia",
  dimensions: "Dimensões",
  weight: "Peso",
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

function extractNumericValue(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(",", ".")) : null;
}

function compareSpecs(
  specs: (string | undefined)[],
  higherIsBetter = true
): number | null {
  const numericValues = specs.map(extractNumericValue);
  const validValues = numericValues.filter((v) => v !== null) as number[];

  if (validValues.length < 2) return null;

  const bestValue = higherIsBetter
    ? Math.max(...validValues)
    : Math.min(...validValues);

  return numericValues.findIndex((v) => v === bestValue);
}

export function ProductComparisonDialog({
  open,
  onOpenChange,
  products,
  onAddToProposal,
  currency = "EUR",
}: ProductComparisonDialogProps) {
  const [showVideos, setShowVideos] = useState(false);

  // Collect all unique specification keys from all products
  const allSpecKeys = useMemo(() => {
    const keys = new Set<string>();
    products.forEach((product) => {
      if (product.specifications) {
        Object.keys(product.specifications).forEach((key) => keys.add(key));
      }
    });
    return Array.from(keys);
  }, [products]);

  // Determine winner for each spec
  const specWinners = useMemo(() => {
    const winners: Record<string, number | null> = {};

    allSpecKeys.forEach((key) => {
      const values = products.map((p) => p.specifications?.[key] as string | undefined);

      // Specs where higher is better
      const higherIsBetter = [
        "resolution",
        "nightVision",
        "storage",
        "protection",
      ].includes(key);

      winners[key] = compareSpecs(values, higherIsBetter);
    });

    return winners;
  }, [products, allSpecKeys]);

  // Price winner (lower is better)
  const priceWinner = useMemo(() => {
    const prices = products.map((p) => p.base_price || 0);
    if (prices.every((p) => p === 0)) return null;
    const minPrice = Math.min(...prices.filter((p) => p > 0));
    return prices.findIndex((p) => p === minPrice);
  }, [products]);

  // Margin winner (higher is better)
  const marginWinner = useMemo(() => {
    const margins = products.map((p) => {
      if (!p.base_price || !p.direct_cost) return 0;
      return ((p.base_price - p.direct_cost) / p.base_price) * 100;
    });
    if (margins.every((m) => m === 0)) return null;
    const maxMargin = Math.max(...margins);
    return margins.findIndex((m) => m === maxMargin);
  }, [products]);

  if (products.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Comparar Produtos ({products.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="min-w-[600px]">
            {/* Product Headers */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `180px repeat(${products.length}, 1fr)` }}>
              <div className="font-medium text-muted-foreground">Produto</div>
              {products.map((product, index) => (
                <div key={product.id} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {index === 0 && products.length > 1 && (
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    )}
                    {index === 1 && products.length > 1 && (
                      <Medal className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="font-semibold text-sm line-clamp-2">{product.name}</p>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  )}
                  <Badge variant="outline" className="mt-1 text-xs">
                    {product.category || "Sem categoria"}
                  </Badge>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Prices Row */}
            <div
              className="grid gap-4 py-2 items-center"
              style={{ gridTemplateColumns: `180px repeat(${products.length}, 1fr)` }}
            >
              <div className="font-medium">Preço Base</div>
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className={`text-center font-semibold ${
                    priceWinner === index ? "text-green-600" : ""
                  }`}
                >
                  {product.base_price
                    ? formatCurrency(product.base_price, currency)
                    : "-"}
                  {priceWinner === index && (
                    <Badge className="ml-2 bg-green-100 text-green-700 text-xs">
                      Melhor
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Margin Row */}
            <div
              className="grid gap-4 py-2 items-center bg-muted/50 rounded"
              style={{ gridTemplateColumns: `180px repeat(${products.length}, 1fr)` }}
            >
              <div className="font-medium pl-2">Margem</div>
              {products.map((product, index) => {
                const margin =
                  product.base_price && product.direct_cost
                    ? ((product.base_price - product.direct_cost) / product.base_price) * 100
                    : null;
                return (
                  <div
                    key={product.id}
                    className={`text-center ${
                      marginWinner === index ? "text-green-600 font-semibold" : ""
                    }`}
                  >
                    {margin !== null ? `${margin.toFixed(1)}%` : "-"}
                    {marginWinner === index && margin !== null && (
                      <Badge className="ml-2 bg-green-100 text-green-700 text-xs">
                        Melhor
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            {/* Specifications */}
            <div className="space-y-1">
              <p className="font-semibold mb-3">Especificações Técnicas</p>

              {allSpecKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum produto tem especificações definidas
                </p>
              ) : (
                allSpecKeys.map((key, rowIndex) => (
                  <div
                    key={key}
                    className={`grid gap-4 py-2 items-center ${
                      rowIndex % 2 === 0 ? "bg-muted/30" : ""
                    } rounded`}
                    style={{
                      gridTemplateColumns: `180px repeat(${products.length}, 1fr)`,
                    }}
                  >
                    <div className="text-sm text-muted-foreground pl-2">
                      {SPEC_LABELS[key] || key}
                    </div>
                    {products.map((product, pIndex) => {
                      const value = product.specifications?.[key] as string | undefined;
                      const isWinner = specWinners[key] === pIndex;
                      return (
                        <div
                          key={product.id}
                          className={`text-center text-sm ${
                            isWinner ? "font-semibold text-green-600" : ""
                          }`}
                        >
                          {value || "-"}
                          {isWinner && value && (
                            <ArrowLeft className="inline-block ml-1 h-3 w-3 text-green-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <Separator className="my-4" />

            {/* Videos Section */}
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVideos(!showVideos)}
                className="gap-2"
              >
                <Video className="h-4 w-4" />
                {showVideos ? "Esconder Vídeos" : "Ver Vídeos Demo"}
              </Button>

              {showVideos && (
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${products.length}, 1fr)`,
                  }}
                >
                  {products.map((product) => (
                    <div key={product.id} className="text-center">
                      {product.demo_video_url ? (
                        <ProductVideoPreview
                          videoUrl={product.demo_video_url}
                          productName={product.name}
                          compact
                        />
                      ) : (
                        <div className="p-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                          Sem vídeo
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Actions */}
            {onAddToProposal && (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${products.length}, 1fr)`,
                }}
              >
                {products.map((product) => (
                  <Button
                    key={product.id}
                    onClick={() => onAddToProposal(product)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar à Proposta
                  </Button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

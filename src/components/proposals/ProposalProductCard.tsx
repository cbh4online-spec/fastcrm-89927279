import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Video, FileText, Package } from "lucide-react";
import { Product, ProductImage } from "@/types/product";

interface ProposalProductCardProps {
  product: Product;
  images?: ProductImage[];
  quantity?: number;
  priceOverride?: number;
  discount?: number;
  showSpecs?: boolean;
  showVideo?: boolean;
  showImage?: boolean;
  onToggleSpecs?: (show: boolean) => void;
  onToggleVideo?: (show: boolean) => void;
  currency?: string;
  readOnly?: boolean;
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

export function ProposalProductCard({
  product,
  images = [],
  quantity = 1,
  priceOverride,
  discount = 0,
  showSpecs = true,
  showVideo = true,
  showImage = true,
  onToggleSpecs,
  onToggleVideo,
  currency = "EUR",
  readOnly = false,
}: ProposalProductCardProps) {
  const mainImage = images.find((img) => img.position === 0) || images[0];
  const unitPrice = priceOverride ?? product.base_price ?? 0;
  const discountedPrice = unitPrice * (1 - discount / 100);
  const totalPrice = discountedPrice * quantity;

  const specs = product.specifications || {};
  const specEntries = Object.entries(specs).filter(([_, v]) => v);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Image */}
          {showImage && (
            <div className="w-24 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
              {mainImage ? (
                <img
                  src={mainImage.url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold line-clamp-1">{product.name}</h4>
                {product.sku && (
                  <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                )}
                {product.category && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {product.category}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  {formatCurrency(totalPrice, currency)}
                </p>
                {quantity > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {quantity} × {formatCurrency(discountedPrice, currency)}
                  </p>
                )}
                {discount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    -{discount}%
                  </Badge>
                )}
              </div>
            </div>

            {product.short_description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {product.short_description}
              </p>
            )}
          </div>
        </div>

        {/* Toggles (non-readonly mode) */}
        {!readOnly && (onToggleSpecs || onToggleVideo) && (
          <>
            <Separator />
            <div className="flex items-center gap-4 p-3 bg-muted/50">
              {onToggleSpecs && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={showSpecs}
                    onCheckedChange={(checked) => onToggleSpecs(!!checked)}
                  />
                  <FileText className="h-4 w-4" />
                  Incluir ficha técnica
                </label>
              )}
              {onToggleVideo && product.demo_video_url && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={showVideo}
                    onCheckedChange={(checked) => onToggleVideo(!!checked)}
                  />
                  <Video className="h-4 w-4" />
                  Incluir vídeo demo
                </label>
              )}
            </div>
          </>
        )}

        {/* Technical Specifications */}
        {showSpecs && specEntries.length > 0 && (
          <>
            <Separator />
            <div className="p-4 bg-muted/30">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Especificações Técnicas
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between py-1 border-b border-dashed border-border/50"
                  >
                    <span className="text-muted-foreground">
                      {SPEC_LABELS[key] || key}
                    </span>
                    <span className="font-medium">{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Video Link */}
        {showVideo && product.demo_video_url && (
          <>
            <Separator />
            <div className="p-3 flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                Vídeo de Demonstração
              </span>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1"
              >
                <a
                  href={product.demo_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver Vídeo
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

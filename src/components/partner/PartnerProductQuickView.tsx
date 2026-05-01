import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, FileText, FlaskConical, Stethoscope } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import type {
  PartnerCatalogProduct,
  PartnerCatalogVariant,
} from "@/hooks/partner/usePartnerCatalog";
import { VariantPicker } from "./VariantPicker";

interface PartnerProductQuickViewProps {
  product: PartnerCatalogProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (args: {
    product: PartnerCatalogProduct;
    variant: PartnerCatalogVariant | null;
  }) => void;
}

/**
 * Quick view do produto B2B em modal com 4 tabs.
 * Não navega: mantém o utilizador no catálogo.
 */
export function PartnerProductQuickView({
  product,
  open,
  onOpenChange,
  onAddToCart,
}: PartnerProductQuickViewProps) {
  const hasVariants = !!product && product.variants.length > 0;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const selectedVariant = useMemo<PartnerCatalogVariant | null>(() => {
    if (!product || !hasVariants) return null;
    return (
      product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0]
    );
  }, [product, hasVariants, selectedVariantId]);

  if (!product) return null;

  const effectivePrice =
    selectedVariant?.pricing?.price_net ??
    selectedVariant?.base_price ??
    product.pricing?.price_net ??
    product.base_price ??
    0;

  const effectivePvp =
    selectedVariant?.pricing?.pvp_recommended ??
    product.pricing?.pvp_recommended ??
    product.pvp_recommended;

  const effectiveImage = selectedVariant?.images?.[0] ?? product.image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            {product.category && <Badge variant="outline">{product.category}</Badge>}
            {selectedVariant?.sku && (
              <span className="text-xs">SKU: {selectedVariant.sku}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Imagem + selector */}
          <div className="space-y-4">
            {effectiveImage ? (
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                <img
                  src={effectiveImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {hasVariants && (
              <VariantPicker
                variants={product.variants}
                selectedId={selectedVariant?.id ?? null}
                onChange={setSelectedVariantId}
                allowBackorder={product.allow_backorder}
              />
            )}
          </div>

          {/* Pricing + tabs */}
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{formatMoneyEur(effectivePrice)}</p>
              {effectivePvp != null && (
                <p className="text-sm text-muted-foreground">
                  PVP recomendado: {formatMoneyEur(effectivePvp)}
                </p>
              )}
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => onAddToCart({ product, variant: selectedVariant })}
              disabled={!product.b2b_sellable}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao carrinho
            </Button>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="text-xs gap-1">
                  <FileText className="h-3 w-3" /> Geral
                </TabsTrigger>
                <TabsTrigger value="usage" className="text-xs gap-1">
                  <Package className="h-3 w-3" /> Uso
                </TabsTrigger>
                <TabsTrigger value="specs" className="text-xs gap-1">
                  <FlaskConical className="h-3 w-3" /> Specs
                </TabsTrigger>
                <TabsTrigger value="clinical" className="text-xs gap-1">
                  <Stethoscope className="h-3 w-3" /> Clínico
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="text-sm space-y-2 mt-3">
                {product.description ? (
                  <p className="whitespace-pre-line">{product.description}</p>
                ) : (
                  <p className="text-muted-foreground">Sem descrição disponível.</p>
                )}
              </TabsContent>
              <TabsContent value="usage" className="text-sm mt-3">
                <p className="text-muted-foreground">
                  Modo de utilização ainda não preenchido.
                </p>
              </TabsContent>
              <TabsContent value="specs" className="text-sm mt-3">
                {selectedVariant && Object.keys(selectedVariant.variant_attributes).length > 0 ? (
                  <dl className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedVariant.variant_attributes).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-muted-foreground">{k}</dt>
                        <dd className="font-medium">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-muted-foreground">Sem especificações.</p>
                )}
              </TabsContent>
              <TabsContent value="clinical" className="text-sm mt-3">
                <p className="text-muted-foreground">
                  Informação clínica ainda não preenchida.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

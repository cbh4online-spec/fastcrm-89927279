import { useEffect, useMemo, useState } from "react";
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
import {
  Plus,
  Package,
  FileText,
  FlaskConical,
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  PartnerCatalogProduct,
  PartnerCatalogVariant,
} from "@/hooks/partner/usePartnerCatalog";
import { VariantPicker } from "./VariantPicker";

interface PartnerProductQuickViewProps {
  product: PartnerCatalogProduct | null;
  /** Variante pré-seleccionada (vinda do card). Sincroniza com o picker. */
  initialVariantId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (args: {
    product: PartnerCatalogProduct;
    variant: PartnerCatalogVariant | null;
  }) => void;
}

function StockBadge({
  status,
  allowBackorder,
  qty,
}: {
  status: string | null;
  allowBackorder: boolean;
  qty: number | null;
}) {
  if (status === "in_stock") {
    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-200 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Em stock{qty != null ? ` (${qty})` : ""}
      </Badge>
    );
  }
  if (status === "low_stock") {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-200 gap-1">
        <AlertCircle className="h-3 w-3" />
        Stock baixo{qty != null ? ` (${qty})` : ""}
      </Badge>
    );
  }
  if (status === "out_of_stock") {
    return allowBackorder ? (
      <Badge variant="outline" className="text-amber-600 border-amber-200 gap-1">
        <AlertCircle className="h-3 w-3" />
        Sob encomenda
      </Badge>
    ) : (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Esgotado
      </Badge>
    );
  }
  return null;
}

/**
 * Quick view do produto B2B.
 * - Sincroniza com a variante seleccionada no card (initialVariantId).
 * - Preço, SKU, MOQ, pack, stock e imagem refletem SEMPRE a variante escolhida.
 * - Sem navegação: tudo acontece dentro do modal.
 */
export function PartnerProductQuickView({
  product,
  initialVariantId,
  open,
  onOpenChange,
  onAddToCart,
}: PartnerProductQuickViewProps) {
  const hasVariants = !!product && product.variants.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialVariantId ?? null,
  );

  // Sincroniza quando o modal abre com novo produto/variante.
  useEffect(() => {
    if (open && product) {
      const fallback = hasVariants ? product.variants[0].id : null;
      setSelectedVariantId(initialVariantId ?? fallback);
    }
  }, [open, product, initialVariantId, hasVariants]);

  const selectedVariant = useMemo<PartnerCatalogVariant | null>(() => {
    if (!product || !hasVariants) return null;
    return (
      product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0]
    );
  }, [product, hasVariants, selectedVariantId]);

  if (!product) return null;

  // Resolve TODOS os campos efectivos da variante (ou fallback ao pai).
  const effective = useMemo(() => {
    if (selectedVariant) {
      const pricing = selectedVariant.pricing;
      return {
        sku: selectedVariant.sku ?? product.sku,
        priceNet: pricing?.price_net ?? selectedVariant.base_price ?? 0,
        pvp: pricing?.pvp_recommended ?? null,
        margin: pricing?.gross_margin_pct ?? null,
        priceSource: pricing?.price_source,
        moq: selectedVariant.min_order_quantity ?? product.moq ?? 1,
        packSize: selectedVariant.pack_size ?? product.pack_size ?? 1,
        stockStatus: selectedVariant.stock_status,
        stockQty: selectedVariant.stock_quantity,
        image: selectedVariant.images?.[0] ?? product.image_url,
        unitLabel: selectedVariant.variant_label,
      };
    }
    const pricing = product.pricing;
    return {
      sku: product.sku,
      priceNet: pricing?.price_net ?? product.base_price ?? 0,
      pvp: pricing?.pvp_recommended ?? product.pvp_recommended,
      margin: pricing?.gross_margin_pct ?? null,
      priceSource: pricing?.price_source,
      moq: product.moq,
      packSize: product.pack_size,
      stockStatus: product.stock_status,
      stockQty: null as number | null,
      image: product.image_url,
      unitLabel: null as string | null,
    };
  }, [product, selectedVariant]);

  const isOutOfStock =
    !product.allow_backorder && effective.stockStatus === "out_of_stock";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {product.name}
            {effective.unitLabel && (
              <Badge variant="secondary" className="text-sm font-normal">
                {effective.unitLabel}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            {product.category && <Badge variant="outline">{product.category}</Badge>}
            {effective.sku && <span className="text-xs">SKU: {effective.sku}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Imagem + selector */}
          <div className="space-y-4">
            {effective.image ? (
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                <img
                  src={effective.image}
                  alt={`${product.name}${effective.unitLabel ? ` ${effective.unitLabel}` : ""}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {hasVariants && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Selecionar variante
                </p>
                <VariantPicker
                  variants={product.variants}
                  selectedId={selectedVariant?.id ?? null}
                  onChange={setSelectedVariantId}
                  allowBackorder={product.allow_backorder}
                />
              </div>
            )}
          </div>

          {/* Pricing + meta + tabs */}
          <div className="space-y-4">
            <div className="space-y-2 p-4 rounded-lg bg-muted/40 border">
              <div className="flex items-baseline gap-2">
                <p
                  className={cn(
                    "text-3xl font-bold",
                    isOutOfStock && "text-muted-foreground",
                  )}
                >
                  {formatMoneyEur(effective.priceNet)}
                </p>
                <span className="text-xs text-muted-foreground">/ unidade</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {effective.priceSource && effective.priceSource !== "base" && (
                  <Badge variant="outline" className="text-xs">
                    {effective.priceSource === "price_list"
                      ? "Preço Lista"
                      : "Desc. Tier"}
                  </Badge>
                )}
                {effective.margin != null && (
                  <Badge
                    variant="outline"
                    className="text-xs text-emerald-600 border-emerald-200"
                  >
                    Margem {effective.margin.toFixed(1)}%
                  </Badge>
                )}
                <StockBadge
                  status={effective.stockStatus}
                  allowBackorder={product.allow_backorder}
                  qty={effective.stockQty}
                />
              </div>

              {effective.pvp != null && (
                <p className="text-sm text-muted-foreground">
                  PVP recomendado: {formatMoneyEur(effective.pvp)}
                </p>
              )}

              <div className="flex gap-4 pt-2 text-xs text-muted-foreground border-t">
                <div>
                  <span className="block uppercase tracking-wide">MOQ</span>
                  <span className="font-medium text-foreground">{effective.moq}</span>
                </div>
                <div>
                  <span className="block uppercase tracking-wide">Pack</span>
                  <span className="font-medium text-foreground">
                    {effective.packSize}
                  </span>
                </div>
                {effective.stockQty != null && (
                  <div>
                    <span className="block uppercase tracking-wide">Stock</span>
                    <span className="font-medium text-foreground">
                      {effective.stockQty}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => onAddToCart({ product, variant: selectedVariant })}
              disabled={!product.b2b_sellable || isOutOfStock}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao carrinho
              {effective.unitLabel && ` — ${effective.unitLabel}`}
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
                {selectedVariant &&
                Object.keys(selectedVariant.variant_attributes).length > 0 ? (
                  <dl className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedVariant.variant_attributes).map(
                      ([k, v]) => (
                        <div key={k}>
                          <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                            {k}
                          </dt>
                          <dd className="font-medium">{String(v)}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                ) : (
                  <p className="text-muted-foreground">
                    Sem especificações para esta variante.
                  </p>
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

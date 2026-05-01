import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers, Eye, Package } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  PartnerCatalogProduct,
  PartnerCatalogVariant,
} from "@/hooks/partner/usePartnerCatalog";
import { VariantPicker } from "./VariantPicker";
import { ProductImageSearchPopover } from "./ProductImageSearchPopover";

interface PartnerProductCardProps {
  product: PartnerCatalogProduct;
  onAddToCart: (args: {
    product: PartnerCatalogProduct;
    variant: PartnerCatalogVariant | null;
  }) => void;
  onOpenDetails?: (product: PartnerCatalogProduct, variantId: string | null) => void;
}

const VARIANT_STORAGE_PREFIX = "partner-variant-";

/**
 * Card de produto do catálogo B2B.
 *
 * - Variantes via pills inline (≤4) ou dropdown (>4) — selecção sem navegar.
 * - Botão "Ver detalhes" abre o quick view modal (sem perder a posição na lista).
 * - A variante seleccionada persiste por sessão (sessionStorage) para sobreviver
 *   a refilters e remounts da grid.
 */
export function PartnerProductCard({
  product,
  onAddToCart,
  onOpenDetails,
}: PartnerProductCardProps) {
  const hasVariants = product.variants.length > 0;

  const storageKey = `${VARIANT_STORAGE_PREFIX}${product.id}`;

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() => {
    if (!hasVariants) return null;
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored && product.variants.some((v) => v.id === stored)) {
        return stored;
      }
    }
    return product.variants[0].id;
  });

  // Persiste a escolha do utilizador.
  useEffect(() => {
    if (selectedVariantId && typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, selectedVariantId);
    }
  }, [selectedVariantId, storageKey]);

  const selectedVariant = useMemo<PartnerCatalogVariant | null>(() => {
    if (!hasVariants) return null;
    return product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];
  }, [hasVariants, product.variants, selectedVariantId]);

  // Resolve campos efectivos consoante variante seleccionada (ou produto base).
  const effective = useMemo(() => {
    if (selectedVariant) {
      const pricing = selectedVariant.pricing;
      const variantImage = selectedVariant.images?.[0] ?? null;
      return {
        sku: selectedVariant.sku,
        priceNet: pricing?.price_net ?? selectedVariant.base_price ?? 0,
        pvp: pricing?.pvp_recommended ?? null,
        margin: pricing?.gross_margin_pct ?? null,
        priceSource: pricing?.price_source,
        moq: selectedVariant.min_order_quantity ?? 1,
        packSize: selectedVariant.pack_size ?? 1,
        stockStatus: selectedVariant.stock_status,
        image: variantImage ?? product.image_url,
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
      image: product.image_url,
    };
  }, [product, selectedVariant]);

  const isOutOfStock =
    !product.allow_backorder && effective.stockStatus === "out_of_stock";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <button
        type="button"
        onClick={() => onOpenDetails?.(product, selectedVariant?.id ?? null)}
        className="aspect-square bg-muted relative overflow-hidden block w-full text-left"
        aria-label={`Ver detalhes de ${product.name}`}
      >
        {effective.image ? (
          <img
            src={effective.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        {hasVariants && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 gap-1 backdrop-blur bg-background/80"
          >
            <Layers className="h-3 w-3" />
            {product.variants.length}
          </Badge>
        )}
        {isOutOfStock && (
          <Badge
            variant="destructive"
            className="absolute top-2 left-2 backdrop-blur"
          >
            Esgotado
          </Badge>
        )}
      </button>
      {/* Pesquisa de imagens (overlay sobre a imagem) — fora do <button> para evitar nested interactive */}
      <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
        {/* Posicionado por cima do canto superior esquerdo do card */}
      </div>

      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div>
          <p className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </p>
          {effective.sku && (
            <p className="text-xs text-muted-foreground">SKU: {effective.sku}</p>
          )}
        </div>

        {/* Selector inline (pills ou dropdown) */}
        {hasVariants && (
          <VariantPicker
            variants={product.variants}
            selectedId={selectedVariantId}
            onChange={setSelectedVariantId}
            allowBackorder={product.allow_backorder}
          />
        )}

        {/* Pricing */}
        <div className="space-y-1">
          <p className={cn("text-lg font-bold", isOutOfStock && "text-muted-foreground")}>
            {formatMoneyEur(effective.priceNet)}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {effective.priceSource && effective.priceSource !== "base" && (
              <Badge variant="outline" className="text-xs">
                {effective.priceSource === "price_list" ? "Preço Lista" : "Desc. Tier"}
              </Badge>
            )}
            {effective.margin != null && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                Margem {effective.margin.toFixed(1)}%
              </Badge>
            )}
          </div>
          {effective.pvp != null && (
            <p className="text-xs text-muted-foreground">
              PVP: {formatMoneyEur(effective.pvp)}
            </p>
          )}
        </div>

        {/* MOQ / Pack */}
        {(effective.moq > 1 || effective.packSize > 1) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {effective.moq > 1 && <span>MOQ: {effective.moq}</span>}
            {effective.packSize > 1 && <span>Pack: {effective.packSize}</span>}
          </div>
        )}

        <div className="flex gap-2 mt-auto">
          {onOpenDetails && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenDetails(product, selectedVariant?.id ?? null)}
              aria-label="Ver detalhes"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAddToCart({ product, variant: selectedVariant })}
            disabled={!product.b2b_sellable || isOutOfStock}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

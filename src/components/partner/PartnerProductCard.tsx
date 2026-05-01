import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Layers } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import type {
  PartnerCatalogProduct,
  PartnerCatalogVariant,
} from "@/hooks/partner/usePartnerCatalog";

interface PartnerProductCardProps {
  product: PartnerCatalogProduct;
  onAddToCart: (args: {
    product: PartnerCatalogProduct;
    variant: PartnerCatalogVariant | null;
  }) => void;
}

/**
 * Card de produto do catálogo B2B.
 *
 * - Quando o produto tem variantes (modo 'grouped' na categoria), mostra um
 *   selector de variante; preço, MOQ, pack e SKU mudam consoante a escolha.
 * - Quando não tem variantes, comporta-se como um card simples.
 *
 * Mantém-se puramente apresentacional: chama `onAddToCart` com o produto
 * e a variante seleccionada (ou null) para o handler na página decidir.
 */
export function PartnerProductCard({ product, onAddToCart }: PartnerProductCardProps) {
  const hasVariants = product.variants.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants ? product.variants[0].id : null,
  );

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

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {effective.image && (
        <div className="aspect-square bg-muted relative overflow-hidden">
          <img
            src={effective.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {hasVariants && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 gap-1 backdrop-blur bg-background/80"
            >
              <Layers className="h-3 w-3" />
              {product.variants.length} variantes
            </Badge>
          )}
        </div>
      )}

      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div>
          <p className="font-medium text-sm line-clamp-2">{product.name}</p>
          {effective.sku && (
            <p className="text-xs text-muted-foreground">SKU: {effective.sku}</p>
          )}
        </div>

        {/* Selector de variante quando aplicável */}
        {hasVariants && (
          <Select
            value={selectedVariantId ?? undefined}
            onValueChange={(v) => setSelectedVariantId(v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Escolher variante" />
            </SelectTrigger>
            <SelectContent>
              {product.variants.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.variant_label || v.sku || "Variante"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Pricing */}
        <div className="space-y-1">
          <p className="text-lg font-bold">{formatMoneyEur(effective.priceNet)}</p>
          {effective.priceSource && effective.priceSource !== "base" && (
            <Badge variant="outline" className="text-xs">
              {effective.priceSource === "price_list" ? "Preço Lista" : "Desc. Tier"}
            </Badge>
          )}
          {effective.pvp != null && (
            <p className="text-xs text-muted-foreground">PVP: {formatMoneyEur(effective.pvp)}</p>
          )}
          {effective.margin != null && (
            <p className="text-xs text-green-600">Margem: {effective.margin.toFixed(1)}%</p>
          )}
        </div>

        {/* MOQ / Pack */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {effective.moq > 1 && <span>MOQ: {effective.moq}</span>}
          {effective.packSize > 1 && <span>Pack: {effective.packSize}</span>}
        </div>

        <Button
          size="sm"
          className="w-full mt-auto"
          onClick={() => onAddToCart({ product, variant: selectedVariant })}
          disabled={!product.b2b_sellable}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </CardContent>
    </Card>
  );
}

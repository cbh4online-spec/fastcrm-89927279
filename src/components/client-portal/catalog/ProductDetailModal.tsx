import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductImageGallery } from "./ProductImageGallery";
import { ProductOverviewTab } from "./ProductOverviewTab";
import { ProductUsageTab } from "./ProductUsageTab";
import { ProductSpecsTab } from "./ProductSpecsTab";
import { ProductAttributeTags } from "./ProductAttributeTags";
import { ProductTagsFooter } from "./ProductTagsFooter";
import { calculateVAT, calculateGross } from "@/types/order-note";
import { formatCurrency } from "@/lib/formatters";
import {
  Minus,
  Plus,
  ShoppingCart,
  Package,
  Tag,
  FileText,
  Sparkles,
  BookOpen,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

// View product_b2b_content não está nos types gerados → cast pontual
const sb = supabase as any;

interface Product {
  id: string;
  name: string;
  sku: string | null;
  short_description: string | null;
  commercial_description: string | null;
  base_price: number;
  category: string | null;
  subcategory?: string | null;
  line?: string | null;
  images: string[] | null;
  primary_image_index: number | null;
  specifications: Record<string, unknown> | null;
  status: string;
  workspace_id: string;
  benefits?: string[] | null;
  conditions?: string | null;
  tags?: string[] | null;
  recommended_frequency?: string | null;
  typical_duration_days?: number | null;
  included_quantity?: number | null;
  unit_name?: string | null;
  pack_size?: number | null;
  min_order_quantity?: number | null;
  order_multiple?: number | null;
  delivery_estimate?: string | null;
  stock_status?: string | null;
  weight_net?: number | null;
  weight_gross?: number | null;
  volume_value?: number | null;
  volume_unit?: string | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  package_type?: string | null;
  barcode?: string | null;
  demo_video_url?: string | null;
  brand_logo_url?: string | null;
  compare_at_price?: number | null;
  promo_label?: string | null;
  pvp_recommended?: number | null;
}

interface ProductAttribute {
  id: string;
  product_id: string;
  attribute_type: string;
  attribute_value: string;
}

interface SectionPayload {
  body_markdown: string | null;
  attributes: Record<string, any>;
  is_published: boolean;
  source: string;
  updated_at: string;
}

interface B2BContentRow {
  product_id: string;
  // editorial / content
  long_description: string | null;
  benefits: any[] | null;
  meta_description: string | null;
  tags: string[] | null;
  content_reviewed: boolean | null;
  content_updated_at: string | null;
  // sections
  sections: Record<string, SectionPayload>;
  // structured
  spec_attributes: Array<{
    spec_key: string;
    spec_value: string;
    unit: string | null;
    spec_group: string | null;
    display_order: number | null;
  }>;
  spec_attributes_count: number;
  clinical_attributes: Record<string, string[]>;
  clinical_attributes_count: number;
  // flags
  has_overview: boolean;
  has_how_to_use: boolean;
  has_specifications_section: boolean;
  has_clinical: boolean;
  has_spec_attributes: boolean;
  has_clinical_attributes: boolean;
  is_indexed_fresh: boolean;
  content_completeness: number;
}

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  vatRate?: number;
  effectivePrice?: number;
  hasDiscount?: boolean;
  onTagClick?: (tag: string) => void;
  activeTag?: string | null;
}

/** Skeleton consistente reutilizado em TODAS as tabs durante loading. */
function TabSkeleton() {
  return (
    <div className="space-y-4 py-2" aria-busy="true" aria-live="polite">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-9/12" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
  onAddToCart,
  vatRate = 23,
  effectivePrice,
  hasDiscount,
  onTagClick,
  activeTag,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) setQuantity(1);
  }, [product?.id]);

  // 🎯 ÚNICA query: vista agregada product_b2b_content
  const { data: b2b, isLoading: loadingB2B } = useQuery<B2BContentRow | null>({
    queryKey: ["product-b2b-content", product?.id],
    enabled: !!product?.id && open,
    staleTime: 60_000,
    queryFn: async () => {
      if (!product?.id) return null;
      const { data, error } = await sb
        .from("product_b2b_content")
        .select(
          [
            "product_id",
            "long_description",
            "benefits",
            "meta_description",
            "tags",
            "content_reviewed",
            "content_updated_at",
            "sections",
            "spec_attributes",
            "spec_attributes_count",
            "clinical_attributes",
            "clinical_attributes_count",
            "has_overview",
            "has_how_to_use",
            "has_specifications_section",
            "has_clinical",
            "has_spec_attributes",
            "has_clinical_attributes",
            "is_indexed_fresh",
            "content_completeness",
          ].join(", "),
        )
        .eq("product_id", product.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as B2BContentRow | null) ?? null;
    },
  });

  // Atributos clínicos derivados (compat com ProductAttributeTags existente)
  const clinicalAttributesFlat: ProductAttribute[] = useMemo(() => {
    if (!b2b?.clinical_attributes || !product) return [];
    const out: ProductAttribute[] = [];
    Object.entries(b2b.clinical_attributes).forEach(([type, values]) => {
      (values || []).forEach((value, idx) => {
        out.push({
          id: `${product.id}-${type}-${idx}`,
          product_id: product.id,
          attribute_type: type,
          attribute_value: value,
        });
      });
    });
    return out;
  }, [b2b?.clinical_attributes, product]);

  if (!product) return null;

  const unitPriceNet = effectivePrice ?? product.base_price;
  const showStrikethrough =
    hasDiscount && effectivePrice != null && effectivePrice < product.base_price;
  const lineVat = calculateVAT(unitPriceNet * quantity, vatRate);
  const lineGross = calculateGross(unitPriceNet * quantity, vatRate);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 999) setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho`);
    onOpenChange(false);
  };

  // Conteúdo derivado da view (com fallback para colunas legacy do product)
  const overviewBody =
    b2b?.sections?.overview?.body_markdown ??
    product.commercial_description ??
    null;
  const howToUseBody = b2b?.sections?.how_to_use?.body_markdown ?? null;
  const specsBody = b2b?.sections?.specifications?.body_markdown ?? null;
  const clinicalBody = b2b?.sections?.clinical?.body_markdown ?? product.conditions ?? null;
  const benefitsList: string[] = Array.isArray(b2b?.benefits)
    ? (b2b!.benefits as string[])
    : (product.benefits ?? []);
  const tagsList: string[] = b2b?.tags ?? product.tags ?? [];

  const completeness = b2b?.content_completeness ?? 0;
  const completenessTone =
    completeness >= 70
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : completeness >= 40
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-rose-100 text-rose-700 border-rose-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="sr-only">
              <DialogTitle>{product.name}</DialogTitle>
            </DialogHeader>

            {/* Top: Image + Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <ProductImageGallery
                images={product.images}
                primaryIndex={product.primary_image_index}
                productName={product.name}
              />

              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{product.name}</h2>
                  {product.sku && (
                    <p className="text-sm text-muted-foreground font-mono">
                      SKU: {product.sku}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {product.category && (
                    <Badge variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {product.category}
                    </Badge>
                  )}
                  {product.subcategory && (
                    <Badge variant="outline" className="text-xs">
                      {product.subcategory}
                    </Badge>
                  )}
                  {product.line && (
                    <Badge variant="outline" className="text-xs">
                      {product.line}
                    </Badge>
                  )}
                  {product.promo_label && (
                    <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-xs">
                      {product.promo_label}
                    </Badge>
                  )}
                  {!loadingB2B && b2b && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${completenessTone}`}
                      title="Completude do conteúdo B2B"
                    >
                      Conteúdo {completeness}%
                    </Badge>
                  )}
                </div>

                {product.short_description && (
                  <p className="text-muted-foreground">{product.short_description}</p>
                )}

                {/* Price Section */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-border bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        PVP recomendado
                      </p>
                      {product.compare_at_price != null && product.compare_at_price > 0 ? (
                        <>
                          <p className="text-lg font-semibold text-foreground/80 leading-tight">
                            {formatCurrency(product.compare_at_price)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">com IVA</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">—</p>
                      )}
                    </div>
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-primary/80">
                        Preço base (seu)
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-bold text-primary leading-tight">
                          {formatCurrency(unitPriceNet)}
                        </p>
                        {showStrikethrough && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(product.base_price)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">sem IVA</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quantidade</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={quantity}
                        onChange={(e) =>
                          handleQuantityChange(parseInt(e.target.value) || 1)
                        }
                        className="w-16 text-center h-8"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={quantity >= 999}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal (s/IVA)</span>
                      <span>{formatCurrency(unitPriceNet * quantity)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IVA ({vatRate}%)</span>
                      <span>{formatCurrency(lineVat)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base pt-1">
                      <span>Total (c/IVA)</span>
                      <span className="text-primary">{formatCurrency(lineGross)}</span>
                    </div>
                  </div>

                  <Button onClick={handleAddToCart} className="w-full mt-2" size="lg">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs (4) — alimentadas pela view product_b2b_content */}
            <div className="mt-8">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start flex-wrap h-auto">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="usage" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Como Usar
                  </TabsTrigger>
                  <TabsTrigger value="specs" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Especificações
                    {!loadingB2B && b2b?.spec_attributes_count ? (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {b2b.spec_attributes_count}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="clinical" className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Clínico
                    {!loadingB2B && clinicalAttributesFlat.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {clinicalAttributesFlat.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="pt-4">
                  {loadingB2B ? (
                    <TabSkeleton />
                  ) : (
                    <ProductOverviewTab
                      commercialDescription={overviewBody}
                      benefits={benefitsList}
                      tags={tagsList}
                      demoVideoUrl={product.demo_video_url ?? null}
                      brandLogoUrl={product.brand_logo_url ?? null}
                      line={product.line ?? null}
                    />
                  )}
                </TabsContent>

                <TabsContent value="usage" className="pt-4">
                  {loadingB2B ? (
                    <TabSkeleton />
                  ) : (
                    <ProductUsageTab
                      recommendedFrequency={product.recommended_frequency ?? null}
                      typicalDurationDays={product.typical_duration_days ?? null}
                      packSize={product.pack_size ?? null}
                      unitName={product.unit_name ?? null}
                      includedQuantity={product.included_quantity ?? null}
                      conditions={howToUseBody ?? clinicalBody}
                      specifications={product.specifications}
                    />
                  )}
                </TabsContent>

                <TabsContent value="specs" className="pt-4">
                  {loadingB2B ? (
                    <TabSkeleton />
                  ) : (
                    <ProductSpecsTab
                      specifications={
                        // Mescla specs estruturadas da view com legacy jsonb do produto
                        b2b?.spec_attributes?.length
                          ? Object.fromEntries(
                              b2b.spec_attributes.map((s) => [
                                s.spec_key,
                                s.unit ? `${s.spec_value} ${s.unit}` : s.spec_value,
                              ]),
                            )
                          : product.specifications
                      }
                      weightNet={product.weight_net ?? null}
                      weightGross={product.weight_gross ?? null}
                      volumeValue={product.volume_value ?? null}
                      volumeUnit={product.volume_unit ?? null}
                      lengthCm={product.length_cm ?? null}
                      widthCm={product.width_cm ?? null}
                      heightCm={product.height_cm ?? null}
                      packageType={product.package_type ?? null}
                      barcode={product.barcode ?? null}
                      minOrderQuantity={product.min_order_quantity ?? null}
                      orderMultiple={product.order_multiple ?? null}
                      deliveryEstimate={product.delivery_estimate ?? null}
                      stockStatus={product.stock_status ?? null}
                    />
                  )}
                </TabsContent>

                <TabsContent value="clinical" className="pt-4">
                  {loadingB2B ? (
                    <TabSkeleton />
                  ) : clinicalAttributesFlat.length > 0 || clinicalBody ? (
                    <div className="space-y-4">
                      {clinicalBody && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {clinicalBody}
                        </p>
                      )}
                      {clinicalAttributesFlat.length > 0 && (
                        <ProductAttributeTags attributes={clinicalAttributesFlat} />
                      )}
                    </div>
                  ) : (
                    <EmptyTab message="Sem informação clínica definida" />
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <ProductTagsFooter
              tags={tagsList}
              onTagClick={
                onTagClick
                  ? (tag) => {
                      onTagClick(tag);
                      onOpenChange(false);
                    }
                  : undefined
              }
              activeTag={activeTag}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

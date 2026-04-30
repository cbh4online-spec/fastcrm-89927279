import { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
}

interface ProductAttribute {
  id: string;
  product_id: string;
  attribute_type: string;
  attribute_value: string;
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

  // Reset quantity when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
    }
  }, [product?.id]);

  // Fetch product attributes
  const { data: attributes = [], isLoading: loadingAttributes } = useQuery({
    queryKey: ["product-attributes", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      
      const { data, error } = await supabase
        .from("product_attributes")
        .select("id, product_id, attribute_type, attribute_value")
        .eq("product_id", product.id);

      if (error) throw error;
      return data as ProductAttribute[];
    },
    enabled: !!product?.id && open,
  });

  if (!product) return null;

  const unitPriceNet = effectivePrice ?? product.base_price;
  const showStrikethrough = hasDiscount && effectivePrice != null && effectivePrice < product.base_price;
  const lineVat = calculateVAT(unitPriceNet * quantity, vatRate);
  const lineGross = calculateGross(unitPriceNet * quantity, vatRate);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 999) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="sr-only">
              <DialogTitle>{product.name}</DialogTitle>
            </DialogHeader>

            {/* Top Section: Image + Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Image Gallery */}
              <ProductImageGallery
                images={product.images}
                primaryIndex={product.primary_image_index}
                productName={product.name}
              />

              {/* Basic Info */}
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
                </div>

                {product.short_description && (
                  <p className="text-muted-foreground">
                    {product.short_description}
                  </p>
                )}

                {/* Price Section */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Preço recomendado c/IVA */}
                    <div className="rounded-md border border-border bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        PVP recomendado
                      </p>
                      {product.compare_at_price != null && product.compare_at_price > 0 ? (
                        <>
                          <p className="text-lg font-semibold text-foreground/80 leading-tight">
                            {product.compare_at_price.toFixed(2)}€
                          </p>
                          <p className="text-[11px] text-muted-foreground">com IVA</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">—</p>
                      )}
                    </div>
                    {/* Preço base s/IVA */}
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-primary/80">
                        Preço base (seu)
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-bold text-primary leading-tight">
                          {unitPriceNet.toFixed(2)}€
                        </p>
                        {showStrikethrough && (
                          <span className="text-xs text-muted-foreground line-through">
                            {product.base_price.toFixed(2)}€
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">sem IVA</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Quantity Selector */}
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
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
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
                  
                  {/* Totals */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal (s/IVA)</span>
                      <span>{(unitPriceNet * quantity).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IVA ({vatRate}%)</span>
                      <span>{lineVat.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base pt-1">
                      <span>Total (c/IVA)</span>
                      <span className="text-primary">{lineGross.toFixed(2)}€</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleAddToCart} 
                    className="w-full mt-2"
                    size="lg"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </div>
            </div>

            {/* Rich Tabs */}
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
                  </TabsTrigger>
                  <TabsTrigger value="clinical" className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Clínico
                    {attributes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {attributes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="pt-4">
                  <ProductOverviewTab
                    commercialDescription={product.commercial_description}
                    benefits={product.benefits ?? null}
                    tags={product.tags ?? null}
                    demoVideoUrl={product.demo_video_url ?? null}
                    brandLogoUrl={product.brand_logo_url ?? null}
                    line={product.line ?? null}
                  />
                </TabsContent>

                <TabsContent value="usage" className="pt-4">
                  <ProductUsageTab
                    recommendedFrequency={product.recommended_frequency ?? null}
                    typicalDurationDays={product.typical_duration_days ?? null}
                    packSize={product.pack_size ?? null}
                    unitName={product.unit_name ?? null}
                    includedQuantity={product.included_quantity ?? null}
                    conditions={product.conditions ?? null}
                    specifications={product.specifications}
                  />
                </TabsContent>

                <TabsContent value="specs" className="pt-4">
                  <ProductSpecsTab
                    specifications={product.specifications}
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
                </TabsContent>

                <TabsContent value="clinical" className="pt-4">
                  {loadingAttributes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : attributes.length > 0 ? (
                    <ProductAttributeTags attributes={attributes} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sem atributos clínicos definidos</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Tags Footer — clickable chips for catalog filtering */}
            <ProductTagsFooter
              tags={product.tags ?? null}
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

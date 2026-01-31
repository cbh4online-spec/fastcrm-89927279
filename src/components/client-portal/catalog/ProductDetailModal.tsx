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
import { ProductTechnicalInfo } from "./ProductTechnicalInfo";
import { ProductAttributeTags } from "./ProductAttributeTags";
import { calculateVAT, calculateGross } from "@/types/order-note";
import { 
  Minus, 
  Plus, 
  ShoppingCart, 
  Package,
  Tag,
  FileText,
  Sparkles,
  Loader2
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
  images: string[] | null;
  primary_image_index: number | null;
  specifications: Record<string, unknown> | null;
  status: string;
  workspace_id: string;
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
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
  onAddToCart,
  vatRate = 23,
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

  const unitPriceNet = product.base_price;
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

                {product.category && (
                  <Badge variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {product.category}
                  </Badge>
                )}

                {product.short_description && (
                  <p className="text-muted-foreground">
                    {product.short_description}
                  </p>
                )}

                {/* Price Section */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Preço unitário (s/IVA)</span>
                    <span className="text-lg font-semibold">
                      {unitPriceNet.toFixed(2)}€
                    </span>
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

            {/* Technical Details Section */}
            <div className="mt-8">
              <Tabs defaultValue="technical" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="technical" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informação Técnica
                  </TabsTrigger>
                  <TabsTrigger value="attributes" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Atributos Clínicos
                    {attributes.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                        {attributes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="technical" className="pt-4">
                  <ProductTechnicalInfo
                    specifications={product.specifications as Record<string, unknown> | null}
                    commercialDescription={product.commercial_description}
                  />
                </TabsContent>
                
                <TabsContent value="attributes" className="pt-4">
                  {loadingAttributes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : attributes.length > 0 ? (
                    <ProductAttributeTags attributes={attributes} />
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Sem atributos clínicos definidos</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

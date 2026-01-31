import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/contexts/CartContext";
import type { ProductProtocol, ProtocolProduct } from "@/types/protocol";
import { calculateProtocolTotal } from "@/types/protocol";
import {
  Package,
  ShoppingCart,
  Percent,
  Check,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ProtocolDetailModalProps {
  protocol: ProductProtocol | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProtocolDetailModal({
  protocol,
  open,
  onOpenChange,
}: ProtocolDetailModalProps) {
  const { addItem } = useCart();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!protocol) return null;

  const products = protocol.products || [];
  const requiredProducts = products.filter((p) => !p.is_optional);
  const optionalProducts = products.filter((p) => p.is_optional);

  // Initialize selected with all required products
  const initializeSelection = () => {
    const requiredIds = new Set(requiredProducts.map((p) => p.id));
    setSelectedProducts(requiredIds);
  };

  // Reset selection when modal opens
  const handleOpenChange = (value: boolean) => {
    if (value) {
      initializeSelection();
    }
    onOpenChange(value);
  };

  const toggleProduct = (productId: string, isOptional: boolean) => {
    if (!isOptional) return; // Can't deselect required products
    
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const getSelectedProducts = () => {
    return products.filter(
      (p) => selectedProducts.has(p.id) || !p.is_optional
    );
  };

  const { subtotal, discount, total } = calculateProtocolTotal(
    getSelectedProducts(),
    protocol.discount_percentage
  );

  const handleAddToCart = async () => {
    setLoading(true);
    
    try {
      const productsToAdd = getSelectedProducts();
      
      for (const pp of productsToAdd) {
        if (!pp.product) continue;
        
        const primaryIndex = 0;
        const imageUrl = pp.product.images?.[primaryIndex] || null;
        const discountedPrice = pp.product.base_price * (1 - (protocol.discount_percentage || 0) / 100);
        
        addItem({
          product_id: pp.product_id,
          product_name: pp.product.name,
          product_sku: pp.product.sku,
          product_image_url: imageUrl,
          quantity: pp.quantity,
          unit_price_net: discountedPrice,
          vat_rate: 23,
        });
      }
      
      toast.success(`Protocolo "${protocol.name}" adicionado ao carrinho`);
      onOpenChange(false);
    } catch (err) {
      console.error("Error adding protocol to cart:", err);
      toast.error("Erro ao adicionar protocolo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {protocol.image_url ? (
              <img
                src={protocol.image_url}
                alt={protocol.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <DialogTitle className="text-xl">{protocol.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {protocol.short_description || protocol.description}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                {protocol.category && (
                  <Badge variant="secondary">{protocol.category}</Badge>
                )}
                {protocol.discount_percentage > 0 && (
                  <Badge className="bg-green-500 text-white gap-1">
                    <Percent className="h-3 w-3" />
                    {protocol.discount_percentage}% desconto
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Required Products */}
            {requiredProducts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Produtos Incluídos ({requiredProducts.length})
                </h4>
                <div className="space-y-2">
                  {requiredProducts.map((pp) => (
                    <ProductRow
                      key={pp.id}
                      protocolProduct={pp}
                      selected={true}
                      disabled={true}
                      discountPercentage={protocol.discount_percentage}
                      onToggle={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Optional Products */}
            {optionalProducts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  Produtos Opcionais ({optionalProducts.length})
                </h4>
                <div className="space-y-2">
                  {optionalProducts.map((pp) => (
                    <ProductRow
                      key={pp.id}
                      protocolProduct={pp}
                      selected={selectedProducts.has(pp.id)}
                      disabled={false}
                      discountPercentage={protocol.discount_percentage}
                      onToggle={() => toggleProduct(pp.id, true)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {protocol.description && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Descrição</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {protocol.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {protocol.tags && protocol.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {protocol.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer with pricing and action */}
        <div className="flex items-center justify-between pt-4">
          <div>
            {discount > 0 && (
              <p className="text-sm text-muted-foreground line-through">
                €{subtotal.toFixed(2)}
              </p>
            )}
            <p className="text-2xl font-bold text-primary">
              €{total.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {getSelectedProducts().length} produto(s) • {getSelectedProducts().reduce((s, p) => s + p.quantity, 0)} unidades
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleAddToCart}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShoppingCart className="h-5 w-5" />
            )}
            Adicionar ao Carrinho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ProductRowProps {
  protocolProduct: ProtocolProduct;
  selected: boolean;
  disabled: boolean;
  discountPercentage: number;
  onToggle: () => void;
}

function ProductRow({ protocolProduct, selected, disabled, discountPercentage, onToggle }: ProductRowProps) {
  const product = protocolProduct.product;
  if (!product) return null;

  const originalPrice = product.base_price * protocolProduct.quantity;
  const discountedPrice = originalPrice * (1 - discountPercentage / 100);
  const primaryIndex = 0;
  const imageUrl = product.images?.[primaryIndex] || null;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        selected ? "bg-primary/5 border-primary/30" : "bg-muted/30"
      } ${!disabled ? "cursor-pointer hover:bg-muted/50" : ""}`}
      onClick={!disabled ? onToggle : undefined}
    >
      {!disabled && (
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="pointer-events-none"
        />
      )}
      
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={product.name}
          className="w-12 h-12 rounded object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {protocolProduct.quantity} × €{product.base_price.toFixed(2)}
        </p>
        {protocolProduct.notes && (
          <p className="text-xs text-muted-foreground italic mt-0.5">
            {protocolProduct.notes}
          </p>
        )}
      </div>
      
      <div className="text-right">
        {discountPercentage > 0 && (
          <p className="text-xs text-muted-foreground line-through">
            €{originalPrice.toFixed(2)}
          </p>
        )}
        <p className="font-medium text-sm">€{discountedPrice.toFixed(2)}</p>
      </div>
    </div>
  );
}

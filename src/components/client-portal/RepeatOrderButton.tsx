import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OrderNote, OrderNoteItem } from "@/types/order-note";

interface RepeatOrderButtonProps {
  order: OrderNote;
  variant?: "icon" | "button";
  size?: "sm" | "default";
}

interface ProductChange {
  productId: string;
  productName: string;
  originalPrice: number;
  currentPrice: number | null;
  status: "available" | "unavailable" | "price_changed";
  quantity: number;
}

export function RepeatOrderButton({
  order,
  variant = "button",
  size = "sm",
}: RepeatOrderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [changes, setChanges] = useState<ProductChange[]>([]);
  const { addItem, clearCart } = useCart();
  const navigate = useNavigate();

  // Only show for certain statuses
  const allowedStatuses = ["approved", "in_preparation", "invoiced"];
  if (!allowedStatuses.includes(order.status)) {
    return null;
  }

  const validateAndAddItems = async (skipUnavailable = false) => {
    if (!order.items || order.items.length === 0) {
      toast.error("Esta encomenda não tem produtos");
      return;
    }

    setLoading(true);

    try {
      // Get current product data
      const productIds = order.items
        .filter((item) => item.product_id)
        .map((item) => item.product_id as string);

      const { data: currentProducts, error } = await supabase
        .from("products")
        .select("id, name, base_price, status, sku, images, primary_image_index")
        .in("id", productIds);

      if (error) throw error;

      const productMap = new Map(
        (currentProducts || []).map((p) => [p.id, p])
      );

      // Check for changes
      const productChanges: ProductChange[] = [];
      let hasUnavailable = false;
      let hasPriceChanges = false;

      for (const item of order.items) {
        if (!item.product_id) continue;

        const currentProduct = productMap.get(item.product_id);

        if (!currentProduct || currentProduct.status !== "active") {
          hasUnavailable = true;
          productChanges.push({
            productId: item.product_id,
            productName: item.product_name,
            originalPrice: item.unit_price_net,
            currentPrice: null,
            status: "unavailable",
            quantity: item.quantity,
          });
        } else if (currentProduct.base_price !== item.unit_price_net) {
          hasPriceChanges = true;
          productChanges.push({
            productId: item.product_id,
            productName: item.product_name,
            originalPrice: item.unit_price_net,
            currentPrice: currentProduct.base_price,
            status: "price_changed",
            quantity: item.quantity,
          });
        } else {
          productChanges.push({
            productId: item.product_id,
            productName: item.product_name,
            originalPrice: item.unit_price_net,
            currentPrice: currentProduct.base_price,
            status: "available",
            quantity: item.quantity,
          });
        }
      }

      // If there are issues and user hasn't confirmed, show dialog
      if ((hasUnavailable || hasPriceChanges) && !skipUnavailable) {
        setChanges(productChanges);
        setShowChangesDialog(true);
        setLoading(false);
        return;
      }

      // Add available items to cart
      const itemsToAdd = productChanges.filter(
        (c) => c.status !== "unavailable"
      );

      if (itemsToAdd.length === 0) {
        toast.error("Nenhum produto disponível para adicionar");
        setLoading(false);
        return;
      }

      // Clear cart and add items
      clearCart();

      for (const change of itemsToAdd) {
        const currentProduct = productMap.get(change.productId);
        if (!currentProduct) continue;

        const primaryIndex = currentProduct.primary_image_index ?? 0;
        const imageUrl = currentProduct.images?.[primaryIndex] || null;

        addItem({
          product_id: change.productId,
          product_name: currentProduct.name,
          product_sku: currentProduct.sku,
          product_image_url: imageUrl,
          quantity: change.quantity,
          unit_price_net: currentProduct.base_price,
          vat_rate: 23,
        });
      }

      toast.success(`${itemsToAdd.length} produto(s) adicionado(s) ao carrinho`);
      navigate("/client/cart");
    } catch (err) {
      console.error("Error repeating order:", err);
      toast.error("Erro ao repetir encomenda");
    } finally {
      setLoading(false);
      setShowChangesDialog(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    validateAndAddItems(false);
  };

  const handleConfirmWithChanges = () => {
    validateAndAddItems(true);
  };

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={loading}
          title="Repetir encomenda"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <Button
          variant="outline"
          size={size}
          onClick={handleClick}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Repetir
        </Button>
      )}

      <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alterações Detectadas
            </DialogTitle>
            <DialogDescription>
              Alguns produtos desta encomenda sofreram alterações:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {changes.map((change) => (
              <div
                key={change.productId}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{change.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Qtd: {change.quantity}
                  </p>
                </div>
                <div className="text-right">
                  {change.status === "unavailable" ? (
                    <Badge variant="destructive">Indisponível</Badge>
                  ) : change.status === "price_changed" ? (
                    <div className="space-y-1">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Preço alterado
                      </Badge>
                      <div className="text-xs">
                        <span className="line-through text-muted-foreground">
                          {change.originalPrice.toFixed(2)}€
                        </span>
                        {" → "}
                        <span className="font-medium">
                          {change.currentPrice?.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Disponível
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowChangesDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmWithChanges} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Continuar com disponíveis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

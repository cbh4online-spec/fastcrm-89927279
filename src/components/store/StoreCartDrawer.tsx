import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, Package } from "lucide-react";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { useNavigate } from "react-router-dom";
import { StoreFreeShippingBar } from "@/components/store/StoreFreeShippingBar";
import { StoreCartUpsell } from "@/components/store/StoreCartUpsell";

interface StoreCartDrawerProps {
  workspaceSlug: string;
}

export function StoreCartDrawer({ workspaceSlug }: StoreCartDrawerProps) {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal, totalItems } = useStoreCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate(`/store/${workspaceSlug}/checkout`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Carrinho ({totalItems})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <ShoppingBag className="h-16 w-16 opacity-20" />
            <p>O carrinho está vazio</p>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Continuar a comprar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex gap-3"
                  >
                    <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                      <p className="text-sm font-semibold text-primary mt-1">
                        €{(item.price * item.quantity).toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border rounded-lg overflow-hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-auto text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="border-t pt-4 space-y-4">
              <StoreFreeShippingBar subtotal={subtotal} />
              <StoreCartUpsell workspaceSlug={workspaceSlug} />
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-xl font-bold">€{subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Impostos e portes calculados no checkout
              </p>
              <Button
                className="w-full rounded-xl h-12 text-base transition-transform duration-200 active:scale-[0.98]"
                size="lg"
                onClick={handleCheckout}
              >
                Finalizar Compra
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

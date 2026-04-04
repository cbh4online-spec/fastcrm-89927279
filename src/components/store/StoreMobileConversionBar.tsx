import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useStoreCart } from "@/contexts/StoreCartContext";

interface StoreMobileConversionBarProps {
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    image?: string;
    sku?: string;
  };
  workspaceSlug: string;
  isOutOfStock: boolean;
  triggerRef: React.RefObject<HTMLElement>;
}

export function StoreMobileConversionBar({
  product,
  workspaceSlug,
  isOutOfStock,
  triggerRef,
}: StoreMobileConversionBarProps) {
  const [visible, setVisible] = useState(false);
  const { addItem } = useStoreCart();
  const navigate = useNavigate();

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerRef]);

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      image: product.image,
      sku: product.sku,
    });
    navigate(`/store/${workspaceSlug}/checkout`);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
        >
          <div className="safe-area-bottom px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{product.name}</p>
              <p className="text-lg font-bold text-primary">€{product.price.toFixed(2)}</p>
            </div>
            <Button
              size="lg"
              className="gap-2 h-12 px-6 rounded-xl font-semibold text-base shadow-lg shadow-primary/20"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              <Zap className="h-4 w-4" />
              Comprar Agora
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

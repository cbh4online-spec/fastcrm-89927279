import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoreStickyAddToCartProps {
  name: string;
  price: number;
  currency: string;
  image?: string;
  isOutOfStock: boolean;
  onAddToCart: () => void;
  /** Ref to the original add-to-cart button to track visibility */
  triggerRef: React.RefObject<HTMLElement>;
}

export function StoreStickyAddToCart({
  name,
  price,
  image,
  isOutOfStock,
  onAddToCart,
  triggerRef,
}: StoreStickyAddToCartProps) {
  const [visible, setVisible] = useState(false);

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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-16 left-0 right-0 z-40 border-b bg-background/95 backdrop-blur-lg shadow-sm"
        >
          <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
            {image ? (
              <img src={image} alt={name} className="h-10 w-10 rounded-lg object-cover border flex-shrink-0" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-muted-foreground/30" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-sm font-bold text-primary">€{price.toFixed(2)}</p>
            </div>
            <Button
              size="sm"
              className="gap-2 flex-shrink-0"
              onClick={onAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

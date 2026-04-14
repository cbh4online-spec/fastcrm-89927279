import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface FeaturedProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url?: string;
  original_price?: number;
  rating?: number;
}

// Simulated products for demo
const DEMO_PRODUCTS: FeaturedProduct[] = [
  {
    id: "1",
    title: "Camisola Premium Algodão",
    price: 29.99,
    currency: "EUR",
    original_price: 49.99,
    rating: 4.8,
  },
  {
    id: "2",
    title: "Bolsa de Couro Artesanal",
    price: 59.90,
    currency: "EUR",
    rating: 4.9,
  },
  {
    id: "3",
    title: "Sneakers Edição Limitada",
    price: 89.00,
    currency: "EUR",
    original_price: 120.00,
    rating: 4.7,
  },
  {
    id: "4",
    title: "Óculos de Sol Vintage",
    price: 34.50,
    currency: "EUR",
    rating: 4.5,
  },
];

interface Props {
  productIds?: string[];
  isLive: boolean;
}

export function LiveProductShowcase({ productIds, isLive }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const products = DEMO_PRODUCTS; // In production, fetch by productIds

  // Auto-rotate featured product every 8 seconds
  useEffect(() => {
    if (!isLive || products.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % products.length);
      setIsHighlighted(true);
      setTimeout(() => setIsHighlighted(false), 2000);
    }, 8000);
    return () => clearInterval(interval);
  }, [isLive, products.length]);

  if (!isLive || products.length === 0) return null;

  const product = products[activeIndex];
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;

  const handleAddToCart = () => {
    toast.success(`"${product.title}" adicionado ao carrinho! 🛒`);
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 20, delay: 1 }}
      className="absolute bottom-20 left-4 right-4 lg:right-auto lg:max-w-sm z-20"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={product.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: "spring", damping: 25 }}
          className={`
            rounded-xl overflow-hidden backdrop-blur-md border transition-all duration-500
            ${isHighlighted
              ? "bg-white/20 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
              : "bg-black/50 border-white/15 shadow-xl"
            }
          `}
        >
          <div className="flex items-stretch">
            {/* Product image placeholder */}
            <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center relative overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <ShoppingCart className="h-8 w-8 text-white/30" />
              )}
              {discount && (
                <Badge className="absolute top-1 left-1 bg-red-500 text-white border-0 text-[10px] px-1.5 py-0 font-bold">
                  -{discount}%
                </Badge>
              )}
            </div>

            {/* Product info */}
            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                    Em destaque
                  </span>
                </div>
                <h4 className="text-white font-semibold text-sm leading-tight truncate">
                  {product.title}
                </h4>
                {product.rating && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-white/50 text-[11px]">{product.rating}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-white font-bold text-base">
                    {product.price.toFixed(2)}€
                  </span>
                  {product.original_price && (
                    <span className="text-white/40 text-xs line-through">
                      {product.original_price.toFixed(2)}€
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleAddToCart}
                  className="h-7 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 flex-shrink-0"
                >
                  <ShoppingCart className="h-3 w-3" />
                  Comprar
                </Button>
              </div>
            </div>
          </div>

          {/* Product dots / navigation */}
          {products.length > 1 && (
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => setActiveIndex((i) => (i - 1 + products.length) % products.length)}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="flex items-center gap-1.5">
                {products.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`rounded-full transition-all ${
                      i === activeIndex
                        ? "w-4 h-1.5 bg-amber-400"
                        : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white/40 hover:text-white hover:bg-white/10"
                onClick={() => setActiveIndex((i) => (i + 1) % products.length)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

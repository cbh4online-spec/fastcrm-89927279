import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreHeroCarouselProps {
  products: StoreProduct[];
  workspaceSlug: string;
  storeName: string;
  storeDescription?: string | null;
  bannerUrl?: string | null;
}

const SLIDE_DURATION = 6000;

export function StoreHeroCarousel({ products, workspaceSlug, storeName, storeDescription, bannerUrl }: StoreHeroCarouselProps) {
  const slides = products.slice(0, 5);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % Math.max(slides.length, 1));
    setProgress(0);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % Math.max(slides.length, 1));
    setProgress(0);
  }, [slides.length]);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + (100 / (SLIDE_DURATION / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [slides.length, isPaused, next]);

  const activeProduct = slides[current];
  const heroImage = activeProduct?.images?.[activeProduct.primary_image_index ?? 0] || activeProduct?.images?.[0];

  // Fallback when no featured products
  if (slides.length === 0) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        </div>
        {bannerUrl && (
          <div className="absolute inset-0">
            <img src={bannerUrl} alt="" className="w-full h-full object-cover opacity-20" />
          </div>
        )}
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            Bem-vindo à {storeName}
          </h1>
          {storeDescription && (
            <p className="text-lg text-primary-foreground/80 max-w-lg mx-auto mt-4">
              {storeDescription}
            </p>
          )}
          <p className="text-base text-primary-foreground/60 max-w-lg mx-auto mt-2">
            Descubra soluções premium pensadas para si.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 gap-2 font-semibold"
            onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            Ver Catálogo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center min-h-[340px] md:min-h-[420px]">
          {/* Text side */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-5"
            >
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary/80">
                {activeProduct.category || "Destaque"}
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
                {activeProduct.name}
              </h2>
              {activeProduct.short_description && (
                <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed line-clamp-3">
                  {activeProduct.short_description}
                </p>
              )}
              <div className="flex items-center gap-4 pt-2">
                <span className="text-2xl md:text-3xl font-bold text-primary">
                  €{activeProduct.base_price.toFixed(2)}
                </span>
                <Button asChild size="lg" className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-all rounded-full px-8">
                  <Link to={`/store/${workspaceSlug}/product/${activeProduct.id}`}>
                    Ver Produto <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Image side */}
          <div className="relative flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="relative"
              >
                {heroImage ? (
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
                    <Link to={`/store/${workspaceSlug}/product/${activeProduct.id}`}>
                      <img
                        src={heroImage}
                        alt={activeProduct.name}
                        className="relative w-72 h-72 md:w-80 md:h-80 lg:w-[380px] lg:h-[380px] object-cover rounded-3xl shadow-2xl ring-1 ring-border/30 transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </Link>
                  </div>
                ) : (
                  <div className="w-72 h-72 md:w-80 md:h-80 rounded-3xl bg-muted/50 flex items-center justify-center">
                    <span className="text-muted-foreground/30 text-6xl font-bold">{current + 1}</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav arrows */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-md flex items-center justify-center hover:bg-background transition-colors"
                  aria-label="Slide anterior"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-md flex items-center justify-center hover:bg-background transition-colors"
                  aria-label="Próximo slide"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dots + progress */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setProgress(0); }}
                className="relative h-2 rounded-full overflow-hidden transition-all duration-300"
                style={{ width: i === current ? 40 : 8 }}
                aria-label={`Slide ${i + 1}`}
              >
                <div className="absolute inset-0 bg-primary/20 rounded-full" />
                {i === current && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                )}
                {i !== current && (
                  <div className="absolute inset-0 bg-primary/30 rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

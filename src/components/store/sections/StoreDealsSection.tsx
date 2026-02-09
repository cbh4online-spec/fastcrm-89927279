import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Flame, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { StoreProduct } from "@/hooks/useStoreProducts";

interface StoreDealsSectionProps {
  products: StoreProduct[];
  workspaceSlug: string;
  tierPricing?: any;
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-sm font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-md">
      {timeLeft}
    </span>
  );
}

export function StoreDealsSection({ products, workspaceSlug }: StoreDealsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-gradient-to-r from-destructive/5 via-background to-destructive/5 border-y">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-bold text-foreground">Ofertas do Dia</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Termina em</span>
            <CountdownTimer />
          </div>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {products.map((p) => {
              const imgIdx = p.primary_image_index ?? 0;
              const img = p.images?.[imgIdx] || p.images?.[0];
              return (
                <Link
                  key={p.id}
                  to={`/store/${workspaceSlug}/product/${p.id}`}
                  className="flex-shrink-0 w-44 group"
                >
                  <div className="relative h-44 w-44 rounded-xl overflow-hidden bg-muted border transition-shadow group-hover:shadow-md">
                    {img ? (
                      <img src={img} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground gap-1 text-[10px]">
                      <Flame className="h-3 w-3" />
                      Oferta
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{p.name}</p>
                    <p className="text-sm font-bold text-primary">€{p.base_price.toFixed(2)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </section>
  );
}

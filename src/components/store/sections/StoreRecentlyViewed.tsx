import { Link } from "react-router-dom";
import { Package, Clock } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { RecentlyViewedItem } from "@/hooks/useRecentlyViewed";

interface StoreRecentlyViewedProps {
  items: RecentlyViewedItem[];
  workspaceSlug: string;
  currentProductId?: string;
}

export function StoreRecentlyViewed({ items, workspaceSlug, currentProductId }: StoreRecentlyViewedProps) {
  const filtered = items.filter((i) => i.id !== currentProductId);
  if (filtered.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Visto recentemente</h2>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {filtered.map((item) => (
            <Link
              key={item.id}
              to={`/store/${workspaceSlug}/product/${item.id}`}
              className="flex-shrink-0 w-36 group"
            >
              <div className="h-36 w-36 rounded-xl overflow-hidden bg-muted border transition-shadow group-hover:shadow-md">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-0.5">
                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.name}</p>
                <p className="text-sm font-bold text-primary">€{item.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

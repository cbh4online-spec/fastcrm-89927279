import { useMemo } from "react";
import { StoreProductCard } from "./StoreProductCard";
import { Sparkles } from "lucide-react";
import type { RecentlyViewedItem } from "@/hooks/useRecentlyViewed";

interface StorePersonalizedSectionProps {
  recentlyViewed: RecentlyViewedItem[];
  allProducts: any[];
  workspaceSlug: string;
  workspaceId?: string;
  tierPricing?: any;
  reviewStats?: any;
  salesCounts?: any;
}

export function StorePersonalizedSection({
  recentlyViewed,
  allProducts,
  workspaceSlug,
  workspaceId,
  tierPricing,
  reviewStats,
  salesCounts,
}: StorePersonalizedSectionProps) {
  const recommendations = useMemo(() => {
    if (!recentlyViewed.length || !allProducts.length) return [];

    const viewedIds = new Set(recentlyViewed.map((rv) => rv.id));

    // Get categories of recently viewed items
    const viewedCategories = new Set<string>();
    for (const rv of recentlyViewed) {
      const product = allProducts.find((p: any) => p.id === rv.id);
      if (product?.category) viewedCategories.add(product.category);
    }

    // Products from same categories but not viewed
    const sameCat = allProducts.filter(
      (p: any) => !viewedIds.has(p.id) && p.category && viewedCategories.has(p.category) && p.stock_status !== "out_of_stock"
    );

    // Trending (by sales count)
    const trending = allProducts
      .filter((p: any) => !viewedIds.has(p.id) && p.stock_status !== "out_of_stock")
      .sort((a: any, b: any) => (salesCounts?.get(b.id) || 0) - (salesCounts?.get(a.id) || 0));

    // Merge: prioritize same category, then trending, deduplicate
    const seen = new Set<string>();
    const result: any[] = [];

    for (const list of [sameCat, trending]) {
      for (const p of list) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        result.push(p);
        if (result.length >= 8) break;
      }
      if (result.length >= 8) break;
    }

    return result;
  }, [recentlyViewed, allProducts, salesCounts]);

  if (recommendations.length < 2) return null;

  return (
    <section className="py-10">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Recomendado Para Si</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {recommendations.map((product, index) => (
          <StoreProductCard
            key={product.id}
            product={product}
            workspaceSlug={workspaceSlug}
            workspaceId={workspaceId}
            tierPricing={tierPricing}
            reviewStats={reviewStats}
            salesCounts={salesCounts}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

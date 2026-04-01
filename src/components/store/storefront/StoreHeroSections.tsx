import { StoreHeroCarousel } from "@/components/store/sections/StoreHeroCarousel";
import { StoreCategoryGrid } from "@/components/store/sections/StoreCategoryGrid";
import { StoreBestSellers } from "@/components/store/sections/StoreBestSellers";
import { StoreNewArrivals } from "@/components/store/sections/StoreNewArrivals";
import { StoreTrustSection } from "@/components/store/sections/StoreTrustSection";
import { StoreFeaturedSection } from "@/components/store/sections/StoreFeaturedSection";
import { StoreCTABanner } from "@/components/store/sections/StoreCTABanner";
import { StoreDealsSection } from "@/components/store/sections/StoreDealsSection";
import { StoreCategoryCarousel } from "@/components/store/sections/StoreCategoryCarousel";
import type { StoreFilters } from "@/components/store/StoreFilterSidebar";

interface StoreHeroSectionsProps {
  categories: any[];
  featuredProducts: any[];
  dealProducts: any[];
  allProducts: any[];
  salesCounts: Map<string, number> | undefined;
  tierPricing: any;
  wsSlug: string;
  storeName: string;
  storeDescription?: string | null;
  bannerUrl?: string | null;
  filters: StoreFilters;
  onFilterChange: (fn: (prev: StoreFilters) => StoreFilters) => void;
}

export function StoreHeroSections({
  categories,
  featuredProducts,
  dealProducts,
  allProducts,
  salesCounts,
  tierPricing,
  wsSlug,
  storeName,
  storeDescription,
  bannerUrl,
  filters,
  onFilterChange,
}: StoreHeroSectionsProps) {
  return (
    <>
      {/* Category Carousel */}
      {categories.length > 0 && (
        <StoreCategoryCarousel
          categories={categories}
          selectedCategoryId={filters.categoryId}
          onSelectCategory={(id) => onFilterChange((f) => ({ ...f, categoryId: id }))}
        />
      )}

      {/* Hero Carousel */}
      <StoreHeroCarousel
        products={featuredProducts}
        workspaceSlug={wsSlug}
        storeName={storeName}
        storeDescription={storeDescription}
        bannerUrl={bannerUrl}
      />

      <StoreTrustSection />

      {/* Category Grid — Quad Cards */}
      {categories.length > 0 && (
        <StoreCategoryGrid
          categories={categories}
          onSelectCategory={(id) => {
            onFilterChange((f) => ({ ...f, categoryId: id }));
            document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {/* Best Sellers */}
      {salesCounts && salesCounts.size > 0 && (
        <StoreBestSellers
          products={allProducts}
          salesCounts={salesCounts}
          workspaceSlug={wsSlug}
        />
      )}

      {/* New Arrivals */}
      {allProducts.length > 0 && (
        <StoreNewArrivals products={allProducts} workspaceSlug={wsSlug} />
      )}

      {/* Deals section */}
      {dealProducts.length > 0 && (
        <StoreDealsSection
          products={dealProducts}
          workspaceSlug={wsSlug}
          tierPricing={tierPricing}
        />
      )}

      {featuredProducts.length > 0 && (
        <StoreFeaturedSection
          products={featuredProducts}
          workspaceSlug={wsSlug}
          tierPricing={tierPricing}
        />
      )}

      <StoreCTABanner />
    </>
  );
}

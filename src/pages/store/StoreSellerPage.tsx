import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { Helmet } from "react-helmet-async";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Package } from "lucide-react";

export default function StoreSellerPage() {
  const { workspaceSlug, sellerSlug } = useParams<{ workspaceSlug: string; sellerSlug: string }>();
  const { workspaceId: wsId, slug: wsSlug } = useResolveStoreWorkspace(workspaceSlug);
  const { data: storeSettings } = usePublicStoreSettings(wsId || "");
  const storeName = storeSettings?.store_name || "Loja";

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ["public-seller", wsId, sellerSlug],
    queryFn: async () => {
      if (!wsId || !sellerSlug) return null;

      // Try slug first, then UUID
      let query = supabase
        .from("c2c_sellers")
        .select("*")
        .eq("workspace_id", wsId)
        .eq("status", "approved");

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerSlug);
      if (isUuid) {
        query = query.eq("id", sellerSlug);
      } else {
        query = query.eq("slug", sellerSlug);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!wsId && !!sellerSlug,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["seller-listings-public", wsId, seller?.id],
    queryFn: async () => {
      if (!wsId || !seller?.id) return [];
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("*")
        .eq("workspace_id", wsId)
        .eq("seller_id", seller.id)
        .eq("status", "active")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId && !!seller?.id,
  });

  // Map listings to product-like shape for StoreProductCard
  const mappedProducts = listings.map((l: any) => ({
    id: l.id,
    name: l.title,
    base_price: Number(l.price),
    currency: l.currency || "EUR",
    images: l.photos || l.images || [],
    short_description: l.description?.slice(0, 120),
    category: l.category,
    stock_status: l.quantity > 0 ? "in_stock" : "out_of_stock",
    stock_quantity: l.quantity,
    track_stock: true,
    store_featured: false,
    created_at: l.created_at,
    sku: null,
    billing_type: "one_time",
    primary_image_index: 0,
    product_condition: l.condition,
    workspace_id: wsId,
    _sellerId: seller?.id,
    _sellerName: seller?.display_name || seller?.name,
  }));

  if (sellerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Package className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-xl font-semibold">Vendedor não encontrado</h1>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{seller.display_name || seller.name} | {storeName}</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader
          storeName={storeName}
          logoUrl={storeSettings?.logo_url || undefined}
          workspaceSlug={wsSlug}
          categories={[]}
          onSelectCategory={() => {}}
          products={[]}
        />

        {/* Seller banner */}
        {seller.banner_url && (
          <div className="h-48 w-full overflow-hidden">
            <img src={seller.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          {/* Seller header */}
          <div className="flex items-start gap-6 mb-8">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={seller.avatar_url || seller.photo_url} />
              <AvatarFallback className="text-2xl font-bold">
                {(seller.display_name || seller.name || "S").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{seller.display_name || seller.name}</h1>
              {seller.bio && <p className="text-muted-foreground mt-1">{seller.bio}</p>}
              <div className="flex items-center gap-3 mt-2">
                {seller.rating_average > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {Number(seller.rating_average).toFixed(1)}
                  </Badge>
                )}
                <Badge variant="outline">{listings.length} produto{listings.length !== 1 ? "s" : ""}</Badge>
              </div>
            </div>
          </div>

          {/* Listings grid */}
          {listingsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mappedProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Este vendedor ainda não tem produtos publicados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {mappedProducts.map((product: any, i: number) => (
                <StoreProductCard
                  key={product.id}
                  product={product}
                  workspaceSlug={wsSlug}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>

        <StoreFooter
          workspaceSlug={wsSlug}
          storeName={storeName}
          categories={[]}
          footerText={storeSettings?.footer_text}
        />
      </div>
    </>
  );
}

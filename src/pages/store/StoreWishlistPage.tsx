import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { useStoreWishlist } from "@/hooks/useStoreReviewsWishlist";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Package, ShoppingBag, Trash2, ArrowLeft } from "lucide-react";

export default function StoreWishlistPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const wsSlug = workspaceSlug || "";
  const { addItem } = useStoreCart();

  // Get workspace id
  const { data: workspace } = useQuery({
    queryKey: ["store-workspace-id", wsSlug],
    queryFn: async () => {
      const { data } = await supabase.from("workspaces").select("id").eq("slug", wsSlug).single();
      return data;
    },
    enabled: !!wsSlug,
  });

  const { data: wishlistItems = [], isLoading } = useStoreWishlist(workspace?.id);

  // Load product details for wishlist items
  const productIds = wishlistItems.map((w) => w.product_id);
  const { data: products = [] } = useQuery({
    queryKey: ["store-wishlist-products", productIds],
    queryFn: async () => {
      if (!productIds.length) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, currency, images, primary_image_index, sku, stock_status")
        .in("id", productIds);
      return data || [];
    },
    enabled: productIds.length > 0,
  });

  const handleRemove = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("store_wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
  };

  return (
    <>
      <Helmet><title>Lista de Desejos | Loja</title></Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <StoreCartDrawer workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link to={`/store/${wsSlug}`}>
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-2xl font-bold">Lista de Desejos</h1>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <Package className="h-16 w-16 mx-auto opacity-20" />
              <p>A sua lista de desejos está vazia</p>
              <Link to={`/store/${wsSlug}`}>
                <Button variant="outline">Explorar produtos</Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const imgIdx = p.primary_image_index ?? 0;
                const img = p.images?.[imgIdx] || p.images?.[0];
                const isOut = p.stock_status === "out_of_stock";
                return (
                  <div key={p.id} className="border rounded-xl p-4 flex gap-4">
                    <Link to={`/store/${wsSlug}/product/${p.id}`} className="flex-shrink-0">
                      <div className="h-24 w-24 rounded-lg overflow-hidden bg-muted">
                        {img ? (
                          <img src={img} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0 space-y-2">
                      <Link to={`/store/${wsSlug}/product/${p.id}`} className="hover:text-primary transition-colors">
                        <h3 className="font-medium text-sm line-clamp-2">{p.name}</h3>
                      </Link>
                      <p className="text-sm font-bold text-primary">€{p.base_price.toFixed(2)}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1 text-xs"
                          disabled={isOut}
                          onClick={() =>
                            addItem({
                              productId: p.id,
                              name: p.name,
                              price: p.base_price,
                              currency: p.currency,
                              image: img,
                              sku: p.sku || undefined,
                            })
                          }
                        >
                          <ShoppingBag className="h-3 w-3" />
                          {isOut ? "Esgotado" : "Adicionar"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

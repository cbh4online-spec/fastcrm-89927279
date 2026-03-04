import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/c2c/ListingCard";
import { ArrowLeft, Star, ShieldCheck, Calendar, Package, Store } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function usePublicWorkspace(slug: string | undefined) {
  return useQuery({
    queryKey: ["c2c-public-workspace", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, slug")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

function usePublicSellerProfile(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-public-seller-profile", sellerId],
    queryFn: async () => {
      if (!sellerId) return null;
      const { data, error } = await supabase
        .from("c2c_sellers")
        .select("*")
        .eq("user_id", sellerId)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });
}

function usePublicSellerListings(sellerId: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-public-seller-listings", sellerId, workspaceId],
    queryFn: async () => {
      if (!sellerId || !workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("*")
        .eq("seller_id", sellerId)
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId && !!workspaceId,
  });
}

function usePublicSellerReviews(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-public-seller-reviews", sellerId],
    queryFn: async () => {
      if (!sellerId) return { reviews: [], average: 0, count: 0 };
      const { data, error } = await supabase
        .from("c2c_reviews")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const reviews = data || [];
      const count = reviews.length;
      const average = count > 0
        ? Math.round((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count) * 10) / 10
        : 0;
      return { reviews, average, count };
    },
    enabled: !!sellerId,
  });
}

export default function C2CPublicSellerProfile() {
  const { workspaceSlug, sellerId } = useParams<{ workspaceSlug: string; sellerId: string }>();
  const navigate = useNavigate();

  const { data: workspace, isLoading: wsLoading } = usePublicWorkspace(workspaceSlug);
  const workspaceId = workspace?.id;

  const { data: seller, isLoading: sellerLoading } = usePublicSellerProfile(sellerId);
  const { data: listings = [] } = usePublicSellerListings(sellerId, workspaceId);
  const { data: reviewData } = usePublicSellerReviews(sellerId);

  const isLoading = wsLoading || sellerLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        A carregar...
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Store className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Marketplace não encontrado</h1>
        <p className="text-muted-foreground">O marketplace que procura não existe ou não está disponível.</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-xl font-bold">Vendedor não encontrado</h1>
        <p className="text-muted-foreground">Este perfil não existe ou não está disponível.</p>
        <Button variant="outline" onClick={() => navigate(`/c2c/${workspaceSlug}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Marketplace
        </Button>
      </div>
    );
  }

  const ogTitle = `${seller?.display_name || "Vendedor"} — Marketplace C2C`;
  const ogDescription = seller?.bio || `Vê o perfil e os anúncios de ${seller?.display_name || "este vendedor"} no marketplace.`;
  const ogUrl = `${getPublicBaseUrl()}/c2c/${workspaceSlug}/seller/${sellerId}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
      </Helmet>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/c2c/${workspaceSlug}`)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Marketplace
        </Button>

        {/* Seller Header */}
        <div className="rounded-xl border bg-card p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {seller?.display_name?.[0]?.toUpperCase() || "V"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{seller?.display_name || "Vendedor"}</h1>
                {seller?.is_verified && (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verificado
                  </Badge>
                )}
              </div>
              {seller?.bio && (
                <p className="text-sm text-muted-foreground mb-2">{seller.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {reviewData && reviewData.count > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    {reviewData.average} ({reviewData.count} avaliações)
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" /> {listings.length} anúncios
                </span>
                {seller?.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Na plataforma desde {format(new Date(seller.created_at), "MMMM yyyy", { locale: pt })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {reviewData && reviewData.reviews.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3">Avaliações</h2>
            <div className="space-y-3">
              {reviewData.reviews.slice(0, 5).map((review: any) => (
                <div key={review.id} className="rounded-lg border p-4 bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), "d MMM yyyy", { locale: pt })}
                    </span>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listings */}
        <h2 className="text-lg font-bold mb-3">Anúncios ({listings.length})</h2>
        {listings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Este vendedor não tem anúncios ativos.</p>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing: any) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={false}
                onToggleFavorite={() => {}}
                onClick={() => navigate(`/c2c/${workspaceSlug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

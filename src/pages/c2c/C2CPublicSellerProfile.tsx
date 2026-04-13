import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { getMarketplaceBaseUrlFromConfig } from "@/utils/getPublicDomain";
import { getShareUrl } from "@/utils/getShareUrl";
import { supabase } from "@/integrations/supabase/client";
import { usePublicMarketplaceWorkspace } from "@/hooks/c2c/usePublicMarketplaceWorkspace";
import { usePublicMarketplaceTheme } from "@/hooks/c2c/usePublicMarketplaceTheme";
import { ShareButtons } from "@/components/c2c/ShareButtons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/c2c/ListingCard";
import { MarketplaceFooter } from "@/components/c2c/MarketplaceFooter";
import { ArrowLeft, Star, ShieldCheck, Calendar, Package, Store } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function usePublicSellerProfile(sellerId: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-public-seller-profile", sellerId, workspaceId],
    queryFn: async () => {
      if (!sellerId || !workspaceId) return null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(sellerId);
      const filter = isUUID ? { column: "user_id", value: sellerId } : { column: "slug", value: sellerId };
      const { data, error } = await (supabase as any)
        .from("c2c_sellers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq(filter.column, filter.value)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId && !!workspaceId,
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
  usePublicMarketplaceTheme();

  const { data: workspace, isLoading: wsLoading } = usePublicMarketplaceWorkspace(workspaceSlug);
  const workspaceId = workspace?.id;

  const { data: seller, isLoading: sellerLoading } = usePublicSellerProfile(sellerId, workspaceId);
  const sellerUserId = seller?.user_id;
  const { data: listings = [] } = usePublicSellerListings(sellerUserId, workspaceId);
  const { data: reviewData } = usePublicSellerReviews(sellerId);

  const isLoading = wsLoading || sellerLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-gray-400">
        A carregar...
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white text-gray-900">
        <Store className="h-12 w-12 text-gray-300" />
        <h1 className="text-xl font-bold">Marketplace não encontrado</h1>
        <p className="text-gray-400">O marketplace que procura não existe ou não está disponível.</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white text-gray-900">
        <h1 className="text-xl font-bold">Vendedor não encontrado</h1>
        <p className="text-gray-400">Este perfil não existe ou não está disponível.</p>
        <Button variant="outline" className="border-gray-200 text-gray-800 hover:bg-gray-100" onClick={() => navigate(`/marketplace/${workspaceSlug}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Marketplace
        </Button>
      </div>
    );
  }

  const ogTitle = `${seller?.display_name || "Vendedor"} — Marketplace C2C`;
  const ogDescription = seller?.bio || `Vê o perfil e os anúncios de ${seller?.display_name || "este vendedor"} no marketplace.`;
  const ogUrl = `${getMarketplaceBaseUrlFromConfig()}/marketplace/${workspaceSlug}/seller/${sellerId}`;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
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
        <Button variant="ghost" size="sm" onClick={() => navigate(`/marketplace/${workspaceSlug}`)} className="mb-4 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Marketplace
        </Button>

        {/* Seller Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-[#09B1BA]/10 flex items-center justify-center text-2xl font-bold text-[#09B1BA]">
              {seller?.display_name?.[0]?.toUpperCase() || "V"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{seller?.display_name || "Vendedor"}</h1>
                {seller?.is_verified && (
                  <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-600 border-gray-200">
                    <ShieldCheck className="h-3 w-3" /> Verificado
                  </Badge>
                )}
              </div>
              {seller?.bio && (
                <p className="text-sm text-gray-500 mb-2">{seller.bio}</p>
              )}
              <ShareButtons url={getShareUrl("c2c-seller", (workspaceSlug || "") + "/" + (sellerId || ""))} title={ogTitle} variant="dark" />
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2">
                {reviewData && reviewData.count > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-[#09B1BA] fill-[#09B1BA]" />
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
            <h2 className="text-lg font-bold mb-3 text-gray-900">Avaliações</h2>
            <div className="space-y-3">
              {reviewData.reviews.slice(0, 5).map((review: any) => (
                <div key={review.id} className="rounded-lg border border-gray-200 p-4 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "text-[#09B1BA] fill-[#09B1BA]" : "text-gray-200"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(review.created_at), "d MMM yyyy", { locale: pt })}
                    </span>
                  </div>
                  {review.comment && <p className="text-sm text-gray-500">{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listings */}
        <h2 className="text-lg font-bold mb-3 text-gray-900">Anúncios ({listings.length})</h2>
        {listings.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Este vendedor não tem anúncios ativos.</p>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing: any) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={false}
                onToggleFavorite={() => {}}
                onClick={() => navigate(`/marketplace/${workspaceSlug}/listing/${listing.id}`)}
              />
            ))}
          </div>
        )}
      </div>
      <MarketplaceFooter workspaceName={workspace?.name || ""} workspaceSlug={workspaceSlug || ""} />
    </div>
  );
}

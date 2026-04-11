import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { usePublicMarketplaceWorkspace } from "@/hooks/c2c/usePublicMarketplaceWorkspace";
import { usePublicMarketplaceTheme } from "@/hooks/c2c/usePublicMarketplaceTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareButtons } from "@/components/c2c/ShareButtons";
import { ShareListingButton } from "@/components/c2c/public/ShareListingButton";
import { ReviewsList } from "@/components/c2c/reviews/ReviewsList";
import { C2CPublicOfferDialog } from "@/components/c2c/C2CPublicOfferDialog";
import { C2CQuickCheckoutDialog } from "@/components/c2c/C2CQuickCheckoutDialog";
import { ReportListingButton } from "@/components/c2c/public/ReportListingButton";
import { SchemaOrgProduct } from "@/components/c2c/public/SchemaOrgProduct";
import { MarketplaceFooter } from "@/components/c2c/MarketplaceFooter";
import { getShareUrl } from "@/utils/getShareUrl";
import {
  ArrowLeft, MapPin, Eye, Clock, ShieldCheck, MessageCircle, HandCoins,
  ChevronLeft, ChevronRight, User, Tag, ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import type { C2CListing } from "@/hooks/useC2CListings";

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "text-green-600 bg-green-50 border-green-200" },
  like_new: { label: "Como novo", color: "text-blue-600 bg-blue-50 border-blue-200" },
  used: { label: "Usado", color: "text-amber-600 bg-amber-50 border-amber-200" },
  for_parts: { label: "Para peças", color: "text-gray-500 bg-gray-100 border-gray-200" },
};

function usePublicWorkspace(slug: string | undefined) {
  return usePublicMarketplaceWorkspace(slug);
}

function usePublicListing(id: string | undefined) {
  return useQuery({
    queryKey: ["c2c-public-listing", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("c2c_listings")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single();
      if (error) throw error;
      return data as C2CListing;
    },
    enabled: !!id,
  });
}

function useSellerProfile(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-profile", sellerId],
    queryFn: async () => {
      if (!sellerId) return null;
      const { data, error } = await supabase
        .from("c2c_sellers")
        .select("id, user_id, display_name, avatar_url, avg_rating, total_sales, total_reviews, is_verified")
        .eq("user_id", sellerId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!sellerId,
  });
}

export default function C2CPublicListingDetail() {
  const { workspaceSlug, id } = useParams<{ workspaceSlug: string; id: string }>();
  const navigate = useNavigate();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  usePublicMarketplaceTheme();

  const { data: workspace, isLoading: wsLoading } = usePublicWorkspace(workspaceSlug);
  const { data: listing, isLoading: listingLoading } = usePublicListing(id);
  const { data: seller } = useSellerProfile(listing?.seller_id);

  useEffect(() => {
    if (!id) return;
    const key = `c2c_viewed_${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.rpc("increment_listing_views", { listing_id: id });
  }, [id]);

  const isLoading = wsLoading || listingLoading;
  const photos = listing?.photos ?? [];
  const condition = conditionLabels[listing?.condition ?? ""] ?? { label: listing?.condition, color: "" };
  const timeAgo = listing ? formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: pt }) : "";

  const ogImage = photos[0] ?? "";
  const ogTitle = listing ? `${listing.title} — ${listing.price.toFixed(0)}€` : "Anúncio";
  const ogDesc = listing?.description?.slice(0, 160) ?? "Veja este anúncio no marketplace";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-8 w-48 bg-gray-100" />
          <Skeleton className="h-[400px] w-full rounded-2xl bg-gray-100" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-40 bg-gray-100 rounded-xl" />
            <Skeleton className="h-40 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-500">
        <div className="text-center space-y-4">
          <p className="text-xl text-gray-800">Anúncio não encontrado</p>
          <Button
            variant="outline"
            className="border-gray-200 text-gray-800 hover:bg-gray-100"
            onClick={() => navigate(`/marketplace/${workspaceSlug}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDesc} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`${window.location.origin}/marketplace/${workspaceSlug}/listing/${id}`} />
        {listing && <meta property="product:price:amount" content={listing.price.toFixed(2)} />}
        {listing && <meta property="product:price:currency" content={listing.currency || "EUR"} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDesc} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <link rel="canonical" href={`${window.location.origin}/marketplace/${workspaceSlug}/listing/${id}`} />
      </Helmet>
      <SchemaOrgProduct
        name={listing.title}
        description={listing.description || undefined}
        price={listing.price}
        currency={listing.currency ?? "EUR"}
        image={ogImage}
        url={`${window.location.origin}/marketplace/${workspaceSlug}/listing/${id}`}
        condition={listing.condition}
        sellerName={seller?.display_name}
        rating={seller?.avg_rating}
        reviewCount={seller?.total_reviews}
      />

      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => navigate(`/marketplace/${workspaceSlug}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Marketplace
            </Button>
            <ShareButtons
              url={getShareUrl("c2c-listing", `${workspaceSlug}/${id}`)}
              title={listing.title}
              description={ogDesc}
              variant="dark"
            />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Photos */}
            <div className="lg:col-span-3 space-y-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-gray-200">
                {photos.length > 0 ? (
                  <img
                    src={photos[photoIndex]}
                    alt={listing.title}
                    className="w-full h-full object-contain bg-white"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <span className="text-6xl">📦</span>
                  </div>
                )}

                {photos.length > 1 && (
                  <>
                    <button
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 transition-colors shadow border border-gray-200"
                      onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 transition-colors shadow border border-gray-200"
                      onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900/70 rounded-full px-3 py-1 text-xs text-white border border-gray-200">
                      {photoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        i === photoIndex ? "border-[#09B1BA] ring-1 ring-[#09B1BA]/50" : "border-gray-200 opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Description */}
              {listing.description && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-[#09B1BA] mb-3">Descrição</h2>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Details + CTA */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                {/* Price */}
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-[#09B1BA]">
                    {listing.price.toFixed(0)}€
                  </span>
                  <Badge variant="outline" className={cn("text-xs border", condition.color)}>
                    {condition.label}
                  </Badge>
                </div>

                {/* Title */}
                <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                  {listing.title}
                </h1>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {listing.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {listing.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {listing.views_count} visualizações
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {timeAgo}
                  </span>
                </div>

                {/* CTA */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-[#09B1BA] hover:bg-[#078E96] text-white font-semibold h-12 text-base"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" /> Comprar Agora — {listing.price.toFixed(0)}€
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-gray-200 text-gray-800 hover:bg-gray-100 h-11"
                    onClick={() => navigate(`/marketplace/${workspaceSlug}/seller/${listing.seller_id}`)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" /> Contactar vendedor
                  </Button>

                  {workspace && (
                    <C2CPublicOfferDialog
                      listingId={listing.id}
                      listingTitle={listing.title}
                      originalPrice={listing.price}
                      currency={listing.currency ?? "EUR"}
                      workspaceId={workspace.id}
                      sellerId={listing.seller_id}
                    />
                  )}
                </div>

                {workspace && (
                  <C2CQuickCheckoutDialog
                    open={checkoutOpen}
                    onOpenChange={setCheckoutOpen}
                    listing={{
                      id: listing.id,
                      title: listing.title,
                      price: listing.price,
                      currency: listing.currency ?? "EUR",
                      photos: listing.photos,
                      delivery_mode: (listing as any).delivery_mode,
                    }}
                    workspaceId={workspace.id}
                    isAuthenticated={false}
                  />
                )}
              </div>

              {/* Seller card */}
              {seller && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor</h3>
                  <div className="flex items-center gap-3">
                    {seller.avatar_url ? (
                      <img src={seller.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800 flex items-center gap-1.5">
                        {seller.display_name}
                        {seller.is_verified && <ShieldCheck className="h-4 w-4 text-[#09B1BA]" />}
                      </p>
                      <p className="text-xs text-gray-500">
                        {seller.total_sales ?? 0} vendas
                        {seller.avg_rating ? ` · ⭐ ${seller.avg_rating.toFixed(1)}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-gray-200 text-gray-800 hover:bg-gray-100"
                    onClick={() => navigate(`/marketplace/${workspaceSlug}/seller/${seller.user_id ?? seller.id}`)}
                  >
                    Ver perfil do vendedor
                  </Button>
                </div>
              )}

              {/* Trust badges */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="h-4 w-4 text-[#09B1BA]" />
                  <span>Anúncio verificado pela moderação</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Tag className="h-4 w-4 text-[#09B1BA]" />
                  <span>Pagamento seguro entre utilizadores</span>
                </div>
              </div>

              {/* Share & Report */}
              <div className="flex flex-wrap gap-2">
                <ShareListingButton
                  url={`/marketplace/${workspaceSlug}/listing/${listing.id}`}
                  title={listing.title}
                  description={listing.description?.slice(0, 160)}
                  className="flex-1 border-gray-200 text-gray-800 hover:bg-gray-100"
                />
                {workspace && (
                  <ReportListingButton listingId={listing.id} workspaceId={workspace.id} />
                )}
              </div>
            </div>

            {/* Reviews section */}
            <div className="lg:col-span-5 mt-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Avaliações</h2>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <ReviewsList listingId={listing.id} />
              </div>
            </div>
          </div>
        </main>
        <MarketplaceFooter workspaceName={workspace?.name || ""} workspaceSlug={workspaceSlug || ""} />
      </div>
    </>
  );
}

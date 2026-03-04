import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareButtons } from "@/components/c2c/ShareButtons";
import { getShareUrl } from "@/utils/getShareUrl";
import {
  ArrowLeft, MapPin, Eye, Clock, ShieldCheck, MessageCircle,
  ChevronLeft, ChevronRight, User, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import type { C2CListing } from "@/hooks/useC2CListings";

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "text-green-400 bg-green-500/10 border-green-500/30" },
  like_new: { label: "Como novo", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  used: { label: "Usado", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  for_parts: { label: "Para peças", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30" },
};

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
        .select("id, display_name, avatar_url, avg_rating, total_sales, is_verified")
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

  const { data: workspace, isLoading: wsLoading } = usePublicWorkspace(workspaceSlug);
  const { data: listing, isLoading: listingLoading } = usePublicListing(id);
  const { data: seller } = useSellerProfile(listing?.seller_id);

  const isLoading = wsLoading || listingLoading;
  const photos = listing?.photos ?? [];
  const condition = conditionLabels[listing?.condition ?? ""] ?? { label: listing?.condition, color: "" };
  const timeAgo = listing ? formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: pt }) : "";

  const ogImage = photos[0] ?? "";
  const ogTitle = listing ? `${listing.title} — ${listing.price.toFixed(0)}€` : "Anúncio";
  const ogDesc = listing?.description?.slice(0, 160) ?? "Veja este anúncio no marketplace";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-8 w-48 bg-zinc-800" />
          <Skeleton className="h-[400px] w-full rounded-2xl bg-zinc-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-40 bg-zinc-800 rounded-xl" />
            <Skeleton className="h-40 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="text-center space-y-4">
          <p className="text-xl">Anúncio não encontrado</p>
          <Button
            variant="outline"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={() => navigate(`/c2c/${workspaceSlug}`)}
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
      </Helmet>

      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-amber-500/10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-amber-400"
              onClick={() => navigate(`/c2c/${workspaceSlug}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Marketplace
            </Button>
            <ShareButtons
              url={window.location.href}
              title={listing.title}
              description={ogDesc}
            />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Photos */}
            <div className="lg:col-span-3 space-y-4">
              {/* Main photo */}
              <motion.div
                className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {photos.length > 0 ? (
                  <img
                    src={photos[photoIndex]}
                    alt={listing.title}
                    className="w-full h-full object-contain bg-zinc-900"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <span className="text-6xl">📦</span>
                  </div>
                )}

                {photos.length > 1 && (
                  <>
                    <button
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-full p-2 transition-colors"
                      onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-full p-2 transition-colors"
                      onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900/80 rounded-full px-3 py-1 text-xs text-zinc-400">
                      {photoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </motion.div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        i === photoIndex ? "border-amber-500 ring-1 ring-amber-500/50" : "border-zinc-700 opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Description */}
              {listing.description && (
                <motion.div
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-sm font-semibold text-amber-400 mb-3">Descrição</h2>
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Right: Details + CTA */}
            <div className="lg:col-span-2 space-y-5">
              <motion.div
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Price */}
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-amber-400">
                    {listing.price.toFixed(0)}€
                  </span>
                  <Badge variant="outline" className={cn("text-xs border", condition.color)}>
                    {condition.label}
                  </Badge>
                </div>

                {/* Title */}
                <h1 className="text-xl font-semibold text-zinc-100 leading-tight">
                  {listing.title}
                </h1>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
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
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-semibold h-12 text-base"
                  onClick={() => navigate(`/c2c/${workspaceSlug}/sell`)}
                >
                  <MessageCircle className="h-5 w-5 mr-2" /> Contactar vendedor
                </Button>
              </motion.div>

              {/* Seller card */}
              {seller && (
                <motion.div
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vendedor</h3>
                  <div className="flex items-center gap-3">
                    {seller.avatar_url ? (
                      <img src={seller.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-zinc-700" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="h-5 w-5 text-zinc-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-zinc-200 flex items-center gap-1.5">
                        {seller.display_name}
                        {seller.is_verified && <ShieldCheck className="h-4 w-4 text-amber-400" />}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {seller.total_sales ?? 0} vendas
                        {seller.avg_rating ? ` · ⭐ ${seller.avg_rating.toFixed(1)}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-zinc-700 text-zinc-300 hover:text-amber-400 hover:border-amber-500/30"
                    onClick={() => navigate(`/c2c/${workspaceSlug}/seller/${seller.id}`)}
                  >
                    Ver perfil do vendedor
                  </Button>
                </motion.div>
              )}

              {/* Trust badges */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <ShieldCheck className="h-4 w-4 text-amber-500/70" />
                  <span>Anúncio verificado pela moderação</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Tag className="h-4 w-4 text-amber-500/70" />
                  <span>Pagamento seguro entre utilizadores</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

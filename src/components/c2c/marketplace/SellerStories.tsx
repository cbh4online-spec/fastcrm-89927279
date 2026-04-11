import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Plus, Store, Heart, Send, ShoppingBag, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerStory {
  seller_id: string;
  seller_name: string;
  avatar_url: string | null;
  listings: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
    created_at: string;
  }[];
}

function useSellerStories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-seller-stories", workspaceId],
    queryFn: async (): Promise<SellerStory[]> => {
      if (!workspaceId) return [];

      const { data: sellers, error: sErr } = await supabase
        .from("c2c_sellers")
        .select("id, display_name, avatar_url, user_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "approved")
        .limit(20);

      if (sErr || !sellers?.length) return [];

      const sellerIds = sellers.map((s) => s.id);
      const { data: listings, error: lErr } = await supabase
        .from("c2c_listings")
        .select("id, title, price, photos, seller_id, created_at")
        .in("seller_id", sellerIds)
        .eq("status", "active")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);

      if (lErr) return [];

      const map = new Map<string, SellerStory>();
      for (const s of sellers) {
        map.set(s.id, {
          seller_id: s.id,
          seller_name: s.display_name || "Vendedor",
          avatar_url: s.avatar_url,
          listings: [],
        });
      }

      for (const l of listings || []) {
        const story = map.get(l.seller_id);
        if (story && story.listings.length < 5) {
          const imgs = l.photos as string[] | null;
          story.listings.push({
            id: l.id,
            title: l.title,
            price: l.price,
            image_url: imgs?.[0] || null,
            created_at: l.created_at,
          });
        }
      }

      return Array.from(map.values()).filter((s) => s.listings.length > 0);
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

/* ── Story Viewer (fullscreen overlay — Instagram style) ──────── */
function StoryViewer({
  stories,
  initialIndex,
  onClose,
}: {
  stories: SellerStory[];
  initialIndex: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { workspaceSlug } = useParams();
  const [sellerIdx, setSellerIdx] = useState(initialIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const DURATION = 5000;

  const story = stories[sellerIdx];
  const slide = story?.listings[slideIdx];

  const nextSlide = useCallback(() => {
    if (!story) return;
    if (slideIdx < story.listings.length - 1) {
      setSlideIdx((i) => i + 1);
      setProgress(0);
    } else if (sellerIdx < stories.length - 1) {
      setSellerIdx((i) => i + 1);
      setSlideIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [story, slideIdx, sellerIdx, stories.length, onClose]);

  const prevSlide = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((i) => i - 1);
      setProgress(0);
    } else if (sellerIdx > 0) {
      setSellerIdx((i) => i - 1);
      setSlideIdx(0);
      setProgress(0);
    }
  }, [slideIdx, sellerIdx]);

  useEffect(() => {
    setProgress(0);
    if (isPaused) return;
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / DURATION, 1);
      setProgress(pct);
      if (pct >= 1) nextSlide();
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [sellerIdx, slideIdx, nextSlide, isPaused]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextSlide, prevSlide, onClose]);

  if (!story || !slide) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      {/* Background blur preview */}
      {slide.image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
          style={{ backgroundImage: `url(${slide.image_url})` }}
        />
      )}

      <div
        className="relative w-full max-w-[420px] h-[90vh] max-h-[780px] rounded-2xl overflow-hidden bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-[3px] px-2 pt-2">
          {story.listings.map((_, i) => (
            <div key={i} className="flex-1 h-[2.5px] rounded-full bg-white/25 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < slideIdx ? "100%" : i === slideIdx ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-3 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3">
          <button
            onClick={() => navigate(`/marketplace/${workspaceSlug}/seller/${story.seller_id}`)}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/40">
              {story.avatar_url ? (
                <img src={story.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#09B1BA] to-[#078E96] flex items-center justify-center text-white text-sm font-bold">
                  {story.seller_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-white text-[13px] font-semibold leading-tight drop-shadow">{story.seller_name}</span>
              <span className="text-white/50 text-[10px]">
                {new Date(slide.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
              </span>
            </div>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${sellerIdx}-${slideIdx}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {slide.image_url ? (
              <img
                src={slide.image_url}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#09B1BA] to-[#078E96] flex items-center justify-center">
                <Store className="h-20 w-20 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/40" />
          </motion.div>
        </AnimatePresence>

        {/* Bottom product card overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              {slide.image_url && (
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{slide.title}</h3>
                <p className="font-extrabold text-lg text-[#09B1BA]">{slide.price.toFixed(2)} €</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate(`/marketplace/${workspaceSlug}/${slide.id}`)}
                className="flex-1 h-10 rounded-xl bg-[#09B1BA] text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-[#078E96] transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                Ver produto
              </button>
              <button className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Heart className="h-4 w-4 text-gray-600" />
              </button>
              <button className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Send className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Navigation zones */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/3 z-20"
          onClick={prevSlide}
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-1/3 z-20"
          onClick={nextSlide}
        />

        {/* Side arrows (desktop) */}
        {sellerIdx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setSellerIdx((i) => i - 1); setSlideIdx(0); setProgress(0); }}
            className="absolute left-[-56px] top-1/2 -translate-y-1/2 z-30 hidden md:flex w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}
        {sellerIdx < stories.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); setSellerIdx((i) => i + 1); setSlideIdx(0); setProgress(0); }}
            className="absolute right-[-56px] top-1/2 -translate-y-1/2 z-30 hidden md:flex w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition-colors backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Stories Bar (Instagram-style horizontal scroll) ───────────── */
export function SellerStories({ workspaceId }: { workspaceId: string | undefined }) {
  const { data: stories = [] } = useSellerStories(workspaceId);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { workspaceSlug } = useParams();

  if (stories.length === 0) return null;

  return (
    <>
      <div className="py-2">
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-sm font-semibold text-gray-900">Stories</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-1 pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Your story / sell CTA */}
          <button
            onClick={() => navigate(`/marketplace/${workspaceSlug}/sell`)}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className="relative w-[72px] h-[72px]">
              <div className="w-full h-full rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:border-[#09B1BA] group-hover:bg-[#09B1BA]/5 transition-colors">
                <Plus className="h-6 w-6 text-gray-400 group-hover:text-[#09B1BA] transition-colors" />
              </div>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">O teu</span>
          </button>

          {stories.map((story, idx) => (
            <button
              key={story.seller_id}
              onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div className="relative w-[72px] h-[72px]">
                {/* Animated gradient ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #09B1BA)",
                    padding: "3px",
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                      {story.avatar_url ? (
                        <img
                          src={story.avatar_url}
                          alt={story.seller_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#09B1BA] to-[#078E96]">
                          <span className="text-lg font-bold text-white">
                            {story.seller_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live-style badge for new listings */}
                {story.listings.length >= 3 && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-[#09B1BA] text-white text-[8px] font-bold px-2 py-0.5 rounded-full ring-2 ring-white uppercase tracking-wider">
                    Novo
                  </div>
                )}
              </div>
              <span className="text-[11px] text-gray-600 font-medium max-w-[72px] truncate group-hover:text-gray-900 transition-colors">
                {story.seller_name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            stories={stories}
            initialIndex={viewerIndex}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

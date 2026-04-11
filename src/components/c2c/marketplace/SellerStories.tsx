import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Plus, Store } from "lucide-react";
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

      // Get recent active sellers with their latest listings
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
        .select("id, title, price, images, seller_id, created_at")
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
          const imgs = l.images as string[] | null;
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

/* ── Story Viewer (fullscreen overlay) ────────────────────────── */
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
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / DURATION, 1);
      setProgress(pct);
      if (pct >= 1) nextSlide();
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [sellerIdx, slideIdx, nextSlide]);

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
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] h-[85vh] max-h-[750px] rounded-2xl overflow-hidden bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {story.listings.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < slideIdx ? "100%" : i === slideIdx ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
          <button
            onClick={() => navigate(`/marketplace/${workspaceSlug}/seller/${story.seller_id}`)}
            className="flex items-center gap-2"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#09B1BA] to-[#078E96] flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/50">
              {story.avatar_url ? (
                <img src={story.avatar_url} className="w-full h-full rounded-full object-cover" />
              ) : (
                story.seller_name.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-white text-sm font-semibold drop-shadow">{story.seller_name}</span>
          </button>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${sellerIdx}-${slideIdx}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
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
                <Store className="h-20 w-20 text-white/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          </motion.div>
        </AnimatePresence>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-5 space-y-3">
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow line-clamp-2">
            {slide.title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-white font-extrabold text-xl">
              {slide.price.toFixed(2)} €
            </span>
            <button
              onClick={() => navigate(`/marketplace/${workspaceSlug}/${slide.id}`)}
              className="px-4 py-2 rounded-full bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Ver produto
            </button>
          </div>
        </div>

        {/* Navigation zones */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          onClick={prevSlide}
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          onClick={nextSlide}
        />

        {/* Side arrows (desktop) */}
        {sellerIdx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setSellerIdx((i) => i - 1); setSlideIdx(0); setProgress(0); }}
            className="absolute left-[-52px] top-1/2 -translate-y-1/2 z-30 hidden md:flex w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}
        {sellerIdx < stories.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); setSellerIdx((i) => i + 1); setSlideIdx(0); setProgress(0); }}
            className="absolute right-[-52px] top-1/2 -translate-y-1/2 z-30 hidden md:flex w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Stories Bar (horizontal scroll of seller bubbles) ─────────── */
export function SellerStories({ workspaceId }: { workspaceId: string | undefined }) {
  const { data: stories = [] } = useSellerStories(workspaceId);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (stories.length === 0) return null;

  return (
    <>
      <div className="py-3">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-1 pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {stories.map((story, idx) => (
            <button
              key={story.seller_id}
              onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div className="relative">
                {/* Gradient ring */}
                <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-tr from-[#09B1BA] via-[#F59E0B] to-[#EF4444]">
                  <div className="w-full h-full rounded-full p-[2px] bg-white">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#09B1BA]/20 to-gray-100 flex items-center justify-center overflow-hidden">
                      {story.avatar_url ? (
                        <img
                          src={story.avatar_url}
                          alt={story.seller_name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-lg font-bold text-[#09B1BA]">
                          {story.seller_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Listing count badge */}
                {story.listings.length > 1 && (
                  <span className="absolute -bottom-0.5 -right-0.5 bg-[#09B1BA] text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                    {story.listings.length}
                  </span>
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

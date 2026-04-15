import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Eye,
  Radio,
  ShoppingBag,
  Clock,
  Share2,
  Copy,
  ExternalLink,
  Send,
  LogIn,
  X,
  Star,
  Loader2,
  VideoOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useLivestreamById,
  useLivestreamMessages,
  useSendLiveMessage,
  useTrackViewer,
  type LivestreamMessage,
} from "@/hooks/c2c/useLivestreams";
import { useGenerateLiveKitToken } from "@/hooks/c2c/useLiveSessions";
import { LiveKitVideoRoom } from "@/components/c2c/livestream/LiveKitVideoRoom";
import { LiveReactions } from "@/components/c2c/livestream/LiveReactions";
import { LIVEKIT_SERVER_URL } from "@/config/livekit";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const sb = supabase as any;

export default function GlobalLiveViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: live, isLoading } = useLivestreamById(id);
  const generateToken = useGenerateLiveKitToken();
  const queryClient = useQueryClient();

  const isLive = live?.status === "live";

  // Track viewer count
  useTrackViewer(id, isLive);

  // Realtime subscription for live updates (viewer_count, featured_product_id)
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`viewer-live-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "c2c_livestreams",
        filter: `id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["c2c-livestream", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  // Generate LiveKit token
  useEffect(() => {
    if (!isLive || !live?.livekit_room_name || livekitToken) return;

    const identity = user?.id || `guest-${crypto.randomUUID().slice(0, 8)}`;
    const name = user?.user_metadata?.full_name || user?.email || "Espectador";

    generateToken.mutate(
      {
        room_name: live.livekit_room_name,
        participant_identity: identity,
        participant_name: name,
        is_publisher: false,
      },
      {
        onSuccess: (data) => setLivekitToken(data.token),
        onError: () => toast.error("Erro ao conectar à sala de vídeo"),
      }
    );
  }, [isLive, live?.livekit_room_name, user?.id]);

  const handleViewerCountChange = useCallback((count: number) => {
    setViewerCount(count);
  }, []);

  const liveUrl = typeof window !== "undefined" ? `${window.location.origin}/marketplace/lives/${id}` : "";

  const handleShare = async (method: string) => {
    if (!live) return;
    const text = `🔴 ${live.seller_name || "Vendedor"} está em direto: ${live.title}`;
    switch (method) {
      case "copy":
        await navigator.clipboard.writeText(liveUrl);
        toast.success("Link copiado!");
        break;
      case "native":
        if (navigator.share) await navigator.share({ title: live.title, text, url: liveUrl }).catch(() => {});
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + liveUrl)}`, "_blank");
        break;
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0D1117" }}>
        <Loader2 className="h-8 w-8 text-white/30 animate-spin" />
      </div>
    );
  }

  // Not found
  if (!live) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0D1117" }}>
        <div className="text-center">
          <Radio className="h-16 w-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Live não encontrada</p>
          <Button variant="outline" className="mt-4 border-white/10 text-white/60" onClick={() => navigate("/marketplace/lives")}>
            Ver todas as lives
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0D1117" }}>
      {/* Top bar */}
      <header
        className="border-b sticky top-0 z-40 backdrop-blur-xl px-4 py-2 flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(13,17,23,0.92)" }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/marketplace/lives")}
          className="text-white/60 hover:text-white hover:bg-white/5 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Lives</span>
        </Button>

        <div className="flex items-center gap-2">
          {isLive && (
            <Badge className="border-0 gap-1.5 font-bold text-white" style={{ backgroundColor: "#ef4444" }}>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              AO VIVO
            </Badge>
          )}
          {live.status === "ended" && <Badge className="bg-white/10 text-white/50 border-0">Terminada</Badge>}
          {live.status === "scheduled" && (
            <Badge className="bg-white/10 text-white/50 border-0 gap-1">
              <Clock className="h-3 w-3" />
              Agendada
            </Badge>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5 gap-1.5">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Partilhar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleShare("copy")} className="gap-2 cursor-pointer">
              <Copy className="h-4 w-4" /> Copiar link
            </DropdownMenuItem>
            {"share" in navigator && (
              <DropdownMenuItem onClick={() => handleShare("native")} className="gap-2 cursor-pointer">
                <ExternalLink className="h-4 w-4" /> Partilhar via…
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleShare("whatsapp")} className="gap-2 cursor-pointer">
              <span className="text-base leading-none">💬</span> WhatsApp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 49px)" }}>
        {/* Left — Video (70%) */}
        <div className="flex-[7] flex flex-col relative">
          <div className="flex-1 relative bg-black">
            <div className="absolute inset-0">
              {isLive ? (
                <LiveKitVideoRoom
                  token={livekitToken}
                  serverUrl={LIVEKIT_SERVER_URL}
                  isPublisher={false}
                  isLive={isLive}
                  title={live.title}
                  sellerName={live.seller_name}
                  thumbnailUrl={live.thumbnail_url ?? undefined}
                  onViewerCountChange={handleViewerCountChange}
                />
              ) : (
                <StatusOverlay status={live.status} title={live.title} sellerName={live.seller_name} scheduledAt={live.scheduled_at} />
              )}
            </div>

            {/* Reactions */}
            {isLive && <LiveReactions isLive={isLive} />}

            {/* Viewer count badge */}
            {isLive && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-black/60 text-white border-0 gap-1.5 backdrop-blur-sm">
                  <Eye className="h-3 w-3" />
                  {viewerCount || live.viewer_count} a ver
                </Badge>
              </div>
            )}

            {/* Featured product overlay */}
            <FeaturedProductOverlay
              livestreamId={id!}
              featuredProductId={live.featured_product_id}
              productIds={live.product_ids || []}
            />
          </div>

          {/* Info bar */}
          <div className="px-4 py-3 border-t flex items-center gap-3 flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(13,17,23,0.95)" }}>
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="text-sm font-bold" style={{ backgroundColor: "rgba(0,200,150,0.15)", color: "#00C896" }}>
                {(live.seller_name || "V")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-sm truncate">{live.title}</h2>
              <p className="text-white/40 text-xs truncate">{live.seller_name || "Vendedor"}</p>
            </div>
          </div>
        </div>

        {/* Right — Chat + Products (30%) */}
        <div className="flex-[3] flex flex-col border-l overflow-hidden h-[400px] lg:h-full" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-sm font-semibold text-white">Chat ao vivo</span>
              {isLive && (
                <Badge className="text-[10px] border-0" style={{ backgroundColor: "rgba(0,200,150,0.12)", color: "#00C896" }}>
                  {viewerCount || live.viewer_count} online
                </Badge>
              )}
            </div>
            <ViewerChat livestreamId={id!} isLive={isLive} user={user} />
          </div>

          {/* Product list */}
          <ProductList
            productIds={live.product_ids || []}
            featuredProductId={live.featured_product_id}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Status overlay for scheduled / ended
   ═══════════════════════════════════════════════ */
function StatusOverlay({ status, title, sellerName, scheduledAt }: { status: string; title: string; sellerName?: string; scheduledAt?: string | null }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="text-center px-6">
        {status === "scheduled" ? (
          <>
            <Clock className="h-16 w-16 text-white/15 mx-auto mb-4" />
            <p className="text-white font-bold text-lg">{title}</p>
            {sellerName && <p className="text-white/40 text-sm mt-1">{sellerName}</p>}
            <p className="text-white/30 text-xs mt-3">
              {scheduledAt
                ? `Começa ${formatDistanceToNow(new Date(scheduledAt), { addSuffix: true, locale: pt })}`
                : "Esta live ainda não começou"}
            </p>
          </>
        ) : (
          <>
            <VideoOff className="h-16 w-16 text-white/15 mx-auto mb-4" />
            <p className="text-white font-bold text-lg">{title}</p>
            <p className="text-white/30 text-xs mt-3">Esta live já terminou</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Featured product overlay (bottom-right)
   ═══════════════════════════════════════════════ */
function FeaturedProductOverlay({
  livestreamId,
  featuredProductId,
  productIds,
}: {
  livestreamId: string;
  featuredProductId: string | null;
  productIds: string[];
}) {
  const [product, setProduct] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const prevFeaturedId = useRef<string | null>(null);

  // Reset dismissed when featured product changes
  useEffect(() => {
    if (featuredProductId && featuredProductId !== prevFeaturedId.current) {
      setDismissed(false);
      prevFeaturedId.current = featuredProductId;
    }
  }, [featuredProductId]);

  // Fetch featured product data
  useEffect(() => {
    if (!featuredProductId) { setProduct(null); return; }

    sb.from("c2c_listings")
      .select("id, title, price, currency, photos")
      .eq("id", featuredProductId)
      .maybeSingle()
      .then(({ data }: any) => setProduct(data));
  }, [featuredProductId]);

  if (!product || dismissed || !featuredProductId) return null;

  const thumbnail = product.photos?.[0];

  return (
    <AnimatePresence>
      <motion.div
        key={featuredProductId}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute bottom-4 right-4 z-20 w-64"
      >
        <div
          className="rounded-xl overflow-hidden backdrop-blur-xl border shadow-2xl"
          style={{ backgroundColor: "rgba(13,17,23,0.92)", borderColor: "rgba(0,200,150,0.2)" }}
        >
          {/* Close button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex gap-3 p-3">
            {thumbnail ? (
              <img src={thumbnail} alt={product.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <ShoppingBag className="h-5 w-5 text-white/20" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] text-amber-400 font-medium">Em destaque</span>
              </div>
              <p className="text-white text-sm font-medium truncate">{product.title}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: "#00C896" }}>
                {Number(product.price).toFixed(2)} {product.currency || "EUR"}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="w-full rounded-none rounded-b-xl font-bold h-9 text-xs"
            style={{ backgroundColor: "#00C896", color: "#0D1117" }}
            onClick={() => {
              // Open listing detail in new tab
              window.open(`/marketplace/lives`, "_self");
              toast.info("Funcionalidade de compra em breve!");
            }}
          >
            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
            Comprar agora
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════
   Viewer Chat
   ═══════════════════════════════════════════════ */
function ViewerChat({ livestreamId, isLive, user }: { livestreamId: string; isLive: boolean; user: User | null }) {
  const [msg, setMsg] = useState("");
  const { data: messages = [] } = useLivestreamMessages(livestreamId);
  const sendMessage = useSendLiveMessage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = !!user;

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (near) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = msg.trim();
    if (!trimmed || !isLive || !isAuthenticated) return;
    sendMessage.mutate({ livestream_id: livestreamId, message: trimmed });
    setMsg("");
  };

  // Only show latest 200
  const visibleMessages = useMemo(() => messages.slice(-200), [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-2" ref={scrollRef}>
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {visibleMessages.map((m) => (
              <ChatBubble key={m.id} message={m} isMe={m.user_id === user?.id} />
            ))}
          </AnimatePresence>
          {visibleMessages.length === 0 && (
            <p className="text-center text-white/20 text-xs py-8">
              {isLive ? "Sê o primeiro a comentar! 💬" : "O chat estará disponível quando a live começar."}
            </p>
          )}
        </div>
      </div>

      {isLive && (
        <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {isAuthenticated ? (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
              <Input
                placeholder="Escreve uma mensagem..."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="flex-1 text-sm h-9 bg-white/5 border-white/10 text-white placeholder:text-white/25"
                maxLength={500}
              />
              <Button
                size="sm"
                type="submit"
                disabled={!msg.trim() || sendMessage.isPending}
                className="h-9 w-9 p-0"
                style={{ backgroundColor: "#00C896" }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-xs text-white/40 bg-white/5 rounded-lg px-3 py-2.5">
              <LogIn className="h-4 w-4 flex-shrink-0" />
              <span>Faz login para participar no chat</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ message, isMe }: { message: LivestreamMessage; isMe?: boolean }) {
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: false, locale: pt });

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2"
    >
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarFallback className={cn("text-[10px]", isMe ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50")}>
          {(message.user_name || "U")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <span className={cn("text-xs font-semibold mr-1.5", isMe ? "text-emerald-400" : "text-white/60")}>
          {isMe ? "Tu" : (message.user_name || "Utilizador")}
        </span>
        <span className="text-xs text-white/80 break-words">{message.message}</span>
        <span className="text-[10px] text-white/20 ml-1.5">há {timeAgo}</span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   Product list (below chat)
   ═══════════════════════════════════════════════ */
function ProductList({ productIds, featuredProductId }: { productIds: string[]; featuredProductId: string | null }) {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!productIds.length) return;
    sb.from("c2c_listings")
      .select("id, title, price, currency, photos")
      .in("id", productIds)
      .then(({ data }: any) => {
        if (data) {
          // Put featured product first
          const sorted = [...data].sort((a: any, b: any) => {
            if (a.id === featuredProductId) return -1;
            if (b.id === featuredProductId) return 1;
            return 0;
          });
          setProducts(sorted);
        }
      });
  }, [productIds.join(","), featuredProductId]);

  if (!productIds.length) return null;

  return (
    <div className="border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="px-3 py-2 flex items-center gap-2">
        <ShoppingBag className="h-3.5 w-3.5 text-white/40" />
        <span className="text-xs font-semibold text-white/60">Produtos ({products.length})</span>
      </div>
      <ScrollArea className="max-h-[200px]">
        <div className="px-3 pb-3 space-y-1.5">
          {products.map((p: any) => {
            const isFeatured = p.id === featuredProductId;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-lg transition-all",
                  isFeatured ? "border" : "hover:bg-white/3"
                )}
                style={isFeatured ? { borderColor: "rgba(0,200,150,0.3)", backgroundColor: "rgba(0,200,150,0.06)" } : undefined}
              >
                {p.photos?.[0] ? (
                  <img src={p.photos[0]} alt={p.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center bg-white/5">
                    <ShoppingBag className="h-4 w-4 text-white/15" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isFeatured && (
                      <Badge className="text-[9px] py-0 px-1.5 h-4 border-0 bg-amber-500/15 text-amber-400">
                        Em foco
                      </Badge>
                    )}
                    <p className="text-xs font-medium text-white truncate">{p.title}</p>
                  </div>
                  <p className="text-xs font-bold mt-0.5" style={{ color: "#00C896" }}>
                    {Number(p.price).toFixed(2)} {p.currency || "EUR"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

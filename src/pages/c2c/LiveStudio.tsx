import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Radio,
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Loader2,
  Search,
  ShoppingBag,
  Eye,
  Clock,
  Star,
  Send,
  PhoneOff,
  Image as ImageIcon,
  Crown,
} from "lucide-react";
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMyC2CListings } from "@/hooks/useC2CListings";
import {
  useCreateLivestream,
  useGoLive,
  useEndLive,
  useLivestreamById,
  useLivestreamMessages,
  useSendLiveMessage,
} from "@/hooks/c2c/useLivestreams";
import { useGenerateLiveKitToken } from "@/hooks/c2c/useLiveSessions";
import { LIVEKIT_SERVER_URL } from "@/config/livekit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const sb = supabase as any;

type StudioPhase = "setup" | "broadcasting";

export default function LiveStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [phase, setPhase] = useState<StudioPhase>("setup");
  const [liveId, setLiveId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0D1117" }}>
        <p className="text-white/40">Tens de fazer login para aceder ao estúdio.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0D1117" }}>
      {phase === "setup" ? (
        <SetupPhase
          workspaceId={currentWorkspace?.id}
          user={user}
          onGoLive={(id) => {
            setLiveId(id);
            setPhase("broadcasting");
          }}
          onBack={() => navigate(-1)}
        />
      ) : liveId ? (
        <BroadcastPhase
          liveId={liveId}
          user={user}
          onEnd={() => {
            setPhase("setup");
            setLiveId(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SETUP PHASE — Pre-live form
   ═══════════════════════════════════════════════════════ */
function SetupPhase({
  workspaceId,
  user,
  onGoLive,
  onBack,
}: {
  workspaceId?: string;
  user: any;
  onGoLive: (id: string) => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [liveType, setLiveType] = useState<"open" | "paid">("open");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const { data: listings = [] } = useMyC2CListings(workspaceId);
  const activeListings = listings.filter((l) => l.status === "active");
  const filteredListings = activeListings.filter((l) =>
    l.title.toLowerCase().includes(productSearch.toLowerCase())
  );

  const createLive = useCreateLivestream();
  const goLive = useGoLive();
  const isLoading = createLive.isPending || goLive.isPending;

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleGoLive = async () => {
    if (!title.trim() || !workspaceId) return;
    try {
      const roomName = `live-${crypto.randomUUID()}`;
      const live = await createLive.mutateAsync({
        workspace_id: workspaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        product_ids: selectedIds.length > 0 ? selectedIds : undefined,
      });

      // Set livekit_room_name
      await sb
        .from("c2c_livestreams")
        .update({ livekit_room_name: roomName })
        .eq("id", live.id);

      await goLive.mutateAsync(live.id);
      toast.success("Estás ao vivo! 🔴");
      onGoLive(live.id);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao iniciar a live");
    }
  };

  return (
    <>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-30 backdrop-blur-xl px-6 py-4 flex items-center justify-between"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          backgroundColor: "rgba(13,17,23,0.9)",
        }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            <h1 className="text-lg font-bold text-white">Estúdio Live</h1>
          </div>
        </div>
        <Button
          onClick={handleGoLive}
          disabled={!title.trim() || isLoading}
          className="gap-2 font-bold px-6"
          style={{ backgroundColor: "#ef4444" }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          )}
          Ir a Ar
        </Button>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <Label className="text-white/70 text-sm">Título do Live *</Label>
          <Input
            placeholder="Ex: Novidades de Primavera 🌸"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-emerald-500/50"
          />
          <p className="text-[10px] text-white/20 mt-1 text-right">{title.length}/100</p>
        </div>

        {/* Description */}
        <div>
          <Label className="text-white/70 text-sm">Descrição curta</Label>
          <Textarea
            placeholder="Descreve o que vais mostrar..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none focus-visible:ring-emerald-500/50"
          />
        </div>

        {/* Type selector */}
        <div>
          <Label className="text-white/70 text-sm">Tipo</Label>
          <div className="flex gap-3 mt-1.5">
            {[
              { key: "open" as const, label: "Aberto", desc: "Todos podem assistir" },
              { key: "paid" as const, label: "Premium", desc: "Acesso pago", icon: Crown },
            ].map(({ key, label, desc, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setLiveType(key)}
                className={cn(
                  "flex-1 p-4 rounded-lg border text-left transition-all",
                  liveType === key
                    ? "border-emerald-500/40 bg-emerald-500/8"
                    : "border-white/8 bg-white/3 hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4 text-amber-400" />}
                  <span className="text-sm font-medium text-white">{label}</span>
                </div>
                <p className="text-[11px] text-white/40 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Product selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-white/70 text-sm flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Produtos a incluir
            </Label>
            {selectedIds.length > 0 && (
              <Badge className="border-0 text-[10px]" style={{ backgroundColor: "rgba(0,200,150,0.15)", color: "#00C896" }}>
                {selectedIds.length} selecionado{selectedIds.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <Input
              placeholder="Pesquisar produtos..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/25"
            />
          </div>

          <ScrollArea className="h-[220px] rounded-lg border border-white/6 bg-white/2 p-1">
            {filteredListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-white/20">
                <ShoppingBag className="h-8 w-8 mb-2" />
                <p className="text-xs">Sem produtos ativos</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredListings.map((listing) => {
                  const selected = selectedIds.includes(listing.id);
                  return (
                    <div
                      key={listing.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                        selected
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : "hover:bg-white/5 border border-transparent"
                      )}
                      onClick={() => toggleProduct(listing.id)}
                    >
                      <Checkbox checked={selected} className="pointer-events-none border-white/20" />
                      {listing.photos?.[0] ? (
                        <img src={listing.photos[0]} alt={listing.title} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-white/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{listing.title}</p>
                        <p className="text-xs text-white/40">{listing.price.toFixed(2)} {listing.currency}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   BROADCAST PHASE — Live transmission
   ═══════════════════════════════════════════════════════ */
function BroadcastPhase({
  liveId,
  user,
  onEnd,
}: {
  liveId: string;
  user: any;
  onEnd: () => void;
}) {
  const { data: live, refetch: refetchLive } = useLivestreamById(liveId);
  const endLive = useEndLive();
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const generateToken = useGenerateLiveKitToken();
  const [startedAt] = useState(Date.now());

  // Fetch LiveKit token
  useEffect(() => {
    if (!live?.livekit_room_name || livekitToken) return;

    generateToken.mutate(
      {
        room_name: live.livekit_room_name,
        participant_identity: user.id,
        participant_name: user.user_metadata?.full_name || user.email || "Vendedor",
        is_publisher: true,
      },
      {
        onSuccess: (data) => setLivekitToken(data.token),
        onError: () => toast.error("Erro ao conectar ao serviço de vídeo"),
      }
    );
  }, [live?.livekit_room_name]);

  // Realtime viewer count
  useEffect(() => {
    const channel = supabase
      .channel(`studio-live-${liveId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "c2c_livestreams",
        filter: `id=eq.${liveId}`,
      }, () => {
        refetchLive();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [liveId]);

  const handleEndLive = async () => {
    try {
      await endLive.mutateAsync(liveId);
      toast.success("Live terminada");
      onEnd();
    } catch {
      toast.error("Erro ao terminar a live");
    }
  };

  const handleSetFeatured = async (productId: string) => {
    await sb
      .from("c2c_livestreams")
      .update({ featured_product_id: productId })
      .eq("id", liveId);
    refetchLive();
    toast.success("Produto destacado!");
  };

  if (!live) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0D1117" }}>
        <Loader2 className="h-8 w-8 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: "#0D1117" }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(13,17,23,0.95)" }}
      >
        <div className="flex items-center gap-3">
          <Badge className="border-0 gap-1.5 font-bold text-white" style={{ backgroundColor: "#ef4444" }}>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            AO VIVO
          </Badge>
          <ElapsedTimer startedAt={startedAt} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-white/50">
            <Eye className="h-4 w-4" />
            <span>{live.viewer_count ?? 0} a ver</span>
          </div>
          <Button
            onClick={handleEndLive}
            disabled={endLive.isPending}
            size="sm"
            className="gap-2 font-bold text-white"
            style={{ backgroundColor: "#ef4444" }}
          >
            <PhoneOff className="h-4 w-4" />
            Terminar Live
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Video (70%) */}
        <div className="flex-[7] relative bg-black">
          {livekitToken ? (
            <LiveKitRoom
              token={livekitToken}
              serverUrl={LIVEKIT_SERVER_URL}
              connect={true}
              video={true}
              audio={true}
              className="w-full h-full"
            >
              <PublisherVideo />
            </LiveKitRoom>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-10 w-10 text-white/20 animate-spin mx-auto mb-3" />
                <p className="text-white/40 text-sm">A conectar ao vídeo...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right — Panel (30%) */}
        <div
          className="flex-[3] flex flex-col border-l overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          {/* Products panel */}
          <ProductPanel
            productIds={live.product_ids || []}
            featuredId={(live as any).featured_product_id}
            onSetFeatured={handleSetFeatured}
          />

          <Separator className="bg-white/6" />

          {/* Chat panel */}
          <StudioChat livestreamId={liveId} userId={user.id} />
        </div>
      </div>
    </div>
  );
}

/* ─── Publisher video using LiveKit ─── */
function PublisherVideo() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const localTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera && t.publication?.track
  );

  if (!localTrack?.publication?.track) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Camera className="h-12 w-12 text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">A aguardar câmara...</p>
        </div>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={localTrack as any}
      className="w-full h-full object-cover"
      style={{ transform: "scaleX(-1)" }}
    />
  );
}

/* ─── Elapsed Timer ─── */
function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-sm text-white/50 font-mono">
      <Clock className="h-3.5 w-3.5" />
      {hours > 0 ? `${pad(hours)}:` : ""}
      {pad(minutes)}:{pad(seconds)}
    </div>
  );
}

/* ─── Product Panel ─── */
function ProductPanel({
  productIds,
  featuredId,
  onSetFeatured,
}: {
  productIds: string[];
  featuredId?: string | null;
  onSetFeatured: (id: string) => void;
}) {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!productIds.length) return;

    // Fetch C2C listings by ID
    const fetchProducts = async () => {
      const { data } = await sb
        .from("c2c_listings")
        .select("id, title, price, currency, photos")
        .in("id", productIds);
      setProducts(data || []);
    };
    fetchProducts();
  }, [productIds]);

  return (
    <div className="flex-shrink-0 p-3 max-h-[45%] overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="h-4 w-4" style={{ color: "#00C896" }} />
        <h3 className="text-sm font-semibold text-white">Produtos</h3>
        <Badge className="border-0 text-[10px] px-1.5" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
          {products.length}
        </Badge>
      </div>

      {products.length === 0 ? (
        <p className="text-xs text-white/20 py-4 text-center">Nenhum produto selecionado</p>
      ) : (
        <div className="space-y-1.5">
          {products.map((p) => {
            const isFeatured = p.id === featuredId;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-lg transition-all",
                  isFeatured
                    ? "border-2"
                    : "border border-transparent hover:bg-white/3"
                )}
                style={isFeatured ? { borderColor: "#00C896", backgroundColor: "rgba(0,200,150,0.06)" } : {}}
              >
                {p.photos?.[0] ? (
                  <img src={p.photos[0]} alt={p.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-4 w-4 text-white/15" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{p.title}</p>
                  <p className="text-[10px] text-white/40">{p.price?.toFixed(2)} {p.currency}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSetFeatured(p.id)}
                  disabled={isFeatured}
                  className={cn(
                    "h-7 px-2 text-[10px] gap-1",
                    isFeatured ? "text-emerald-400" : "text-white/40 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Star className={cn("h-3 w-3", isFeatured && "fill-emerald-400")} />
                  {isFeatured ? "Destaque" : "Destacar"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Studio Chat ─── */
function StudioChat({
  livestreamId,
  userId,
}: {
  livestreamId: string;
  userId: string;
}) {
  const { data: messages = [] } = useLivestreamMessages(livestreamId);
  const sendMsg = useSendLiveMessage();
  const [msg, setMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());

  // Fetch profiles for message senders
  useEffect(() => {
    if (!messages.length) return;
    const ids = [...new Set(messages.map((m) => m.user_id).filter((id) => !profiles.has(id)))];
    if (!ids.length) return;

    sb.from("profiles")
      .select("id, full_name")
      .in("id", ids)
      .then(({ data }: any) => {
        if (data) {
          setProfiles((prev) => {
            const next = new Map(prev);
            data.forEach((p: any) => next.set(p.id, p.full_name || "Utilizador"));
            return next;
          });
        }
      });
  }, [messages.length]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    sendMsg.mutate({ livestream_id: livestreamId, message: trimmed });
    setMsg("");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-white">Chat ao vivo</h3>
        <Badge className="border-0 text-[10px] px-1.5" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
          {messages.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2" ref={scrollRef}>
        <AnimatePresence mode="popLayout">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 py-1"
            >
              <Avatar className="h-5 w-5 flex-shrink-0 mt-0.5">
                <AvatarFallback
                  className="text-[8px] font-bold"
                  style={{
                    backgroundColor: m.user_id === userId ? "rgba(0,200,150,0.15)" : "rgba(255,255,255,0.06)",
                    color: m.user_id === userId ? "#00C896" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {(profiles.get(m.user_id) || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <span
                  className="text-[11px] font-semibold mr-1.5"
                  style={{ color: m.user_id === userId ? "#00C896" : "rgba(255,255,255,0.5)" }}
                >
                  {m.user_id === userId ? "Tu" : (profiles.get(m.user_id) || "Utilizador")}
                </span>
                <span className="text-[11px] text-white/60 break-words">{m.message}</span>
                <span className="text-[9px] text-white/15 ml-1.5">
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: false, locale: pt })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <p className="text-center text-white/15 text-xs py-8">À espera de mensagens... 💬</p>
        )}
      </div>

      {/* Input */}
      <form
        className="flex gap-2 p-2 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <Input
          placeholder="Escreve uma mensagem..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          maxLength={500}
          className="flex-1 text-xs h-8 bg-white/5 border-white/10 text-white placeholder:text-white/20"
        />
        <Button
          size="sm"
          type="submit"
          disabled={!msg.trim() || sendMsg.isPending}
          className="h-8 w-8 p-0"
          style={{ backgroundColor: "#00C896" }}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}

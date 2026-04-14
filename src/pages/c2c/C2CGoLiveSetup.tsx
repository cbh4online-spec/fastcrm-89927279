import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Radio,
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Monitor,
  ShoppingBag,
  Loader2,
  Search,
  X,
  Image as ImageIcon,
  Settings2,
  Eye,
} from "lucide-react";
import { useCreateLivestream, useGoLive } from "@/hooks/c2c/useLivestreams";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMyC2CListings } from "@/hooks/useC2CListings";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Moda", "Tecnologia", "Casa & Jardim", "Desporto", "Beleza",
  "Brinquedos", "Veículos", "Livros", "Música", "Arte", "Outro",
];

export default function C2CGoLiveSetup() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const createLive = useCreateLivestream();
  const goLive = useGoLive();
  const { data: myListings = [] } = useMyC2CListings(currentWorkspace?.id);
  const activeListings = myListings.filter((l) => l.status === "active");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [replayEnabled, setReplayEnabled] = useState(true);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const isLoading = createLive.isPending || goLive.isPending;

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      if (isInIframe) {
        setCameraError("O preview do Lovable bloqueia a câmara por segurança. Publica a app para testar com câmara real.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("O teu browser não suporta acesso à câmara.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: micOn,
      });
      setStream(mediaStream);
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setCameraError("Permissão da câmara negada. Verifica as definições do browser e tenta novamente.");
      } else if (name === "NotFoundError") {
        setCameraError("Nenhuma câmara encontrada no dispositivo.");
      } else if (name === "NotReadableError") {
        setCameraError("Câmara em uso por outra aplicação. Fecha-a e tenta novamente.");
      } else {
        setCameraError("Não foi possível aceder à câmara. Verifica as permissões.");
      }
      setCameraOn(false);
    }
  }, [micOn, isInIframe]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraOn(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stream]);

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setMicOn(!micOn);
    }
  };

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const filteredListings = activeListings.filter((l) =>
    l.title.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleGoLive = async () => {
    if (!title.trim() || !currentWorkspace?.id) return;
    try {
      const live = await createLive.mutateAsync({
        workspace_id: currentWorkspace.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
      });
      await goLive.mutateAsync(live.id);
      stopCamera();
      toast.success("Estás ao vivo! 🔴");
      navigate(`/dashboard/marketplace/lives/${live.id}`);
    } catch {
      toast.error("Erro ao iniciar a live");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            <h1 className="text-lg font-bold">Configurar Live</h1>
          </div>
        </div>
        <Button
          onClick={handleGoLive}
          disabled={!title.trim() || isLoading}
          className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold px-6"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          )}
          Ir ao Vivo
        </Button>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Camera preview (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Camera feed */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-black relative rounded-t-lg">
                {cameraOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover mirror"
                    style={{ transform: "scaleX(-1)" }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    {cameraError ? (
                      <>
                        <CameraOff className="h-16 w-16 text-white/20" />
                        <p className="text-white/50 text-sm text-center max-w-xs">{cameraError}</p>
                        <Button variant="outline" size="sm" onClick={startCamera}>
                          Tentar novamente
                        </Button>
                      </>
                    ) : (
                      <>
                        <Camera className="h-16 w-16 text-white/20" />
                        <p className="text-white/50 text-sm">Pré-visualização da câmara</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startCamera}
                          className="gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Ativar câmara
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Live preview badge */}
                {cameraOn && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-red-600/80 text-white border-0 gap-1.5 backdrop-blur-sm">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      PRÉ-VISUALIZAÇÃO
                    </Badge>
                  </div>
                )}

                {/* Title overlay preview */}
                {cameraOn && title && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
                      <p className="text-white font-semibold text-sm truncate">{title}</p>
                      {category && (
                        <p className="text-white/60 text-xs">{category}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div className="p-3 bg-card flex items-center justify-center gap-2 border-t">
                <Button
                  variant={cameraOn ? "default" : "outline"}
                  size="sm"
                  onClick={cameraOn ? stopCamera : startCamera}
                  className={cn("gap-2", cameraOn && "bg-primary")}
                >
                  {cameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  {cameraOn ? "Câmara ligada" : "Câmara desligada"}
                </Button>
                <Button
                  variant={micOn ? "default" : "outline"}
                  size="sm"
                  onClick={toggleMic}
                  disabled={!cameraOn}
                  className={cn("gap-2", micOn && cameraOn && "bg-primary")}
                >
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {micOn ? "Microfone" : "Sem som"}
                </Button>
              </div>
            </Card>

            {/* Product selection */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Produtos a destacar</h3>
                </div>
                {selectedProductIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedProductIds.length} selecionado{selectedProductIds.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar produtos..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <ScrollArea className="h-[200px]">
                {filteredListings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ShoppingBag className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">Sem produtos ativos</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredListings.map((listing) => {
                      const selected = selectedProductIds.includes(listing.id);
                      return (
                        <motion.div
                          key={listing.id}
                          layout
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            selected
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted/50 border border-transparent"
                          )}
                          onClick={() => toggleProduct(listing.id)}
                        >
                          <Checkbox checked={selected} className="pointer-events-none" />
                          {listing.photos?.[0] ? (
                            <img
                              src={listing.photos[0]}
                              alt={listing.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{listing.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {listing.price.toFixed(2)} {listing.currency}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          {/* Right: Settings (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic info */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Detalhes da Live</h3>
              </div>

              <div>
                <Label htmlFor="setup-title">Título *</Label>
                <Input
                  id="setup-title"
                  placeholder="Ex: Novidades de Primavera 🌸"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {title.length}/100
                </p>
              </div>

              <div>
                <Label htmlFor="setup-desc">Descrição</Label>
                <Textarea
                  id="setup-desc"
                  placeholder="Descreve o que vais mostrar aos teus espectadores..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {description.length}/500
                </p>
              </div>

              <div>
                <Label>Categoria</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {CATEGORIES.map((cat) => (
                    <Badge
                      key={cat}
                      variant={category === cat ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors text-xs",
                        category === cat && "bg-primary"
                      )}
                      onClick={() => setCategory(category === cat ? "" : cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>

            {/* Options */}
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                Opções
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Chat ao vivo</p>
                  <p className="text-xs text-muted-foreground">Permitir mensagens dos espectadores</p>
                </div>
                <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Gravação / Replay</p>
                  <p className="text-xs text-muted-foreground">Disponibilizar replay após a live</p>
                </div>
                <Switch checked={replayEnabled} onCheckedChange={setReplayEnabled} />
              </div>
            </Card>

            {/* Summary card */}
            <Card className="p-4 bg-muted/30 border-dashed">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4" />
                Resumo
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Título</span>
                  <span className="font-medium truncate ml-4 max-w-[180px]">
                    {title || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoria</span>
                  <span className="font-medium">{category || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produtos</span>
                  <span className="font-medium">{selectedProductIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Câmara</span>
                  <Badge variant={cameraOn ? "default" : "secondary"} className="text-[10px]">
                    {cameraOn ? "Pronta" : "Desligada"}
                  </Badge>
                </div>
              </div>

              <Button
                onClick={handleGoLive}
                disabled={!title.trim() || isLoading}
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white gap-2 font-bold"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                )}
                Ir ao Vivo Agora
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

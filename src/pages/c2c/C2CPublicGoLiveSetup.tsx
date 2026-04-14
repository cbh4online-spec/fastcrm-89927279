import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Radio,
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react";
import { useCreateLivestream, useGoLive } from "@/hooks/c2c/useLivestreams";
import { useCreateMuxStream } from "@/hooks/c2c/useMuxLivestream";
import { useWhipPublisher } from "@/hooks/c2c/useWhipPublisher";
import { usePublicMarketplaceWorkspace } from "@/hooks/c2c/usePublicMarketplaceWorkspace";
import { useIsApprovedSeller } from "@/hooks/c2c/useIsApprovedSeller";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Moda", "Tecnologia", "Casa & Jardim", "Desporto", "Beleza",
  "Brinquedos", "Veículos", "Livros", "Música", "Arte", "Outro",
];

export default function C2CPublicGoLiveSetup() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: workspace, isLoading: wsLoading } = usePublicMarketplaceWorkspace(workspaceSlug);
  const { isSeller, isLoading: sellerLoading } = useIsApprovedSeller(workspace?.id);
  const createLive = useCreateLivestream();
  const goLive = useGoLive();
  const createMuxStream = useCreateMuxStream();
  const whip = useWhipPublisher();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  // Camera state
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const isLoading = createLive.isPending || goLive.isPending || createMuxStream.isPending;

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (isInIframe) {
        setCameraError("O preview do Lovable bloqueia a câmara. Publica a app para testar.");
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
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setCameraError("Permissão da câmara negada.");
      } else if (name === "NotFoundError") {
        setCameraError("Nenhuma câmara encontrada.");
      } else {
        setCameraError("Não foi possível aceder à câmara.");
      }
      setCameraOn(false);
    }
  }, [micOn, isInIframe]);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraOn(false);
  }, [stream]);

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setMicOn(!micOn);
    }
  };

  useEffect(() => {
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [stream]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=/marketplace/${workspaceSlug}/go-live`, { replace: true });
    }
  }, [authLoading, user, navigate, workspaceSlug]);

  // Single-step: Create livestream + Mux stream + WHIP publish + go live
  const handleGoLive = async () => {
    if (!title.trim() || !workspace?.id || !workspaceSlug) return;
    if (!stream) {
      toast.error("Liga a câmara primeiro para iniciar a live.");
      return;
    }
    try {
      const live = await createLive.mutateAsync({
        workspace_id: workspace.id,
        workspace_slug: workspaceSlug,
        title: title.trim(),
        category: category || undefined,
      });

      const mux = await createMuxStream.mutateAsync(live.id);
      await whip.publish(stream, mux.stream_key);
      await goLive.mutateAsync(live.id);

      toast.success("Estás ao vivo! 🔴");
      navigate(`/marketplace/${workspaceSlug}/live/${live.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao iniciar a live");
    }
  };

  if (wsLoading || authLoading || sellerLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Radio className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Apenas vendedores aprovados podem iniciar lives.</p>
        <Button variant="outline" onClick={() => navigate(`/marketplace/${workspaceSlug}/lives`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/marketplace/${workspaceSlug}/lives`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            <h1 className="text-lg font-bold">Ir ao Vivo</h1>
          </div>
        </div>
        <Button
          onClick={handleGoLive}
          disabled={!title.trim() || !cameraOn || isLoading || whip.status === "connecting"}
          className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold px-6"
        >
          {(isLoading || whip.status === "connecting") ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          )}
          Ir ao Vivo
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera preview */}
          <Card className="overflow-hidden">
            <div className="aspect-video bg-black relative rounded-t-lg">
              {cameraOn && stream ? (
                <video
                  ref={(el) => {
                    if (el && el.srcObject !== stream) {
                      el.srcObject = stream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  {cameraError ? (
                    <>
                      <CameraOff className="h-16 w-16 text-white/20" />
                      <p className="text-white/50 text-sm text-center max-w-xs">{cameraError}</p>
                      <Button variant="outline" size="sm" onClick={startCamera}>Tentar novamente</Button>
                    </>
                  ) : (
                    <>
                      <Camera className="h-16 w-16 text-white/20" />
                      <p className="text-white/50 text-sm">Pré-visualização da câmara</p>
                      <Button variant="outline" size="sm" onClick={startCamera} className="gap-2">
                        <Camera className="h-4 w-4" /> Ativar câmara
                      </Button>
                    </>
                  )}
                </div>
              )}

              {cameraOn && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-red-600/80 text-white border-0 gap-1.5 backdrop-blur-sm">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    PRÉ-VISUALIZAÇÃO
                  </Badge>
                </div>
              )}

              {cameraOn && title && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
                    <p className="text-white font-semibold text-sm truncate">{title}</p>
                  </div>
                </div>
              )}
            </div>

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

          {/* Form */}
          <Card className="p-5 space-y-5">
            <div>
              <Label htmlFor="go-live-title" className="text-sm font-semibold">Título da Live *</Label>
              <Input
                id="go-live-title"
                placeholder="Ex: Novidades de Primavera 🌸"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="mt-1.5"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{title.length}/100</p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Categoria</Label>
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

            <div className="pt-4 border-t space-y-3">
              <p className="text-xs text-muted-foreground">
                Liga a câmara, dá um título e clica "Ir ao Vivo" — a transmissão começa diretamente do teu browser!
              </p>

              {whip.status === "connecting" && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A conectar ao servidor de streaming...
                </div>
              )}

              {whip.error && (
                <p className="text-xs text-destructive">{whip.error}</p>
              )}

              <Button
                onClick={handleGoLive}
                disabled={!title.trim() || !cameraOn || isLoading || whip.status === "connecting"}
                className="w-full bg-red-600 hover:bg-red-700 text-white gap-2 font-bold"
                size="lg"
              >
                {(isLoading || whip.status === "connecting") ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                )}
                Ir ao Vivo Agora
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

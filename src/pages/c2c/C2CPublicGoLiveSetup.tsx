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
  Copy,
  Check,
} from "lucide-react";
import { useCreateLivestream, useGoLive } from "@/hooks/c2c/useLivestreams";
import { useCreateMuxStream } from "@/hooks/c2c/useMuxLivestream";
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

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  // Mux stream info after creation
  const [muxInfo, setMuxInfo] = useState<{
    stream_key: string;
    rtmp_url: string;
    srt_url: string;
    playback_id: string;
  } | null>(null);
  const [livestreamId, setLivestreamId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Step 1: Create livestream + Mux stream
  const handleCreateStream = async () => {
    if (!title.trim() || !workspace?.id || !workspaceSlug) return;
    try {
      const live = await createLive.mutateAsync({
        workspace_id: workspace.id,
        workspace_slug: workspaceSlug,
        title: title.trim(),
        category: category || undefined,
      });
      setLivestreamId(live.id);

      const mux = await createMuxStream.mutateAsync(live.id);
      setMuxInfo(mux);
      toast.success("Stream criado! Configura o OBS e clica 'Ir ao Vivo'.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar o stream");
    }
  };

  // Step 2: Go live (after OBS is connected)
  const handleGoLive = async () => {
    if (!livestreamId) return;
    try {
      await goLive.mutateAsync(livestreamId);
      toast.success("Estás ao vivo! 🔴");
      navigate(`/marketplace/${workspaceSlug}/live/${livestreamId}`);
    } catch {
      toast.error("Erro ao iniciar a live");
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
        {muxInfo ? (
          <Button
            onClick={handleGoLive}
            disabled={goLive.isPending}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold px-6"
          >
            {goLive.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            )}
            Ir ao Vivo
          </Button>
        ) : (
          <Button
            onClick={handleCreateStream}
            disabled={!title.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold px-6"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radio className="h-4 w-4" />
            )}
            Preparar Stream
          </Button>
        )}
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

          {/* Form + Mux stream info */}
          <Card className="p-5 space-y-5">
            {!muxInfo ? (
              <>
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

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Ao clicar "Preparar Stream", será criado um canal de transmissão via Mux.
                    Depois, configura o OBS com as credenciais fornecidas.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Stream criado com sucesso!
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Configura o OBS (ou outro software) com os dados abaixo e depois clica "Ir ao Vivo".
                  </p>
                </div>

                {/* RTMP URL */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Servidor RTMP</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={muxInfo.rtmp_url}
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleCopy(muxInfo.rtmp_url, "rtmp")}
                    >
                      {copiedField === "rtmp" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Stream Key */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Chave de Stream</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={muxInfo.stream_key}
                      type="password"
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleCopy(muxInfo.stream_key, "key")}
                    >
                      {copiedField === "key" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* SRT URL */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">URL SRT (alternativo)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={muxInfo.srt_url}
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleCopy(muxInfo.srt_url, "srt")}
                    >
                      {copiedField === "srt" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>No OBS:</strong> Vai a Definições → Transmissão → Serviço: Personalizado → Cola o servidor e a chave acima.
                    Quando estiveres a transmitir no OBS, clica "Ir ao Vivo" para publicar.
                  </p>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
